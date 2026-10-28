import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang, useTheme } from '../context.jsx';
import {
  TEMPLATES, PRO_TEMPLATES, PRICE_CLINICAL, PRICE_EXACT,
  hasTemplateUnlocked, PAYMENTS_ENABLED,
} from '../lib/store.js';
import { sheetFor } from '../components/TemplatePreview.jsx';
import Modal from '../components/Modal.jsx';
import PaywallModal from '../components/PaywallModal.jsx';
import { MobileMoneyRow } from '../components/ProviderLogos.jsx';
import logoUrl from '../assets/images/logo-leaf.png';

const FAQS = [
  ['pr.q1', 'pr.a1'],
  ['pr.q2', 'pr.a2'],
  ['pr.q3', 'pr.a3'],
  ['pr.q4', 'pr.a4'],
  ['pr.q5', 'pr.a5'],
  ['pr.q6', 'pr.a6'],
];

export default function Pricing() {
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [openFaq, setOpenFaq] = React.useState(0);
  const [paywallTpl, setPaywallTpl] = React.useState(null);
  const [previewTpl, setPreviewTpl] = React.useState(null);
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

  const clinicalTpl = TEMPLATES.find((x) => x.slug === 'clinical');
  const exactTpl = TEMPLATES.find((x) => x.slug === 'exact');

  const isClinicalUnlocked = hasTemplateUnlocked('clinical');
  const isExactUnlocked = hasTemplateUnlocked('exact');

  const handleUnlockOrUse = (tpl) => {
    if (!tpl) return;
    if (hasTemplateUnlocked(tpl.slug)) {
      navigate(`/new-cv?template=${tpl.slug}`);
      return;
    }
    if (!PAYMENTS_ENABLED) return;
    setPaywallTpl(tpl);
  };

  return (
    <div className="lp pricing-page">
      {/* ------------------------------------------------------------- Navigation */}
      <nav className="lp-nav py-2 shadow-xs">
        <div className="container-fluid px-3 px-sm-4 px-xl-5">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <Link to="/" className="navbar-brand">
              <img src={logoUrl} alt="Mwandishi AI" width="28" height="28" />
              <span>{t('lp.fTitle')}</span>
            </Link>

            <div className="d-none d-lg-flex align-items-center gap-3 gap-xl-4">
              <Link className="nav-link" to="/">{t('pr.navHome')}</Link>
              <Link className="nav-link" to="/templates">{t('nav.templates')}</Link>
              <Link className="nav-link active fw-bold text-primary" to="/pricing">{t('nav.pricing')}</Link>
              <Link className="nav-link" to="/cover-letters">{t('nav.letters')}</Link>
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="btn-group btn-group-sm" role="group" aria-label="Language switcher">
                {['EN', 'SW'].map((code) => {
                  const active = lang.toUpperCase() === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLang(code)}
                      aria-pressed={active}
                      className={`btn lp-lang ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-ghost-secondary"
                onClick={toggle}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
              >
                <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`}></i>
              </button>

              <Link to="/new-cv" className="btn btn-sm btn-primary rounded-pill px-3 shadow-xs">
                <span>{t('pr.freeCta')}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------- Minimalist Hero */}
      <header className="pricing-hero text-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 col-xl-9">
              <h1 className="pricing-title">
                {t('pr.heroH1Line1')}{' '}
                <span className="text-primary">{t('pr.heroH1Line2')}</span>
              </h1>

              <p className="pricing-lead mx-auto mb-0">
                {t('pr.sub')}
              </p>
              {!PAYMENTS_ENABLED && (
                <div className="alert alert-warning d-inline-flex align-items-center gap-2 mt-3 px-3 py-2 mx-auto">
                  <i className="ti ti-clock"></i>
                  <span>{t('pr.soonBanner')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- 3-Tier Pricing Cards Grid */}
      <section className="pricing-cards-section" id="plans">
        <div className="container" style={{ maxWidth: '1080px' }}>
          <div className="pricing-grid">

            {/* Plan 1: Free Forever */}
            <div className="col-12 col-lg-4 pricing-card pricing-card-free">
              <div className="pricing-card-header mb-3">
                <div>
                  <span className="pricing-badge bg-body-secondary text-secondary border">
                    {t('pr.freeBadge')}
                  </span>
                </div>
                <h2 className="pricing-card-title mt-2 mb-1">{t('pr.freeTitle')}</h2>
                <div className="d-flex align-items-baseline">
                  <span className="pricing-amount text-body">{t('pr.freePrice')}</span>
                </div>
                <p className="pricing-card-desc text-secondary small mt-2 mb-0">
                  {t('pr.freeDesc')}
                </p>
              </div>

              <div className="pricing-card-action mb-3">
                <Link
                  to="/templates"
                  className="btn btn-outline-primary pricing-btn w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  <span>{t('pr.freeCta')}</span>
                  <i className="ti ti-arrow-right"></i>
                </Link>
                <div className="pricing-terms text-center mt-2">
                  {t('pr.valNoAccount')} · {t('pr.valOnDevice')}
                </div>
              </div>

              <hr className="pricing-card-divider" />

              <div className="pricing-card-features flex-grow-1">
                <div className="pricing-features-label text-uppercase text-secondary mb-2">
                  {t('pr.colFeature')}:
                </div>
                <ul className="pricing-feature-list list-unstyled mb-0">
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF1')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF2')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF3')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF4')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF5')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-success"></i>
                    <span>{t('pr.freeF6')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 2: Clinical Two-Column */}
            <div className="col-12 col-lg-4 pricing-card pricing-card-clinical">
              <div className="pricing-card-header mb-3">
                <div>
                  <span className="pricing-badge bg-info-subtle text-info border border-info-subtle">
                    {t('pr.clinicalBadge')}
                  </span>
                </div>
                <h2 className="pricing-card-title mt-2 mb-1">{t('pr.clinicalTitle')}</h2>
                <div className="d-flex align-items-baseline">
                  <span className="pricing-amount text-info">{t('pr.clinicalPrice')}</span>
                </div>
                <p className="pricing-card-desc text-secondary small mt-2 mb-0">
                  {t('pr.clinicalDesc')}
                </p>
              </div>

              <div className="pricing-card-action mb-3">
                <button
                  type="button"
                  onClick={() => handleUnlockOrUse(clinicalTpl)}
                  className={`btn ${PAYMENTS_ENABLED && isClinicalUnlocked ? 'btn-outline-primary' : PAYMENTS_ENABLED ? 'btn-primary' : 'btn-outline-secondary'} pricing-btn w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs`}
                  disabled={!PAYMENTS_ENABLED}
                >
                  <i className={`ti ${PAYMENTS_ENABLED && isClinicalUnlocked ? 'ti-arrow-right' : PAYMENTS_ENABLED ? 'ti-device-mobile' : 'ti-clock'} fs-5`}></i>
                  <span>
                    {!PAYMENTS_ENABLED
                      ? t('pr.soonBtn')
                      : isClinicalUnlocked
                        ? t('pr.clinicalCtaUnlocked')
                        : t('pr.clinicalCtaLocked')}
                  </span>
                </button>
                <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1 pricing-preview-link"
                    onClick={() => clinicalTpl && setPreviewTpl(clinicalTpl)}
                  >
                    <i className="ti ti-eye"></i>
                    <span>{t('pr.clinicalPreview')}</span>
                  </button>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>·</span>
                  <span className="pricing-terms">{t('pr.valLifetime')}</span>
                </div>
              </div>

              <hr className="pricing-card-divider" />

              <div className="pricing-card-features flex-grow-1">
                <div className="pricing-features-label text-uppercase text-secondary mb-2">
                  {t('pr.colFeature')}:
                </div>
                <ul className="pricing-feature-list list-unstyled mb-0">
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span><strong>{t('pr.clinicalF1')}</strong></span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span>{t('pr.clinicalF2')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span><strong>{t('pr.clinicalF3')}</strong></span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span>{t('pr.clinicalF4')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span>{t('pr.clinicalF5')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-info"></i>
                    <span>{t('pr.clinicalF6')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 3: Exact ATS Replica */}
            <div className="col-12 col-lg-4 pricing-card pricing-card-exact pricing-card-pro position-relative">
              <div className="pricing-popular-ribbon">
                <span className="badge bg-primary text-white px-2.5 py-1 rounded-pill shadow-xs d-inline-flex align-items-center gap-1">
                  <i className="ti ti-sparkles"></i>
                  <span>{t('pr.popularRibbon')}</span>
                </span>
              </div>

              <div className="pricing-card-header mb-3">
                <div>
                  <span className="pricing-badge bg-primary-subtle text-primary border border-primary-subtle">
                    {t('pr.exactBadge')}
                  </span>
                </div>
                <h2 className="pricing-card-title mt-2 mb-1">{t('pr.exactTitle')}</h2>
                <div className="d-flex align-items-baseline">
                  <span className="pricing-amount text-primary">{t('pr.exactPrice')}</span>
                </div>
                <p className="pricing-card-desc text-secondary small mt-2 mb-0">
                  {t('pr.exactDesc')}
                </p>
              </div>

              <div className="pricing-card-action mb-3">
                <button
                  type="button"
                  onClick={() => handleUnlockOrUse(exactTpl)}
                  className={`btn ${PAYMENTS_ENABLED && isExactUnlocked ? 'btn-outline-primary' : PAYMENTS_ENABLED ? 'btn-primary' : 'btn-outline-secondary'} pricing-btn w-100 d-flex align-items-center justify-content-center gap-2 shadow-sm`}
                  disabled={!PAYMENTS_ENABLED}
                >
                  <i className={`ti ${PAYMENTS_ENABLED && isExactUnlocked ? 'ti-arrow-right' : PAYMENTS_ENABLED ? 'ti-device-mobile' : 'ti-clock'} fs-5`}></i>
                  <span>
                    {!PAYMENTS_ENABLED
                      ? t('pr.soonBtn')
                      : isExactUnlocked
                        ? t('pr.exactCtaUnlocked')
                        : t('pr.exactCtaLocked')}
                  </span>
                </button>
                <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-secondary d-inline-flex align-items-center gap-1 pricing-preview-link"
                    onClick={() => exactTpl && setPreviewTpl(exactTpl)}
                  >
                    <i className="ti ti-eye"></i>
                    <span>{t('pr.exactPreview')}</span>
                  </button>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>·</span>
                  <span className="pricing-terms">{t('pr.valLifetime')}</span>
                </div>
              </div>

              <hr className="pricing-card-divider" />

              <div className="pricing-card-features flex-grow-1">
                <div className="pricing-features-label text-uppercase text-secondary mb-2">
                  {t('pr.colFeature')}:
                </div>
                <ul className="pricing-feature-list list-unstyled mb-0">
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span><strong>{t('pr.exactF1')}</strong></span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span>{t('pr.exactF2')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span><strong>{t('pr.exactF3')}</strong></span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span>{t('pr.exactF4')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span>{t('pr.exactF5')}</span>
                  </li>
                  <li>
                    <i className="ti ti-circle-check-filled text-primary"></i>
                    <span>{t('pr.exactF6')}</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- 3-Column Feature Comparison Matrix */}
      <section className="pricing-matrix-section" id="matrix">
        <div className="container" style={{ maxWidth: '1080px' }}>
          <div className="pricing-matrix-header text-center">
            <h2 className="h2 fw-bold mb-3">{t('pr.matrixTitle')}</h2>
            <p className="text-secondary fs-6 mx-auto mb-0" style={{ maxWidth: '680px', lineHeight: '1.6' }}>
              {t('pr.matrixSub')}
            </p>
          </div>
          <div className="pricing-matrix-wrapper table-responsive shadow-xs">
            <table className="pricing-matrix-table table-responsive">
              <thead>
                <tr>
                  <th className="matrix-col-feature">{t('pr.colFeature')}</th>
                  <th className="matrix-col-val">{t('pr.colFree')}</th>
                  <th className="matrix-col-val">{t('pr.colClinical')}</th>
                  <th className="matrix-col-val matrix-col-exact">{t('pr.colExact')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowPrice')}</td>
                  <td className="matrix-col-val">{t('pr.valPriceFree')}</td>
                  <td className="matrix-col-val">{t('pr.valPriceClinical')}</td>
                  <td className="matrix-col-val matrix-col-exact fw-bold text-primary">{t('pr.valPriceExact')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowTplsIncluded')}</td>
                  <td className="matrix-col-val">{t('pr.valTplsFree')}</td>
                  <td className="matrix-col-val">{t('pr.valTplsClinical')}</td>
                  <td className="matrix-col-val matrix-col-exact">{t('pr.valTplsExact')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowLayout')}</td>
                  <td className="matrix-col-val">{t('pr.valLayoutFree')}</td>
                  <td className="matrix-col-val">{t('pr.valLayoutClinical')}</td>
                  <td className="matrix-col-val matrix-col-exact">{t('pr.valLayoutExact')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowPhoto')}</td>
                  <td className="matrix-col-val text-muted"><i className="ti ti-minus me-1"></i>{t('pr.valPhotoFree')}</td>
                  <td className="matrix-col-val text-muted"><i className="ti ti-minus me-1"></i>{t('pr.valPhotoClinical')}</td>
                  <td className="matrix-col-val matrix-col-exact text-success fw-semibold"><i className="ti ti-circle-check-filled me-1"></i>{t('pr.valPhotoExact')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowDownloads')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valDownloadsAll')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valDownloadsAll')}</td>
                  <td className="matrix-col-val matrix-col-exact"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valDownloadsAll')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowWhatsApp')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valWhatsAppAll')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valWhatsAppAll')}</td>
                  <td className="matrix-col-val matrix-col-exact"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valWhatsAppAll')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowOffline')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valOfflineAll')}</td>
                  <td className="matrix-col-val"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valOfflineAll')}</td>
                  <td className="matrix-col-val matrix-col-exact"><i className="ti ti-circle-check-filled text-success me-1"></i>{t('pr.valOfflineAll')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowFee')}</td>
                  <td className="matrix-col-val text-success fw-bold">{t('pr.valFeeZero')}</td>
                  <td className="matrix-col-val text-success fw-bold">{t('pr.valFeeZero')}</td>
                  <td className="matrix-col-val matrix-col-exact text-success fw-bold">{t('pr.valFeeZero')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowPayment')}</td>
                  <td className="matrix-col-val">{t('pr.valPaymentFree')}</td>
                  <td className="matrix-col-val">{t('pr.valPaymentPaid')}</td>
                  <td className="matrix-col-val matrix-col-exact">{t('pr.valPaymentPaid')}</td>
                </tr>
                <tr>
                  <td className="matrix-col-feature">{t('pr.rowAccess')}</td>
                  <td className="matrix-col-val">{t('pr.valAccessLifetime')}</td>
                  <td className="matrix-col-val">{t('pr.valAccessLifetime')}</td>
                  <td className="matrix-col-val matrix-col-exact">{t('pr.valAccessLifetime')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Mobile Money Trust Bar */}
      <section className="pricing-trust-section">
        <div className="container" style={{ maxWidth: '1080px' }}>
          <div className="pricing-trust-bar border rounded-4 p-3.5 p-md-4 bg-body shadow-xs">
            <div className="row g-4 align-items-center">
              <div className="col-12 col-lg-5 border-lg-end">
                <div className="d-flex flex-column gap-2">
                  <span className="small text-secondary fw-semibold">
                    <i className="ti ti-shield-check text-success me-1 fs-6"></i>
                    {t('pr.operatorsTitle')}
                  </span>
                  <MobileMoneyRow size={28} compact={false} />
                  <div className="small text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                    {PAYMENTS_ENABLED ? t('pr.trustFeeDesc') : t('pr.soonTrust')}
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-7">
                <div className="row g-3">
                  {PAYMENTS_ENABLED ? (
                    <React.Fragment>
                      <div className="col-12 col-sm-4">
                        <div className="d-flex align-items-start gap-2">
                          <span className="step-bubble bg-primary text-white flex-shrink-0">1</span>
                          <div>
                            <strong className="d-block small">{t('pr.step1Title')}</strong>
                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{t('pr.step1Desc')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-4">
                        <div className="d-flex align-items-start gap-2">
                          <span className="step-bubble bg-primary text-white flex-shrink-0">2</span>
                          <div>
                            <strong className="d-block small">{t('pr.step2Title')}</strong>
                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{t('pr.step2Desc')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-4">
                        <div className="d-flex align-items-start gap-2">
                          <span className="step-bubble bg-success text-white flex-shrink-0">3</span>
                          <div>
                            <strong className="d-block small">{t('pr.step3Title')}</strong>
                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{t('pr.step3Desc')}</span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div className="col-12">
                      <div className="d-flex align-items-center gap-2 text-secondary">
                        <i className="ti ti-clock"></i>
                        <span className="small">{t('pr.soonTrust')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Clean Minimal FAQ */}
      <section className="pricing-faq-section bg-body-tertiary" id="faq">
        <div className="container" style={{ maxWidth: '840px' }}>
          <div className="pricing-faq-header text-center">
            <span className="pricing-badge bg-primary-subtle text-primary border border-primary-subtle mb-3">
              {t('pr.faqEyebrow')}
            </span>
            <h2 className="lp-h2 mb-3">{t('pr.faqTitle')}</h2>
            <p className="lp-sub2 mx-auto mb-0" style={{ maxWidth: '640px', lineHeight: '1.6' }}>{t('pr.faqSub')}</p>
          </div>

          <div className="pricing-faq-list">
            {FAQS.map(([qKey, aKey], idx) => {
              const isOpen = openFaq === idx;
              return (
                <div className="pricing-faq-item py-3 border-bottom" key={qKey}>
                  <button
                    className="pricing-faq-question w-100 d-flex justify-content-between align-items-center text-start btn btn-link text-decoration-none p-0 text-body"
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="fw-semibold fs-6 pe-3">
                      {t(qKey)}
                    </span>
                    <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'} text-secondary fs-5 flex-shrink-0`}></i>
                  </button>
                  {isOpen && (
                    <div className="pricing-faq-answer pt-2 text-secondary small">
                      {t(aKey)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Bottom Action CTA */}
      <section className="pricing-cta-section">
        <div className="container" style={{ maxWidth: '920px' }}>
          <div className="lp-cta p-5 p-md-6">
            <h2 className="mb-3">{t('pr.ctaTitle')}</h2>
            <p className="mb-4 fs-6">{t('pr.ctaSub')}</p>
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <Link to="/new-cv" className="btn btn-primary btn-lg shadow-xs">
                <i className="ti ti-plus me-1"></i>
                <span>{t('pr.ctaStart')}</span>
              </Link>
              <Link to="/templates" className="btn btn-outline-secondary btn-lg">
                <i className="ti ti-layout-grid me-1"></i>
                <span>{t('pr.ctaExplore')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Standard Localized Footer */}
      <footer className="lp-foot">
        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-6">
              <div className="d-flex align-items-center gap-2">
                <img src={logoUrl} alt="" width="22" height="22" />
                <strong>{t('lp.fTitle')}</strong>
                <span className="d-none d-sm-inline">· {t('lp.fTag')}</span>
              </div>
            </div>
            <div className="col-12 col-md-6 text-md-end">
              <Link to="/pricing" className="legal-link fw-semibold text-primary">{t('nav.pricing')}</Link>
              <span className="mx-2">·</span>
              <Link to="/templates" className="legal-link">{t('nav.templates')}</Link>
              <span className="mx-2">·</span>
              <Link to="/privacy" className="legal-link">{t('lp.fPrivacy')}</Link>
              <span className="mx-2">·</span>
              <Link to="/terms" className="legal-link">{t('lp.fTerms')}</Link>
              <span className="mx-2">·</span>
              <span>{t('lp.fRights')} </span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- Modals */}
      {/* 1. Paywall Checkout Modal */}
      <PaywallModal
        open={PAYMENTS_ENABLED && Boolean(paywallTpl)}
        template={paywallTpl}
        onClose={() => setPaywallTpl(null)}
        onUnlocked={(slug) => {
          setPaywallTpl(null);
          setEntitlementTick((x) => x + 1);
          navigate(`/new-cv?template=${slug}`);
        }}
      />

      {/* 2. Interactive Template Sheet Preview Modal */}
      <Modal
        open={Boolean(previewTpl)}
        onClose={() => setPreviewTpl(null)}
        size="modal-xl"
        scrollable
        title={previewTpl ? `${previewTpl.name} — ${t('pr.previewBtn')}` : ''}
        footer={
          <div className="d-flex w-100 justify-content-between align-items-center">
            <span className="small text-secondary">
              {previewTpl && hasTemplateUnlocked(previewTpl.slug)
                ? t('pr.modalUnlocked')
                : t('pr.modalUnlockPrompt')}
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setPreviewTpl(null)}
              >
                {t('pr.modalClose')}
              </button>
              <button
                type="button"
                className={`btn ${previewTpl && hasTemplateUnlocked(previewTpl.slug) ? 'btn-success' : 'btn-primary'}`}
                onClick={() => {
                  const tpl = previewTpl;
                  setPreviewTpl(null);
                  handleUnlockOrUse(tpl);
                }}
              >
                {previewTpl && hasTemplateUnlocked(previewTpl.slug)
                  ? t('pr.modalUse')
                  : t('pr.modalUnlockBtn')}
              </button>
            </div>
          </div>
        }
      >
        {previewTpl && (() => {
          const s = sheetFor(previewTpl);
          return (
            <div className="d-flex justify-content-center p-3 bg-body-tertiary">
              <div className={s.cls} dangerouslySetInnerHTML={{ __html: s.html }} />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
