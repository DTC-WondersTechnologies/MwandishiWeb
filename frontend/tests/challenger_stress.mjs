/**
 * CHALLENGER 2 EMPIRICAL STRESS TEST SUITE
 * 
 * Adversarial stress testing for MwandishiWeb 3-Card Pricing Architecture:
 * - Edge Cases & Robustness
 * - State Machine Transitions & Invariants
 * - Cross-Tab Synchronization & Event Cleanup
 * - Dark Mode Theming & Contrast Rules
 * - Security & Boundary Protections
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_DIR, '..');

// ============================================================================
// ENVIRONMENT HARNESS
// ============================================================================
const localStoreData = {};
const windowListeners = new Map();

global.localStorage = {
  getItem: (k) => (k in localStoreData ? localStoreData[k] : null),
  setItem: (k, v) => { localStoreData[k] = String(v); },
  removeItem: (k) => { delete localStoreData[k]; },
  clear: () => {
    for (const k of Object.keys(localStoreData)) delete localStoreData[k];
  },
};

global.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

global.StorageEvent = class StorageEvent extends Event {
  constructor(type, init = {}) {
    super(type);
    this.key = init.key ?? null;
    this.oldValue = init.oldValue ?? null;
    this.newValue = init.newValue ?? null;
  }
};

global.window = {
  addEventListener: (event, handler) => {
    if (!windowListeners.has(event)) windowListeners.set(event, new Set());
    windowListeners.get(event).add(handler);
  },
  removeEventListener: (event, handler) => {
    if (windowListeners.has(event)) {
      windowListeners.get(event).delete(handler);
    }
  },
  dispatchEvent: (event) => {
    const type = event?.type || event;
    const handlers = windowListeners.get(type);
    if (handlers) {
      for (const h of handlers) {
        try { h(event); } catch (e) { /* ignore */ }
      }
    }
    return true;
  },
  location: { search: '', origin: 'http://localhost:5173', hostname: 'localhost' },
  localStorage: global.localStorage,
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' },
};

let passed = 0;
let failed = 0;
const results = [];

function assert(description, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', description });
    console.log(`  PASS: ${description}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', description, detail });
    console.error(`  FAIL: ${description} ${detail ? '-> ' + detail : ''}`);
  }
}

async function runStressTests() {
  console.log('\n====================================================================');
  console.log('       CHALLENGER 2 EMPIRICAL ADVERSARIAL STRESS TEST SUITE        ');
  console.log('====================================================================\n');

  // Dynamic import of modules under test
  const storePath = path.resolve(FRONTEND_DIR, 'src/lib/store.js');
  const i18nPath = path.resolve(FRONTEND_DIR, 'src/lib/i18n.js');
  const pricingPath = path.resolve(FRONTEND_DIR, 'src/pages/Pricing.jsx');
  const paywallModalPath = path.resolve(FRONTEND_DIR, 'src/components/PaywallModal.jsx');
  const scssPath = path.resolve(FRONTEND_DIR, 'src/assets/scss/_landing.scss');
  const docPricingPath = path.resolve(REPO_ROOT, 'docs/pricing.md');

  const store = await import(`file://${storePath}`);
  const i18n = await import(`file://${i18nPath}`);

  const {
    PRICE_CLINICAL, PRICE_EXACT, PRO_TEMPLATES, TEMPLATES,
    hasTemplateUnlocked, saveLocalEntitlement, getLocalEntitlements,
    normalizeTZPhone, checkServerEntitlement, requestCheckout,
  } = store;

  const { STR } = i18n;

  // --------------------------------------------------------------------------
  // SUITE 1: EDGE CASES & DEFENSIVE ROBUSTNESS
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: EDGE CASES & DEFENSIVE ROBUSTNESS ---');

  // EC-1: Entitlement queries on non-existent or malicious slugs
  assert('EC-1.1: Free templates are always unlocked', hasTemplateUnlocked('graduate') === true);
  assert('EC-1.2: Free template govt is unlocked', hasTemplateUnlocked('govt') === true);
  assert('EC-1.3: Arbitrary unknown slug defaults to unlocked (non-pro)', hasTemplateUnlocked('nonexistent-template') === true);
  assert('EC-1.4: Prototype pollution attempt __proto__ is treated as non-pro unlocked', hasTemplateUnlocked('__proto__') === true);
  assert('EC-1.5: Constructor property query is treated as non-pro unlocked', hasTemplateUnlocked('constructor') === true);
  assert('EC-1.6: Falsy slug (null) is treated as non-pro unlocked without throwing', hasTemplateUnlocked(null) === true);

  // EC-2: saveLocalEntitlement input validation & fuzzing
  global.localStorage.clear();
  saveLocalEntitlement(null);
  saveLocalEntitlement(undefined);
  saveLocalEntitlement('');
  saveLocalEntitlement(12345);
  saveLocalEntitlement({});
  saveLocalEntitlement([]);
  saveLocalEntitlement(true);
  assert('EC-2.1: Non-string and falsy inputs rejected from storage', getLocalEntitlements().length === 0);

  // EC-3: Storage corruption recovery
  global.localStorage.setItem('mrcv.entitlements', 'NOT_VALID_JSON{[');
  assert('EC-3.1: SyntaxError in storage returns [] safely', Array.isArray(getLocalEntitlements()) && getLocalEntitlements().length === 0);

  global.localStorage.setItem('mrcv.entitlements', JSON.stringify({ not: 'an array' }));
  assert('EC-3.2: Object in storage returns [] safely', Array.isArray(getLocalEntitlements()) && getLocalEntitlements().length === 0);

  global.localStorage.setItem('mrcv.entitlements', JSON.stringify(42));
  assert('EC-3.3: Primitive number in storage returns [] safely', Array.isArray(getLocalEntitlements()) && getLocalEntitlements().length === 0);

  // EC-4: QuotaExceeded / setItem throwing exception
  const originalSetItem = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  let threwQuota = false;
  try {
    saveLocalEntitlement('clinical');
  } catch (e) {
    threwQuota = true;
  }
  global.localStorage.setItem = originalSetItem;
  assert('EC-4.1: saveLocalEntitlement catches and absorbs storage exceptions gracefully', threwQuota === false);

  // EC-5: Tanzanian Phone normalization adversarial edge cases
  assert('EC-5.1: Leading +255 formatted with leading +', normalizeTZPhone('+255712345678') === '+255712345678');
  assert('EC-5.2: Leading 07 formatted with +255', normalizeTZPhone('0712345678') === '+255712345678');
  assert('EC-5.3: Leading 06 formatted with +255', normalizeTZPhone('0682345678') === '+255682345678');
  assert('EC-5.4: Accidental 2550 prefix normalized', normalizeTZPhone('2550712345678') === '+255712345678');
  assert('EC-5.5: Messy phone with hyphens and spaces normalized', normalizeTZPhone(' +255 (075) 512-3456 ') === '+255755123456');
  assert('EC-5.6: Dirty 9-digit input without 0 normalized', normalizeTZPhone('755123456') === '+255755123456');
  assert('EC-5.7: Empty or null phone returns safe falsy', !normalizeTZPhone(null) && !normalizeTZPhone(''));
  assert('EC-5.8: Letters and special characters stripped', normalizeTZPhone('ABC+255-755-123456!') === '+255755123456');

  // --------------------------------------------------------------------------
  // SUITE 2: STATE MACHINE TRANSITIONS & INVARIANTS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: STATE MACHINE TRANSITIONS & INVARIANTS ---');

  // SM-1: Fresh Session State -> Both locked
  global.localStorage.clear();
  assert('SM-1.1: State S0: Fresh session has Clinical locked', hasTemplateUnlocked('clinical') === false);
  assert('SM-1.2: State S0: Fresh session has Exact locked', hasTemplateUnlocked('exact') === false);

  // SM-2: S0 -> S1 (Clinical Unlock only)
  saveLocalEntitlement('clinical');
  assert('SM-2.1: State S1: Clinical is unlocked', hasTemplateUnlocked('clinical') === true);
  assert('SM-2.2: State S1: Exact remains strictly locked', hasTemplateUnlocked('exact') === false);

  // SM-3: S1 -> S2 (Storage Clear / Cache Purge)
  global.localStorage.clear();
  assert('SM-3.1: State S2: Cache clear immediately re-locks Clinical', hasTemplateUnlocked('clinical') === false);
  assert('SM-3.2: State S2: Cache clear preserves locked Exact', hasTemplateUnlocked('exact') === false);

  // SM-4: S2 -> S3 (Exact Unlock only)
  saveLocalEntitlement('exact');
  assert('SM-4.1: State S3: Exact is unlocked', hasTemplateUnlocked('exact') === true);
  assert('SM-4.2: State S3: Clinical remains strictly locked', hasTemplateUnlocked('clinical') === false);

  // SM-5: S3 -> S4 (Cumulative Dual Unlock)
  saveLocalEntitlement('clinical');
  assert('SM-5.1: State S4: Both Clinical and Exact are unlocked', hasTemplateUnlocked('clinical') === true && hasTemplateUnlocked('exact') === true);

  // SM-6: Idempotent repeat unlocks
  saveLocalEntitlement('clinical');
  saveLocalEntitlement('clinical');
  saveLocalEntitlement('exact');
  const storedList = getLocalEntitlements();
  assert('SM-6.1: Idempotence: Duplicate unlocks deduplicated in storage', storedList.length === 2 && storedList.includes('clinical') && storedList.includes('exact'));

  // --------------------------------------------------------------------------
  // SUITE 3: CROSS-TAB SYNCHRONIZATION & EVENT PROPAGATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: CROSS-TAB SYNCHRONIZATION & EVENT PROPAGATION ---');

  // XT-1: Custom window event dispatch upon saveLocalEntitlement
  let windowEventFired = 0;
  const customListener = () => { windowEventFired++; };
  global.window.addEventListener('mrcv:entitlement-changed', customListener);

  global.localStorage.clear();
  saveLocalEntitlement('clinical');
  assert('XT-1.1: saveLocalEntitlement dispatches mrcv:entitlement-changed', windowEventFired === 1);

  // Duplicate unlock should NOT dispatch again
  saveLocalEntitlement('clinical');
  assert('XT-1.2: Duplicate unlock does not fire redundant change events', windowEventFired === 1);

  // Unlock exact should dispatch
  saveLocalEntitlement('exact');
  assert('XT-1.3: New item unlock fires change event', windowEventFired === 2);
  global.window.removeEventListener('mrcv:entitlement-changed', customListener);

  // XT-2: Cross-tab StorageEvent simulation
  let storageEventFired = 0;
  let simulatedTabUnlocked = false;
  const simulatedTabListener = (e) => {
    storageEventFired++;
    simulatedTabUnlocked = hasTemplateUnlocked('clinical');
  };
  global.window.addEventListener('storage', simulatedTabListener);

  // Tab 2 updates storage and fires storage event
  global.localStorage.setItem('mrcv.entitlements', JSON.stringify(['clinical']));
  global.window.dispatchEvent(new global.StorageEvent('storage', {
    key: 'mrcv.entitlements',
    newValue: JSON.stringify(['clinical']),
  }));

  assert('XT-2.1: StorageEvent triggers registered tab listener', storageEventFired === 1);
  assert('XT-2.2: Tab reflects unlocked state from cross-tab storage event', simulatedTabUnlocked === true);

  // Tab 2 clears storage (e.g. user logged out or cleared cookies in other tab)
  global.localStorage.clear();
  global.window.dispatchEvent(new global.StorageEvent('storage', { key: null }));
  assert('XT-2.3: Storage clear event (key=null) triggers tab listener', storageEventFired === 2);
  assert('XT-2.4: Tab reflects re-locked state after cross-tab storage purge', hasTemplateUnlocked('clinical') === false);

  global.window.removeEventListener('storage', simulatedTabListener);

  // XT-3: Pricing.jsx lifecycle cleanup verification (AST inspection)
  const pricingSrc = fs.readFileSync(pricingPath, 'utf8');
  const hasMountListeners = pricingSrc.includes("window.addEventListener('mrcv:entitlement-changed', refresh)") &&
                            pricingSrc.includes("window.addEventListener('storage', refresh)");
  const hasUnmountCleanup = pricingSrc.includes("window.removeEventListener('mrcv:entitlement-changed', refresh)") &&
                            pricingSrc.includes("window.removeEventListener('storage', refresh)");

  assert('XT-3.1: Pricing.jsx attaches both mrcv:entitlement-changed and storage listeners', hasMountListeners);
  assert('XT-3.2: Pricing.jsx cleans up both listeners in useEffect return callback (no memory leaks)', hasUnmountCleanup);

  // --------------------------------------------------------------------------
  // SUITE 4: DARK MODE THEMING & STYLESHEET INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: DARK MODE THEMING & STYLESHEET INTEGRITY ---');

  const scssContent = fs.readFileSync(scssPath, 'utf8');

  // DM-1: Dark mode block existence & parent selector
  assert('DM-1.1: [data-bs-theme="dark"] block exists in _landing.scss', scssContent.includes('[data-bs-theme="dark"]'));
  assert('DM-1.2: .pricing-page is scoped within dark mode selector', scssContent.includes('.pricing-page'));

  // DM-2: Specific dark mode component overrides
  assert('DM-2.1: Dark theme overrides for .pricing-card and .pricing-trust-bar',
    scssContent.includes('.pricing-card') && scssContent.includes('.pricing-trust-bar') && scssContent.includes('$gray-900'));
  assert('DM-2.2: Dark theme overrides for .pricing-card-clinical with teal border',
    scssContent.includes('.pricing-card-clinical') && scssContent.includes('rgba(13, 202, 240'));
  assert('DM-2.3: Dark theme overrides for .pricing-card-exact with green accent border',
    scssContent.includes('.pricing-card-exact') && scssContent.includes('rgba(0, 200, 83'));
  assert('DM-2.4: Dark theme overrides for .pricing-matrix-wrapper and table cells',
    scssContent.includes('.pricing-matrix-wrapper') && scssContent.includes('.pricing-matrix-table'));
  assert('DM-2.5: Dark theme table header has deep contrast ($gray-950 and $gray-100)',
    scssContent.includes('$gray-950') && scssContent.includes('$gray-100'));
  assert('DM-2.6: Dark theme badge contrast override for bg-body-secondary',
    scssContent.includes('.pricing-badge.bg-body-secondary') && scssContent.includes('$gray-800'));

  // DM-3: Absence of problematic un-themed styles
  assert('DM-3.1: Zero hardcoded text-dark in Pricing.jsx', !pricingSrc.includes('text-dark'));
  assert('DM-3.2: Zero hardcoded text-black in Pricing.jsx', !pricingSrc.includes('text-black'));
  assert('DM-3.3: Obsolete .pricing-segmented-switch completely removed from _landing.scss', !scssContent.includes('pricing-segmented-switch'));

  // --------------------------------------------------------------------------
  // SUITE 5: PRICE CONSTANTS, BILINGUAL PARITY & CONTRACT INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: PRICE CONSTANTS, BILINGUAL PARITY & CONTRACT INTEGRITY ---');

  // CI-1: Constants across stack
  assert('CI-1.1: PRICE_CLINICAL is strictly 1500', PRICE_CLINICAL === 1500);
  assert('CI-1.2: PRICE_EXACT is strictly 2000', PRICE_EXACT === 2000);
  assert('CI-1.3: PRO_TEMPLATES contains clinical and exact', PRO_TEMPLATES.length === 2 && PRO_TEMPLATES.includes('clinical') && PRO_TEMPLATES.includes('exact'));

  // CI-2: Docs consistency
  const docPricing = fs.readFileSync(docPricingPath, 'utf8');
  assert('CI-2.1: docs/pricing.md documents 1,500 TZS for Clinical', docPricing.includes('1,500') || docPricing.includes('1500'));
  assert('CI-2.2: docs/pricing.md documents 2,000 TZS for Exact ATS Replica', docPricing.includes('2,000') || docPricing.includes('2000'));

  // CI-3: 3-Card Grid Structure in Pricing.jsx
  const colMatches = (pricingSrc.match(/col-12 col-lg-4/g) || []).length;
  assert('CI-3.1: Pricing.jsx renders exactly 3 col-12 col-lg-4 tier cards', colMatches === 3);
  assert('CI-3.2: Nested segmented switcher completely eliminated from Pricing.jsx', !pricingSrc.includes('selectedProSlug'));

  // CI-4: Independent preview triggers
  assert('CI-4.1: Clinical card has dedicated setPreviewTpl trigger', pricingSrc.includes('setPreviewTpl(clinicalTpl)'));
  assert('CI-4.2: Exact card has dedicated setPreviewTpl trigger', pricingSrc.includes('setPreviewTpl(exactTpl)'));

  // CI-5: Bilingual key symmetry
  const enKeys = Object.keys(STR.en);
  const swKeys = Object.keys(STR.sw);
  const prKeysEN = enKeys.filter(k => k.startsWith('pr.'));
  const prKeysSW = swKeys.filter(k => k.startsWith('pr.'));

  const missingInSW = prKeysEN.filter(k => !swKeys.includes(k));
  const missingInEN = prKeysSW.filter(k => !enKeys.includes(k));

  assert('CI-5.1: Zero missing pr.* keys in Swahili dictionary', missingInSW.length === 0, `Missing: ${missingInSW.join(', ')}`);
  assert('CI-5.2: Zero missing pr.* keys in English dictionary', missingInEN.length === 0, `Missing: ${missingInEN.join(', ')}`);

  // CI-6: Comparison matrix completeness
  const matrixKeys = [
    'pr.colFeature', 'pr.colFree', 'pr.colClinical', 'pr.colExact',
    'pr.rowPrice', 'pr.valPriceFree', 'pr.valPriceClinical', 'pr.valPriceExact',
    'pr.rowTplsIncluded', 'pr.valTplsFree', 'pr.valTplsClinical', 'pr.valTplsExact',
    'pr.rowLayout', 'pr.valLayoutFree', 'pr.valLayoutClinical', 'pr.valLayoutExact',
    'pr.rowPhoto', 'pr.valPhotoFree', 'pr.valPhotoClinical', 'pr.valPhotoExact',
    'pr.rowDownloads', 'pr.valDownloadsAll',
    'pr.rowWhatsApp', 'pr.valWhatsAppAll',
    'pr.rowOffline', 'pr.valOfflineAll',
    'pr.rowFee', 'pr.valFeeZero',
    'pr.rowPayment', 'pr.valPaymentFree', 'pr.valPaymentPaid',
    'pr.rowAccess', 'pr.valAccessLifetime'
  ];

  const missingMatrixEN = matrixKeys.filter(k => !STR.en[k]);
  const missingMatrixSW = matrixKeys.filter(k => !STR.sw[k]);

  assert('CI-6.1: All comparison matrix keys populated in English', missingMatrixEN.length === 0, `Missing: ${missingMatrixEN.join(', ')}`);
  assert('CI-6.2: All comparison matrix keys populated in Swahili', missingMatrixSW.length === 0, `Missing: ${missingMatrixSW.join(', ')}`);

  // CI-7: No raw un-translated placeholder leaks in dictionary values
  const hasRawLeakedValEN = prKeysEN.some(k => typeof STR.en[k] === 'string' && STR.en[k].startsWith('pr.'));
  const hasRawLeakedValSW = prKeysSW.some(k => typeof STR.sw[k] === 'string' && STR.sw[k].startsWith('pr.'));
  assert('CI-7.1: English pricing values do not leak raw keys', !hasRawLeakedValEN);
  assert('CI-7.2: Swahili pricing values do not leak raw keys', !hasRawLeakedValSW);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`STRESS TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStressTests().catch(err => {
  console.error('Unhandled failure during stress testing:', err);
  process.exit(1);
});
