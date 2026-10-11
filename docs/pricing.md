# Pricing & monetization

Status: approved for Phase 1 (active execution) · Owner: Mwandishi team · Updated: 11 October 2026

Side-income model. Core stays free forever (Graduate template, basic PDF,
a few AI drafts a day); power features are one-time M-Pesa unlocks.
No subscriptions (job-seeking is episodic), no tracking ads, no data sale —
the privacy story is the moat.

## Live prices (TZS, one-time, this device)

| Item | Price | Type |
|---|---|---|
| Professional Two-Column template (clinical) | **1,500** | one-time unlock |
| Exact ATS Replica template (exact) | **2,000** | one-time unlock |

Constants: `PRICE_CLINICAL` (1,500 TZS) / `PRICE_EXACT` (2,000 TZS) in `frontend/src/lib/store.js`.
Backend validation in `backend/payments.py` enforces `VALID_ITEMS = {"clinical": 1500, "exact": 2000}`.
Exact ATS Replica carries a premium 2,000 TZS price point due to its executive photo rail and two-tone layout,
while Clinical Two-Column remains accessible at 1,500 TZS for healthcare and consulting job seekers.
Change the numbers and the paywall UI plus backend validation follow.
**These constants govern amount handling across the application**: FAQ, Terms, paywall
and inbox copy describe the pricing structure while client store constants and backend validation enforce exact figures.
Free quota that stays free: 3 AI actions/day, 3 exports per CV, all other
templates, cover-letter writing.

## How a purchase works (no logins)

Identity is the device: random `mrcv.device` UUID in `localStorage`,
entitlements in `mrcv.entitlements`. No accounts, no passwords.

1. Tap "Use" on a Pro template → paywall modal (item, price, phone field).
2. Enter M-Pesa number → `POST /api/pay/checkout {ref: deviceUUID, item,
   phone, amount}` → provider sends a **USSD push** to that phone.
3. User approves with their **M-Pesa PIN** inside the USSD session
   (PIN never touches our app or backend).
4. Provider calls `POST /api/pay/callback`; backend verifies the signature
   and appends `deviceUUID → item` (+ payer-phone **hash**, + transaction id)
   to the paid ledger (JSONL, same pattern as the feedback inbox).
5. Modal polls `GET /api/pay/status?ref=` → on `paid`, writes the
   entitlement locally, closes with "Unlocked ✓", opens the Builder.
6. Every later visit: local `hasTemplate()` check, instant, offline-capable.

Failure handling: abandoned/timeout PIN → "not completed, try again",
nothing charged; app closed mid-poll → silent re-check on next template
open re-unlocks from the ledger; double-pay is idempotent (owned items
can't be re-bought from the UI).

## Provider: Snippe Pay (all channels)

One swappable adapter, `payments.py`: `create_checkout()` /
`verify_callback()`. Everything else (entitlements, polling, UI, ledger)
is provider-independent. Until Snippe sandbox credentials + callback docs
arrive, the adapter is a clearly-marked stub and the whole flow is testable
with a mocked callback.

## Restore (deferred, designed)

Clearing browser data orphans unlocks (new device UUID). On first real
complaint, build phone-number restore: re-enter payer number → ownership
check (SMS code, or Snippe validation push if supported) → ledger lookup
by phone hash → copy entitlements to the new device ID. The hash is stored
from day one so this needs no rework. SIM changes / shared phones are the
known edge cases (manual receipt-SMS support as fallback).

## Honest limits

- Local entitlement flags are clearable; at TZS 1,500 – 2,000 this is accepted
  friction, not a vulnerability to chase. Payment verification itself is
  server-side, so nobody can steal anyone else's purchase.
- Payer-phone hashes are the project's first PII: privacy policy carries
  a payments paragraph (what's kept, why, deletion on request).

## Legal prerequisites (with the build)

- Terms `tm.s2` ("free of charge") gains a paid-tier clause (generic
  wording, no amounts); `tm.intro` softens "the free AI writing tool".
- Homepage stays free-focused: no Pro teaser strip (decision 9 Oct).
  Pro is disclosed on `/templates` cards, the paywall modal, and a
  rewritten `lp.q1/lp.a1` FAQ answer ("one-time fee, price shown in the
  app", no subscriptions, no watermark ever); `tpl.sub` becomes
  "Four free designs, two Pro designs." Meta descriptions qualify to
  "Free core: …".
- Privacy gains the payments paragraph above, plus a `pv.s7l3` reword
  (provider-handled checkout).
- Both locales (EN + SW), date bump, `npm test` key-parity stays green.
- Mobile-money income needs a registered business + TRA compliance once
  real money flows — confirm with a local accountant before launch.

## Later phases (not started)

- Phase 2: AI quota packs (3 free/day → paid packs).
- Phase 3: export quota packs (3 free/CV → paid packs).
- Phase 4: paid Upload + restructure CV (biggest build: extraction +
  AI structuring into the Builder).
- B2B pilot: colleges/NGOs bulk licensing (separate track, highest
  revenue per deal).
