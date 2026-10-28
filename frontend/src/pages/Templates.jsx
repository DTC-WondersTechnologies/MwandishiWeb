import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context.jsx';
import { TEMPLATES, PRO_TEMPLATES, PRICE_CLINICAL, PRICE_EXACT, hasTemplateUnlocked, PAYMENTS_ENABLED } from '../lib/store.js';
import Modal from '../components/Modal.jsx';
import PaywallModal from '../components/PaywallModal.jsx';
import TemplatePreview, { sheetFor, useLinkFor } from '../components/TemplatePreview.jsx';

const FILTERS = [
  ['all', 'tpl.all', 'All'],
  ['graduate', 'tpl.graduate', 'Graduate'],
  ['government', 'tpl.government', 'Government / NGO'],
  ['banking', 'tpl.banking', 'Banking / Telecom'],
  ['general', 'tpl.general', 'General'],
  ['traditional', 'tpl.traditional', 'Traditional'],
  ['barua', 'tpl.letter', 'Application Letter'],
];

export default function Templates() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('all');
  const [preview, setPreview] = React.useState(null);
  const [paywallTpl, setPaywallTpl] = React.useState(null);
  const [, setEntitlementTick] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => setEntitlementTick((x) => x + 1);
    window.addEventListener('mrcv:entitlement-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('mrcv:entitlement-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const shown = TEMPLATES.filter((x) => filter === 'all' || x.cat === filter);

  const handleUse = (tpl) => {
    if (PAYMENTS_ENABLED && PRO_TEMPLATES.includes(tpl.slug) && !hasTemplateUnlocked(tpl.slug)) {
      setPaywallTpl(tpl);
      return;
    }
    navigate(useLinkFor(tpl));
  };

  return (
    <React.Fragment>
      <div className="row">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h1 className="fs-3 mb-1">{t('tpl.title')}</h1>
              <p className="mb-0">{t('tpl.sub')}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/pricing" className="btn btn-outline-primary"><i className="ti ti-coin"></i> <span>{t('nav.pricing')}</span></Link>
              <Link to="/new-cv" className="btn btn-primary"><i className="ti ti-plus"></i> <span>{t('tpl.newcv')}</span></Link>
            </div>
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex gap-2 flex-wrap">
            {FILTERS.map(([v, k, fb]) => (
              <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary active' : 'btn-outline-secondary'}`} onClick={() => setFilter(v)}>{t(k) || fb}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="row g-3 mb-3">
        {shown.map((tpl) => {
          const isPro = PRO_TEMPLATES.includes(tpl.slug);
          const unlocked = !isPro || hasTemplateUnlocked(tpl.slug);
          const price = tpl.slug === 'exact' ? PRICE_EXACT : PRICE_CLINICAL;
          const showPaywall = PAYMENTS_ENABLED && isPro && !unlocked;
          return (
            <div className="col-12 col-md-6 col-lg-4" key={tpl.slug}>
              <div className="card h-100">
                <div className="card-body p-3 d-flex flex-column">
                  <TemplatePreview tpl={tpl} className="cv-frame cv-frame-sm mb-3" />
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h3 className="h6 mb-0">{tpl.name}</h3>
                    {isPro ? (
                      <span className={`badge ${!PAYMENTS_ENABLED ? 'bg-info-subtle text-info-emphasis' : unlocked ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'} border`}>
                        {!PAYMENTS_ENABLED ? t('pr.soonBtn') : unlocked ? t('pr.unlockedBadge') : `Pro · ${price.toLocaleString()} TZS`}
                      </span>
                    ) : null}
                  </div>
                  <p className="small text-secondary mb-2">{tpl.desc}</p>
                  <p className="small mb-2"><i className="ti ti-briefcase text-primary"></i> {tpl.best}</p>
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {tpl.badges.map((b) => <span className="badge bg-light text-secondary border" key={b}>{b}</span>)}
                  </div>
                  <div className="d-flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleUse(tpl)}
                      className={`btn btn-sm flex-grow-1 ${showPaywall ? 'btn-warning' : 'btn-primary'}`}
                    >
                      {showPaywall ? (
                        <span><i className="ti ti-lock me-1"></i>{t('tpl.use')} ({price.toLocaleString()} TZS)</span>
                      ) : (
                        t('tpl.use')
                      )}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setPreview(tpl)}>{t('tpl.preview')}</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview ? preview.name : ''} size="modal-xl" scrollable
        footer={<React.Fragment>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPreview(null)}>{t('tpl.close')}</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const p = preview;
              setPreview(null);
              if (p) handleUse(p);
            }}
          >
            {t('tpl.use')}
          </button>
        </React.Fragment>}>
        {preview ? (() => { const s = sheetFor(preview); return <div className={s.cls} dangerouslySetInnerHTML={{ __html: s.html }}></div>; })() : null}
      </Modal>

      <PaywallModal
        open={PAYMENTS_ENABLED && !!paywallTpl}
        template={paywallTpl}
        onClose={() => setPaywallTpl(null)}
        onUnlocked={(slug) => {
          setPaywallTpl(null);
          navigate(`/new-cv?template=${slug}`);
        }}
      />
    </React.Fragment>
  );
}

