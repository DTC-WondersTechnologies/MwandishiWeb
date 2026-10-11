import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { SoonModal, FeedbackModal } from './Modal.jsx';
import { useLang } from '../context.jsx';
import { clearUser } from '../lib/store.js';

export default function Layout() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileShow, setMobileShow] = React.useState(false);
  const [soonOpen, setSoonOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMobile = React.useCallback(() => setMobileShow(false), []);
  const logout = React.useCallback(() => {
    try { clearUser(); } catch (e) { /* ignore */ }
    closeMobile();
    navigate('/signin');
  }, [closeMobile, navigate]);

  return (
    <React.Fragment>
      <div id="overlay" className={`overlay${mobileShow ? ' show' : ''}`} onClick={closeMobile}></div>
      <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} onOpenMobile={() => setMobileShow(true)} />
      <Sidebar
        collapsed={collapsed}
        mobileShow={mobileShow}
        onNavigate={closeMobile}
        onOpenSoon={() => { closeMobile(); setSoonOpen(true); }}
        onFeedback={() => { closeMobile(); setFeedbackOpen(true); }}
        onLogout={logout}
      />
      <main id="content" className={`content pt-10 pb-2${collapsed ? ' full' : ''}`} key={location.pathname}>
        <div className="container-fluid">
          <Outlet />
          <div className="row">
            <div className="col-12">
              <footer className="text-center py-2 mt-2 text-secondary border-top">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-1 small">
                  <Link to="/pricing" className="text-secondary text-decoration-none">{t('nav.pricing')}</Link>
                  <span>·</span>
                  <Link to="/templates" className="text-secondary text-decoration-none">{t('nav.templates')}</Link>
                  <span>·</span>
                  <Link to="/privacy" className="text-secondary text-decoration-none">{t('lp.fPrivacy')}</Link>
                  <span>·</span>
                  <Link to="/terms" className="text-secondary text-decoration-none">{t('lp.fTerms')}</Link>
                </div>
                <p className="mb-0 small">Copyright © 2026 Mwandishi. {t('lp.fTag')} </p>
              </footer>
            </div>
          </div>
        </div>
      </main>
      <SoonModal open={soonOpen} onClose={() => setSoonOpen(false)} t={t} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} t={t} />
    </React.Fragment>
  );
}
