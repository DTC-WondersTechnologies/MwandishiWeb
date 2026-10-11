"""Mwandishi AI payments engine & Snippe Pay gateway adapter.

Supports one-time microtransactions (1,500 TZS) via M-Pesa, Airtel Money, Tigo/Mixx, Halopesa
using direct USSD Push (STK Push). Entitlements are device-anchored and persisted to a
thread-safe JSONL ledger (backend/data/entitlements.jsonl).

If SNIPPE_API_KEY is not configured in environment, operates in sandbox/simulation mode
so end-to-end checkout, polling, and unlocks can be tested seamlessly in development.
"""
from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import logging
import os
import re
import threading
import urllib.request
import uuid
from pathlib import Path

log = logging.getLogger("mwandishi.payments")

SNIPPE_API_KEY = os.environ.get("SNIPPE_API_KEY", "")
SNIPPE_WEBHOOK_SECRET = os.environ.get("SNIPPE_WEBHOOK_SECRET", "")
SNIPPE_BASE_URL = os.environ.get("SNIPPE_BASE_URL", "https://api.snippe.sh/v1")

DATA_DIR = Path(__file__).resolve().parent / "data"
ENTITLEMENTS_FILE = DATA_DIR / "entitlements.jsonl"
_ledger_lock = threading.Lock()

# Approved item prices in TZS
VALID_ITEMS = {
    "clinical": 1500,
    "exact": 2000,
}


def normalize_tz_phone(raw: str) -> str:
    """Normalize phone to 255XXXXXXXXX format for mobile money gateways."""
    d = re.sub(r"[^\d]", "", str(raw or ""))
    if d.startswith("2550") and len(d) == 13:
        return f"255{d[4:]}"
    if d.startswith("0") and len(d) == 10:
        return f"255{d[1:]}"
    if d.startswith("255") and len(d) == 12:
        return d
    if len(d) == 9 and not d.startswith("0"):
        return f"255{d}"
    return d


def hash_phone(phone: str) -> str:
    """SHA-256 hash of normalized phone for privacy-preserving receipt lookups."""
    p = normalize_tz_phone(phone)
    return hashlib.sha256(p.encode("utf-8")).hexdigest()[:32]


def create_checkout(device_id: str, item: str, phone: str, amount: int = 1500) -> dict:
    """Initiates a USSD push payment via Snippe Pay or sandbox simulator."""
    if not device_id or not device_id.strip():
        raise ValueError("device_id required")
    if item not in VALID_ITEMS:
        raise ValueError(f"invalid item '{item}', must be one of {list(VALID_ITEMS.keys())}")

    norm_phone = normalize_tz_phone(phone)
    if not re.match(r"^255\d{9}$", norm_phone):
        raise ValueError("invalid Tanzanian phone number (+255 or 0XXXXXXXXX)")

    expected_amount = VALID_ITEMS[item]
    if amount != expected_amount:
        amount = expected_amount

    reference = f"mrcv-{uuid.uuid4().hex[:12]}"

    if not SNIPPE_API_KEY:
        log.info("Snippe API key unset: running sandbox USSD simulation for ref=%s", reference)
        # In sandbox/dev simulation mode, auto-record entitlement so local testing works immediately
        record_entitlement(
            device_id=device_id.strip(),
            item=item,
            phone_hash=hash_phone(norm_phone),
            tx_id=f"sim_{reference}",
            mode="sandbox",
        )
        return {
            "ok": True,
            "mode": "sandbox",
            "reference": reference,
            "item": item,
            "amount": amount,
            "message": "Sandbox USSD push simulated. Item unlocked.",
            "unlocked": True,
        }

    # Live Snippe Pay API call
    payload = json.dumps({
        "reference": reference,
        "amount": amount,
        "currency": "TZS",
        "phone_number": norm_phone,
        "channel": "mobile_money",
        "metadata": {
            "device_id": device_id.strip(),
            "item": item,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{SNIPPE_BASE_URL}/payments",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SNIPPE_API_KEY}",
            "User-Agent": "MwandishiAI/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {
            "ok": True,
            "mode": "live",
            "reference": reference,
            "item": item,
            "amount": amount,
            "message": "USSD push sent to phone. Enter M-Pesa PIN on handset.",
            "gateway_data": data,
            "unlocked": False,
        }
    except Exception as e:
        log.error("Snippe API checkout failed: %s", str(e))
        raise RuntimeError(f"payment provider error: {str(e)[:200]}")


def verify_webhook_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """Verifies HMAC SHA-256 signature from Snippe Pay."""
    if not SNIPPE_WEBHOOK_SECRET:
        # In dev without secret configured, accept
        return True
    if not signature_header:
        return False
    expected = hmac.new(
        SNIPPE_WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip())


def record_entitlement(device_id: str, item: str, phone_hash: str, tx_id: str, mode: str = "live") -> dict:
    """Thread-safe append of purchase to the JSONL ledger."""
    entry = {
        "device_id": device_id.strip(),
        "item": item.strip(),
        "phone_hash": phone_hash,
        "tx_id": tx_id,
        "mode": mode,
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _ledger_lock:
        with open(ENTITLEMENTS_FILE, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    log.info("Entitlement recorded: device=%s item=%s tx=%s", device_id, item, tx_id)
    return entry


def has_entitlement(device_id: str, item: str) -> bool:
    """Checks if a device has unlocked an item."""
    if not device_id:
        return False
    if not ENTITLEMENTS_FILE.exists():
        return False
    with _ledger_lock:
        try:
            with open(ENTITLEMENTS_FILE, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        if record.get("device_id") == device_id and record.get("item") == item:
                            return True
                    except json.JSONDecodeError:
                        continue
        except OSError:
            return False
    return False


def get_device_entitlements(device_id: str) -> list[str]:
    """Returns a deduplicated list of all unlocked items for a device."""
    if not device_id or not ENTITLEMENTS_FILE.exists():
        return []
    items = set()
    with _ledger_lock:
        try:
            with open(ENTITLEMENTS_FILE, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        if record.get("device_id") == device_id:
                            items.add(record.get("item"))
                    except json.JSONDecodeError:
                        continue
        except OSError:
            return []
    return sorted(list(items))
