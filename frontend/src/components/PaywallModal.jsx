import React from 'react';
import { useLang } from '../context.jsx';
import Modal from './Modal.jsx';
import {
  PRICE_CLINICAL, PRICE_EXACT, normalizeTZPhone, requestCheckout, checkServerEntitlement,
} from '../lib/store.js';
import { MobileMoneyRow, detectCarrier, MpesaLogo, YasLogo, AirtelMoneyLogo, HalopesaLogo } from './ProviderLogos.jsx';

export default function PaywallModal({ open, onClose, template, onUnlocked }) {
  const { lang } = useLang();
  const sw = String(lang).toLowerCase() === 'sw';
  const price = template?.slug === 'exact' ? PRICE_EXACT : PRICE_CLINICAL;
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [waitingPIN, setWaitingPIN] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedCarrier, setSelectedCarrier] = React.useState(null);
  const pollRef = React.useRef(null);
  const successTimerRef = React.useRef(null);

  const detected = React.useMemo(() => detectCarrier(phone) || selectedCarrier, [phone, selectedCarrier]);

  const clearAllTimers = React.useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setBusy(false);
      setWaitingPIN(false);
      setSuccess(false);
      setError('');
    } else {
      clearAllTimers();
    }
    return () => clearAllTimers();
  }, [open, clearAllTimers]);

  const handleClose = () => {
    clearAllTimers();
    onClose();
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = normalizeTZPhone(phone);
    if (!cleanPhone || !/^\+255\d{9}$/.test(cleanPhone)) {
      setError(sw ? 'Tafadhali weka namba sahihi ya simu (+255 au 07XX...)' : 'Please enter a valid phone number (+255 or 07XX...)');
      return;
    }

    setBusy(true);
    const res = await requestCheckout({
      item: template?.slug,
      phone: cleanPhone,
      amount: price,
    });
    setBusy(false);

    if (!res || !res.ok) {
      setError(res?.error || (sw ? 'Malipo yameshindwa, tafadhali jaribu tena.' : 'Payment failed, please try again.'));
      return;
    }

    if (res.unlocked) {
      setSuccess(true);
      successTimerRef.current = setTimeout(() => {
        if (typeof onUnlocked === 'function') {
          onUnlocked(template?.slug);
        }
      }, 1200);
      return;
    }

    // Live mode: waiting for USSD push
    setWaitingPIN(true);
    let attempts = 0;
    const maxAttempts = 28; // ~70 seconds timeout
    pollRef.current = setInterval(async () => {
      attempts += 1;
      const unlocked = await checkServerEntitlement(template?.slug);
      if (unlocked) {
        clearAllTimers();
        setWaitingPIN(false);
        setSuccess(true);
        successTimerRef.current = setTimeout(() => {
          if (typeof onUnlocked === 'function') {
            onUnlocked(template?.slug);
          }
        }, 1200);
        return;
      }
      if (attempts >= maxAttempts) {
        clearAllTimers();
        setWaitingPIN(false);
        setError(sw
          ? 'Muda wa malipo umekwisha au USSD imesitishwa kwenye simu. Tafadhali hakikisha simu iko wazi na ujaribu tena.'
          : 'Payment request timed out or was cancelled on handset. Please make sure your phone is unlocked and try again.');
      }
    }, 2500);
  };

  const title = (
    <span>
      <i className="ti ti-crown text-warning me-2"></i>
      {sw ? `Fungua Muundo wa Pro — ${template?.name}` : `Unlock Pro Template — ${template?.name}`}
    </span>
  );

  return (
    <Modal open={open} onClose={handleClose} title={title} size="modal-md">
      {success ? (
        <div className="text-center py-4">
          <div className="text-success fs-1 mb-2">
            <i className="ti ti-circle-check"></i>
          </div>
          <h5 className="fw-bold">{sw ? 'Imefunguliwa Kikamilifu!' : 'Successfully Unlocked!'}</h5>
          <p className="text-secondary small mb-0">
            {sw ? 'Muundo wako wa Pro uko tayari kutumika.' : 'Your Pro template is ready to use.'}
          </p>
        </div>
      ) : waitingPIN ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <h5 className="fw-bold">{sw ? 'Tafadhali Ingiza PIN Kwenye Simu Yako' : 'Please Enter PIN on Your Handset'}</h5>
          <p className="text-secondary small mb-3">
            {sw
              ? `Ujumbe wa USSD push umetumwa kwenye simu yako. Ingiza PIN kuthibitisha malipo ya ${price.toLocaleString()} TZS.`
              : `A USSD push notification has been sent to your phone. Confirm with your mobile money PIN to pay ${price.toLocaleString()} TZS.`}
          </p>

          <div className="d-flex justify-content-center mb-3">
            {detected === 'vodacom' && <MpesaLogo size={32} />}
            {detected === 'yas' && <YasLogo size={32} />}
            {detected === 'airtel' && <AirtelMoneyLogo size={32} />}
            {detected === 'halotel' && <HalopesaLogo size={32} />}
          </div>

          <div className="badge bg-success-subtle text-success border border-success-subtle p-2 mb-3">
            <i className="ti ti-shield-check me-1"></i>
            {sw ? 'Hakuna makato ya ziada kwa mtumiaji (0 TZS Fee)' : 'Zero extra transaction fees for customer'}
          </div>
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                clearAllTimers();
                setWaitingPIN(false);
              }}
            >
              {sw ? 'Ghairi & Rudi' : 'Cancel & Go Back'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Header Amount Card */}
          <div className="d-flex justify-content-between align-items-center p-3 bg-body-tertiary border rounded-3 mb-3 text-start">
            <div>
              <div className="fw-bold fs-6">{template?.name}</div>
              <div className="small text-secondary">{sw ? 'Malipo ya mara moja (Hapana ada za kila mwezi)' : 'One-time unlock (No subscriptions)'}</div>
            </div>
            <div className="text-end">
              <span className="fs-3 fw-bolder text-primary">{price.toLocaleString()}</span>
              <span className="small text-secondary ms-1 fw-bold">TZS</span>
            </div>
          </div>

          {/* Supported Operators Bar */}
          <div className="mb-3 text-start">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-secondary fw-semibold">
                {sw ? 'Chagua mtandao au weka namba chini:' : 'Supported mobile networks:'}
              </span>
              <span className="badge bg-success-subtle text-success small">
                0 TZS Fee
              </span>
            </div>
            <MobileMoneyRow
              size={22}
              activeOperator={detected}
              onSelectOperator={(opId) => setSelectedCarrier(opId)}
            />
          </div>

          <form onSubmit={handlePay} className="text-start">
            <div className="mb-3">
              <label htmlFor="pay-phone" className="form-label small fw-semibold d-flex justify-content-between">
                <span>{sw ? 'Namba ya Simu ya Malipo' : 'Mobile Money Phone Number'}</span>
                {detected && (
                  <span className="badge bg-primary-subtle text-primary border small">
                    {detected === 'vodacom' && 'Vodacom M-Pesa'}
                    {detected === 'yas' && 'Yas (Tigo)'}
                    {detected === 'airtel' && 'Airtel Money'}
                    {detected === 'halotel' && 'Halopesa'}
                  </span>
                )}
              </label>
              <div className="input-group">
                <span className="input-group-text"><i className="ti ti-device-mobile"></i></span>
                <input
                  id="pay-phone"
                  type="tel"
                  className="form-control"
                  placeholder="0755 123 456 / 0712... / 0784..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-text d-flex align-items-center gap-1 mt-1">
                <i className="ti ti-info-circle text-muted"></i>
                <span>{sw ? 'Utapokea USSD prompt ya papo hapo kuingiza PIN.' : 'You will receive an instant USSD push on your handset.'}</span>
              </div>
            </div>

            {error ? <div className="alert alert-danger py-2 small mb-3">{error}</div> : null}

            <div className="d-grid gap-2">
              <button className="btn btn-primary btn-lg fw-bold shadow-sm" type="submit" disabled={busy || !phone.trim()}>
                {busy ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                ) : (
                  <i className="ti ti-lock-open me-2"></i>
                )}
                {sw ? `Lipa TZS ${price.toLocaleString()} & Fungua Sasa` : `Pay ${price.toLocaleString()} TZS & Unlock Now`}
              </button>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleClose} disabled={busy}>
                {sw ? 'Ghairi' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
