import React from 'react';

import mpesaImg from '../assets/images/payments/mpesa.png';
import airtelImg from '../assets/images/payments/airtel.jpg';
import mixxYasImg from '../assets/images/payments/mixx_yas.jpg';
import halopesaImg from '../assets/images/payments/halopesa.jpg';

export { mpesaImg, airtelImg, mixxYasImg, halopesaImg };

export function MpesaLogo({ size = 32, showLabel = true, className = '' }) {
  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <img
        src={mpesaImg}
        alt="Vodacom M-Pesa"
        width={size}
        height={size}
        className="rounded-circle object-fit-cover shadow-2xs border border-light"
      />
      {showLabel && (
        <span className="fw-bold tracking-tight text-nowrap" style={{ fontSize: size * 0.44, color: '#E60400' }}>
          M-Pesa
        </span>
      )}
    </div>
  );
}

export function YasLogo({ size = 32, showLabel = true, className = '' }) {
  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <img
        src={mixxYasImg}
        alt="Mixx by yas (Tigo)"
        width={size * 1.3}
        height={size}
        className="rounded-2 object-fit-cover shadow-2xs border border-light"
      />
      {showLabel && (
        <span className="fw-bold tracking-tight text-nowrap" style={{ fontSize: size * 0.44, color: '#002B7F' }}>
          Mixx <span className="small text-secondary fw-normal">(yas)</span>
        </span>
      )}
    </div>
  );
}

export function AirtelMoneyLogo({ size = 32, showLabel = true, className = '' }) {
  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <img
        src={airtelImg}
        alt="Airtel Money"
        width={size}
        height={size}
        className="rounded-2 object-fit-cover shadow-2xs border border-light"
      />
      {showLabel && (
        <span className="fw-bold tracking-tight text-nowrap" style={{ fontSize: size * 0.44, color: '#E40000' }}>
          Airtel <span className="small text-secondary fw-normal">Money</span>
        </span>
      )}
    </div>
  );
}

export function HalopesaLogo({ size = 32, showLabel = true, className = '' }) {
  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <img
        src={halopesaImg}
        alt="Halopesa (Halotel)"
        width={size * 1.25}
        height={size}
        className="rounded-2 object-fit-contain shadow-2xs bg-white px-1 border border-light"
      />
      {showLabel && (
        <span className="fw-bold tracking-tight text-nowrap" style={{ fontSize: size * 0.44, color: '#FF6600' }}>
          Halopesa
        </span>
      )}
    </div>
  );
}

/**
 * MobileMoneyRow: Displays authentic official operator logos
 */
export function MobileMoneyRow({
  size = 28,
  compact = false,
  activeOperator = null,
  onSelectOperator = null,
  className = '',
}) {
  const providers = [
    { id: 'vodacom', name: 'Vodacom M-Pesa', img: mpesaImg, label: 'M-Pesa', color: '#E60400' },
    { id: 'yas', name: 'Mixx by yas (Tigo)', img: mixxYasImg, label: 'Mixx by yas', color: '#002B7F', wide: true },
    { id: 'airtel', name: 'Airtel Money', img: airtelImg, label: 'Airtel Money', color: '#E40000' },
    { id: 'halotel', name: 'Halopesa', img: halopesaImg, label: 'Halopesa', color: '#FF6600', contain: true },
  ];

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 ${className}`}>
      {providers.map((p) => {
        const isActive = activeOperator === p.id;
        const clickable = typeof onSelectOperator === 'function';

        return (
          <div
            key={p.id}
            onClick={() => clickable && onSelectOperator(p.id)}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            className={`d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 border bg-white shadow-xs transition-all ${
              isActive ? 'border-primary ring-2 ring-primary shadow-sm bg-primary-subtle' : ''
            }`}
            style={{
              cursor: clickable ? 'pointer' : 'default',
              transform: isActive ? 'scale(1.03)' : undefined,
              borderColor: isActive ? 'var(--bs-primary)' : 'rgba(0,0,0,0.1)',
            }}
            title={p.name}
          >
            <img
              src={p.img}
              alt={p.name}
              height={size}
              width={p.wide ? size * 1.35 : p.contain ? size * 1.25 : size}
              className={`rounded-2 ${p.contain ? 'object-fit-contain bg-white px-1' : 'object-fit-cover'}`}
            />
            {!compact && (
              <span className="fw-bold small text-dark text-nowrap" style={{ fontSize: '0.82rem' }}>
                {p.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Detects carrier from a Tanzanian phone number prefix
 */
export function detectCarrier(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  const p = digits.startsWith('255') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;

  if (/^(74|75|76)/.test(p)) return 'vodacom'; // 074X, 075X, 076X -> Vodacom M-Pesa
  if (/^(71|65|67|77)/.test(p)) return 'yas';     // 071X, 065X, 067X, 077X -> Mixx by yas (Tigo)
  if (/^(78|79|68|69)/.test(p)) return 'airtel';  // 078X, 079X, 068X, 069X -> Airtel Money
  if (/^(62|61)/.test(p)) return 'halotel';       // 062X, 061X -> Halopesa (Halotel)
  return null;
}
