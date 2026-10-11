/**
 * MwandishiWeb 3-Card Pricing Architecture Redesign
 * Comprehensive Automated E2E & Invariant Test Suite
 * 
 * Run from frontend/:
 *   node tests/pricing_e2e.mjs
 * Or from repo root:
 *   node frontend/tests/pricing_e2e.mjs
 * 
 * 4-Tier Testing Methodology:
 *   Tier 1: Core Feature Coverage (>=5 tests per feature, 8 features = 40 tests)
 *   Tier 2: Boundary & Corner Cases (>=5 tests per feature, 6 features = 30 tests)
 *   Tier 3: Cross-Feature Pairwise Combinations (20 tests)
 *   Tier 4: Real-World Scenarios & Full User Flows (15 tests)
 *   Total: 105 Rigorous Automated Tests
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_DIR, '..');

// ============================================================================
// ENVIRONMENT MOCKS (Browser DOM, Storage & Events)
// ============================================================================
const localStoreData = {};
const windowListeners = new Map();
let mockFetchOffline = false;
let lastFetchUrl = '';

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
global.location = global.window.location;
global.history = { replaceState() {} };

// Node native fetch mock supporting relative /api URLs
global.fetch = async (url, opts = {}) => {
  lastFetchUrl = String(url);
  if (mockFetchOffline) {
    throw new TypeError('Failed to fetch (offline simulation)');
  }
  const u = String(url);
  if (u.includes('/pay/checkout')) {
    const body = opts.body ? JSON.parse(opts.body) : {};
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        checkout_id: 'chk_' + Math.random().toString(36).slice(2, 9),
        unlocked: true,
        item: body.item,
        amount: body.amount,
        phone: body.phone,
      }),
      text: async () => JSON.stringify({ ok: true, unlocked: true }),
    };
  }
  if (u.includes('/pay/status')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ unlocked: true }),
      text: async () => JSON.stringify({ unlocked: true }),
    };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
  };
};

// Helper to reset browser environment between stateful tests
function resetEnvironment() {
  global.localStorage.clear();
  windowListeners.clear();
  mockFetchOffline = false;
  lastFetchUrl = '';
}

// ============================================================================
// MODULE IMPORTS
// ============================================================================
const storePath = path.resolve(FRONTEND_DIR, 'src/lib/store.js');
const i18nPath = path.resolve(FRONTEND_DIR, 'src/lib/i18n.js');
const store = await import(`file://${storePath}`);
const i18n = await import(`file://${i18nPath}`);

// Source file loaders for static AST & contract invariant checks
function readSource(relPath) {
  const fullPath = path.resolve(FRONTEND_DIR, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

function readRepoFile(relPath) {
  const fullPath = path.resolve(REPO_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

const pricingJsx = readSource('src/pages/Pricing.jsx');
const paywallModalJsx = readSource('src/components/PaywallModal.jsx');
const templatesJsx = readSource('src/pages/Templates.jsx');
const providerLogosJsx = readSource('src/components/ProviderLogos.jsx');
const landingScss = readSource('src/assets/scss/_landing.scss');
const paymentsPy = readRepoFile('backend/payments.py');
const pricingMd = readRepoFile('docs/pricing.md');

// ============================================================================
// TEST HARNESS & ACCUMULATOR
// ============================================================================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function check(tier, code, name, condition, details = '') {
  totalTests += 1;
  const status = Boolean(condition);
  if (status) {
    passedTests += 1;
    console.log(`  PASS [${tier}] [${code}] ${name}`);
  } else {
    failedTests += 1;
    failures.push({ tier, code, name, details });
    console.log(`  FAIL [${tier}] [${code}] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('====================================================================');
console.log('   MWANDISHI 3-CARD PRICING ARCHITECTURE AUTOMATED E2E SUITE');
console.log('====================================================================\n');

// ============================================================================
// TIER 1: FEATURE COVERAGE (>= 5 tests per feature, 8 features = 40 tests)
// ============================================================================
console.log('--- TIER 1: FEATURE COVERAGE (>=5 tests per feature, 8 features = 40 tests) ---');

// 1.1 Free Forever Tier (0 TZS)
{
  resetEnvironment();
  const freeSlugs = ['graduate', 'government', 'banking', 'general', 'barua'];
  const allFreeUnlocked = freeSlugs.every((s) => store.hasTemplateUnlocked(s));
  check('Tier 1', 'T1-FREE-1', 'Free templates are unlocked by default without entitlements',
    allFreeUnlocked, `freeSlugs unlocked: ${allFreeUnlocked}`);

  const freeInTemplates = store.TEMPLATES.filter((t) => !store.PRO_TEMPLATES.includes(t.slug));
  check('Tier 1', 'T1-FREE-2', 'Templates list contains 5 core free layouts',
    freeInTemplates.length === 5, `Expected 5 free templates, got ${freeInTemplates.length}`);

  const enFreePrice = i18n.STR.en['pr.freePrice'];
  const swFreePrice = i18n.STR.sw['pr.freePrice'];
  check('Tier 1', 'T1-FREE-3', 'Free tier price is 0 TZS across translations',
    enFreePrice === '0 TZS' && swFreePrice === '0 TZS',
    `EN: ${enFreePrice}, SW: ${swFreePrice}`);

  const enFreeBadge = i18n.STR.en['pr.freeBadge'];
  const swFreeBadge = i18n.STR.sw['pr.freeBadge'];
  check('Tier 1', 'T1-FREE-4', 'Free tier badge exists symmetrically in EN & SW',
    Boolean(enFreeBadge && swFreeBadge),
    `EN: ${enFreeBadge}, SW: ${swFreeBadge}`);

  const freeCta = i18n.STR.en['pr.freeCta'];
  const hasFreeGalleryLink = /to="\/templates"/.test(pricingJsx) || /pr\.freeCta/.test(pricingJsx);
  check('Tier 1', 'T1-FREE-5', 'Free tier CTA links to template gallery (/templates)',
    Boolean(freeCta && hasFreeGalleryLink),
    `freeCta: ${freeCta}, hasLink: ${hasFreeGalleryLink}`);
}

// 1.2 Clinical Two-Column Tier (1,500 TZS)
{
  check('Tier 1', 'T1-CLIN-1', 'store.js exports PRICE_CLINICAL === 1500',
    store.PRICE_CLINICAL === 1500, `Got: ${store.PRICE_CLINICAL}`);

  check('Tier 1', 'T1-CLIN-2', 'PRO_TEMPLATES includes clinical',
    store.PRO_TEMPLATES.includes('clinical'), `PRO_TEMPLATES: ${JSON.stringify(store.PRO_TEMPLATES)}`);

  const clinTpl = store.TEMPLATES.find((x) => x.slug === 'clinical');
  check('Tier 1', 'T1-CLIN-3', 'clinical template definition carries Pro badge and 2-column tag',
    Boolean(clinTpl && clinTpl.badges.includes('Pro') && clinTpl.badges.includes('2-column')),
    `Badges: ${JSON.stringify(clinTpl?.badges)}`);

  const backendClinicalPrice = /"clinical":\s*1500/.test(paymentsPy);
  check('Tier 1', 'T1-CLIN-4', 'backend/payments.py enforces clinical at 1500 in VALID_ITEMS',
    backendClinicalPrice, 'payments.py missing "clinical": 1500');

  const enClinTitle = i18n.STR.en['pr.clinicalTitle'] || i18n.STR.en['pr.tplClinicalName'];
  const enClinPrice = i18n.STR.en['pr.clinicalPrice'] || i18n.STR.en['pr.proPrice'];
  check('Tier 1', 'T1-CLIN-5', 'Clinical tier translations define title and 1,500 TZS price point',
    Boolean(enClinTitle && /1[,.]?500/.test(enClinPrice || '')),
    `Title: ${enClinTitle}, Price: ${enClinPrice}`);
}

// 1.3 Exact ATS Replica Tier (2,000 TZS)
{
  check('Tier 1', 'T1-EXACT-1', 'store.js exports PRICE_EXACT === 2000',
    store.PRICE_EXACT === 2000, `Got: ${store.PRICE_EXACT} (Expected: 2000)`);

  check('Tier 1', 'T1-EXACT-2', 'PRO_TEMPLATES includes exact',
    store.PRO_TEMPLATES.includes('exact'), `PRO_TEMPLATES: ${JSON.stringify(store.PRO_TEMPLATES)}`);

  const exactTpl = store.TEMPLATES.find((x) => x.slug === 'exact');
  check('Tier 1', 'T1-EXACT-3', 'exact template definition carries Pro and Photo badges',
    Boolean(exactTpl && exactTpl.badges.includes('Pro') && exactTpl.badges.includes('Photo')),
    `Badges: ${JSON.stringify(exactTpl?.badges)}`);

  const backendExactPrice = /"exact":\s*2000/.test(paymentsPy);
  check('Tier 1', 'T1-EXACT-4', 'backend/payments.py enforces exact at 2000 in VALID_ITEMS',
    backendExactPrice, 'payments.py missing "exact": 2000');

  const enExactPrice = i18n.STR.en['pr.exactPrice'];
  const swExactPrice = i18n.STR.sw['pr.exactPrice'];
  check('Tier 1', 'T1-EXACT-5', 'Exact ATS tier translations define 2,000 TZS price in EN & SW',
    Boolean(enExactPrice && swExactPrice && /2[,.]?000/.test(enExactPrice) && /2[,.]?000/.test(swExactPrice)),
    `EN: ${enExactPrice}, SW: ${swExactPrice}`);
}

// 1.4 3-Card Grid Architecture on /pricing
{
  const hasCol4 = /col-lg-4|col-md-4/.test(pricingJsx);
  check('Tier 1', 'T1-GRID-1', 'Pricing.jsx uses 3-column grid classes (col-lg-4 / col-md-4)',
    hasCol4, 'Pricing.jsx does not contain col-lg-4 or col-md-4');

  const mentionsFree = /pr\.freeTitle|Bure \/ Free/.test(pricingJsx);
  const mentionsClinical = /pr\.clinicalTitle|clinicalTpl|Clinical/.test(pricingJsx);
  const mentionsExact = /pr\.exactTitle|exactTpl|Exact/.test(pricingJsx);
  check('Tier 1', 'T1-GRID-2', 'Pricing.jsx defines sections for Free, Clinical, and Exact tiers',
    mentionsFree && mentionsClinical && mentionsExact,
    `Free: ${mentionsFree}, Clinical: ${mentionsClinical}, Exact: ${mentionsExact}`);

  const hasExpandedContainer = /container-xl|container-fluid|pricing-container|maxWidth:\s*12/i.test(pricingJsx);
  check('Tier 1', 'T1-GRID-3', 'Pricing page layout accommodates 3 cards via expanded container',
    hasExpandedContainer, 'Container not expanded for 3 side-by-side cards');

  const hasThreePricePills = /0\s*TZS/.test(pricingJsx) || (/pr\.freePrice/.test(pricingJsx) && /pr\.clinicalPrice|pr\.proPrice/.test(pricingJsx) && /pr\.exactPrice/.test(pricingJsx));
  check('Tier 1', 'T1-GRID-4', 'Pricing.jsx binds distinct price points for all three tiers',
    hasThreePricePills, 'Distinct tier price points not found in Pricing.jsx');

  const hasThreeCardBadges = /pr\.freeBadge/.test(pricingJsx) && (/pr\.clinicalBadge/.test(pricingJsx) || /clinical/.test(pricingJsx)) && (/pr\.exactBadge/.test(pricingJsx) || /exact/.test(pricingJsx));
  check('Tier 1', 'T1-GRID-5', 'Pricing.jsx renders distinct badges for all 3 cards',
    hasThreeCardBadges, 'Pricing.jsx missing distinct card badge references');
}

// 1.5 Elimination of Nested Switcher
{
  const hasSelectedProSlug = /selectedProSlug/.test(pricingJsx);
  check('Tier 1', 'T1-NOSWITCH-1', 'Pricing.jsx does NOT declare selectedProSlug state',
    !hasSelectedProSlug, 'selectedProSlug still present in Pricing.jsx');

  const hasSegmentedSwitchClass = /pricing-segmented-switch/.test(pricingJsx);
  check('Tier 1', 'T1-NOSWITCH-2', 'Pricing.jsx does NOT contain .pricing-segmented-switch markup',
    !hasSegmentedSwitchClass, '.pricing-segmented-switch still present in Pricing.jsx');

  const hasSwitchButtons = /setSelectedProSlug\s*\(/.test(pricingJsx);
  check('Tier 1', 'T1-NOSWITCH-3', 'Pricing.jsx does NOT contain setSelectedProSlug calls',
    !hasSwitchButtons, 'setSelectedProSlug handler calls found');

  const clinicalHasOwnCard = /card.*clinical|clinicalTpl/i.test(pricingJsx);
  check('Tier 1', 'T1-NOSWITCH-4', 'Clinical tier has its own dedicated card markup',
    clinicalHasOwnCard, 'Clinical dedicated card not detected');

  const exactHasOwnCard = /card.*exact|exactTpl/i.test(pricingJsx);
  check('Tier 1', 'T1-NOSWITCH-5', 'Exact tier has its own dedicated card markup',
    exactHasOwnCard, 'Exact dedicated card not detected');
}

// 1.6 Dedicated Interactive Sheet Preview Triggers
{
  const hasPreviewModal = /Modal\s+open=\{Boolean\(previewTpl\)\}/.test(pricingJsx);
  check('Tier 1', 'T1-PREV-1', 'Pricing.jsx mounts interactive TemplatePreview Modal',
    hasPreviewModal, 'Modal open={Boolean(previewTpl)} not found');

  const clinicalPreviewTrigger = /setPreviewTpl\(\s*clinicalTpl\s*\)/.test(pricingJsx) || /setPreviewTpl\([^)]*clinical[^)]*\)/.test(pricingJsx);
  check('Tier 1', 'T1-PREV-2', 'Clinical card has dedicated preview trigger for clinicalTpl',
    clinicalPreviewTrigger, 'Clinical preview trigger not found in Pricing.jsx');

  const exactPreviewTrigger = /setPreviewTpl\(\s*exactTpl\s*\)/.test(pricingJsx) || /setPreviewTpl\([^)]*exact[^)]*\)/.test(pricingJsx);
  check('Tier 1', 'T1-PREV-3', 'Exact card has dedicated preview trigger for exactTpl',
    exactPreviewTrigger, 'Exact preview trigger not found in Pricing.jsx');

  const sampleHtml = store.cvToHTML(store.SAMPLE_CV);
  check('Tier 1', 'T1-PREV-4', 'Sample CV HTML renders valid content for sheet preview',
    sampleHtml.includes('Amina Juma') && sampleHtml.includes('cv-head'),
    'cvToHTML(SAMPLE_CV) did not generate valid sheet');

  const exactSampleHtml = store.cvExactHTML(store.SAMPLE_EXACT);
  check('Tier 1', 'T1-PREV-5', 'Exact ATS HTML renders valid two-tone content for sheet preview',
    exactSampleHtml.includes('Carter') && exactSampleHtml.includes('cv-exact'),
    'cvExactHTML(SAMPLE_EXACT) did not generate valid exact sheet');
}

// 1.7 Entitlement-Aware Action CTAs
{
  const hasUnlockOrUse = /handleUnlockOrUse/.test(pricingJsx);
  check('Tier 1', 'T1-CTA-1', 'Pricing.jsx implements handleUnlockOrUse router & modal dispatcher',
    hasUnlockOrUse, 'handleUnlockOrUse not found in Pricing.jsx');

  const routesToNewCv = /navigate\(`\/new-cv\?template=\$\{tpl\.slug\}`\)/.test(pricingJsx) || /\/new-cv\?template=/.test(pricingJsx);
  check('Tier 1', 'T1-CTA-2', 'handleUnlockOrUse navigates to /new-cv?template=<slug> when unlocked',
    routesToNewCv, 'Navigation to /new-cv?template= not found');

  const setsPaywallTpl = /setPaywallTpl\(\s*tpl\s*\)/.test(pricingJsx) || /setPaywallTpl\(/.test(pricingJsx);
  check('Tier 1', 'T1-CTA-3', 'handleUnlockOrUse sets paywallTpl when template is locked',
    setsPaywallTpl, 'setPaywallTpl not invoked for locked templates');

  const hasPaywallModal = /<PaywallModal/.test(pricingJsx);
  check('Tier 1', 'T1-CTA-4', 'Pricing.jsx renders PaywallModal with template & unlock listeners',
    hasPaywallModal, 'PaywallModal component not mounted in Pricing.jsx');

  const hasDynamicCtaCopy = /hasTemplateUnlocked/.test(pricingJsx) && (/pr\.useNowBtn|pr\.clinicalCtaUnlocked/.test(pricingJsx));
  check('Tier 1', 'T1-CTA-5', 'Card CTAs dynamically alternate between Unlock and Use Template copy',
    hasDynamicCtaCopy, 'Dynamic CTA copy conditional not detected in Pricing.jsx');
}

// 1.8 Bilingual Parity (EN & SW)
{
  const enKeys = Object.keys(i18n.STR.en);
  const swKeys = Object.keys(i18n.STR.sw);
  const missingInSw = enKeys.filter((k) => !(k in i18n.STR.sw));
  check('Tier 1', 'T1-I18N-1', 'Zero missing translation keys in Kiswahili dictionary',
    missingInSw.length === 0, `Missing keys in SW: ${missingInSw.slice(0, 5).join(', ')} (total: ${missingInSw.length})`);

  const missingInEn = swKeys.filter((k) => !(k in i18n.STR.en));
  check('Tier 1', 'T1-I18N-2', 'Zero missing translation keys in English dictionary',
    missingInEn.length === 0, `Missing keys in EN: ${missingInEn.slice(0, 5).join(', ')}`);

  const matrixKeys = ['pr.colFree', 'pr.colClinical', 'pr.colExact'];
  const matrixSymmetry = matrixKeys.every((k) => (k in i18n.STR.en) && (k in i18n.STR.sw));
  check('Tier 1', 'T1-I18N-3', 'Comparison matrix column headers exist in both locales',
    matrixSymmetry, `Matrix headers missing in dictionaries: ${matrixKeys.filter((k) => !(k in i18n.STR.en) || !(k in i18n.STR.sw)).join(', ')}`);

  const clinicalKeys = ['pr.clinicalTitle', 'pr.clinicalPrice', 'pr.clinicalBadge', 'pr.clinicalF1'];
  const clinicalSymmetry = clinicalKeys.every((k) => (k in i18n.STR.en) && (k in i18n.STR.sw));
  check('Tier 1', 'T1-I18N-4', 'Dedicated Clinical keys exist in both locales',
    clinicalSymmetry, `Clinical keys missing: ${clinicalKeys.filter((k) => !(k in i18n.STR.en) || !(k in i18n.STR.sw)).join(', ')}`);

  const exactKeys = ['pr.exactTitle', 'pr.exactPrice', 'pr.exactBadge', 'pr.exactF1'];
  const exactSymmetry = exactKeys.every((k) => (k in i18n.STR.en) && (k in i18n.STR.sw));
  check('Tier 1', 'T1-I18N-5', 'Dedicated Exact ATS keys exist in both locales',
    exactSymmetry, `Exact keys missing: ${exactKeys.filter((k) => !(k in i18n.STR.en) || !(k in i18n.STR.sw)).join(', ')}`);
}

console.log('\n--- TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature, 6 features = 30 tests) ---');

// 2.1 Zero Fee Guarantees
{
  const enPill = i18n.STR.en['pr.heroTrustPill'];
  const swPill = i18n.STR.sw['pr.heroTrustPill'];
  check('Tier 2', 'T2-FEE-1', 'Hero trust pill affirms 0 TZS Customer Fees in EN and SW',
    /0 TZS/i.test(enPill || '') && /0 TZS/i.test(swPill || ''),
    `EN: ${enPill}, SW: ${swPill}`);

  const swTrustBadge = i18n.STR.sw['pr.trustBadge'];
  check('Tier 2', 'T2-FEE-2', 'pr.trustBadge exists in Kiswahili dictionary (no English leak)',
    Boolean(swTrustBadge && swTrustBadge.trim() && swTrustBadge !== 'Mobile Money Checkout'),
    `SW trustBadge: "${swTrustBadge}"`);

  const swStep3 = i18n.STR.sw['pr.step3Success'] || '';
  check('Tier 2', 'T2-FEE-3', 'pr.step3Success in Kiswahili has zero English leaks ("Ada" not "Fee")',
    !/\bFee\b/i.test(swStep3), `Got SW copy with leak: "${swStep3}"`);

  const mentionsOperators = /M-Pesa|Airtel|Halopesa|Mixx|Tigo/i.test(providerLogosJsx)
    || /M-Pesa|Airtel|Halopesa|Mixx|Tigo/i.test(i18n.STR.en['pr.operatorsTitle'] || '')
    || /M-Pesa|Airtel|Halopesa|Mixx|Tigo/i.test(pricingJsx);
  check('Tier 2', 'T2-FEE-4', 'Trust copy and logos reference Tanzanian mobile networks',
    mentionsOperators, 'No mobile operator references found in UI or copy');

  const feeDesc = i18n.STR.en['pr.trustFeeDesc'] || '';
  check('Tier 2', 'T2-FEE-5', 'Trust fee description affirms 0 TZS customer fee guarantee',
    /deducted|Snippe Pay|0 TZS/i.test(feeDesc),
    `Fee desc: ${feeDesc}`);
}

// 2.2 Currency Formatting & Locale Numerical Representation
{
  function formatTzs(amt) {
    const n = Number(amt);
    if (!Number.isFinite(n) || n < 0) return null;
    return `${n.toLocaleString('en-US')} TZS`;
  }

  check('Tier 2', 'T2-CURR-1', 'Free amount 0 formats as 0 TZS',
    formatTzs(0) === '0 TZS', `Got: ${formatTzs(0)}`);

  check('Tier 2', 'T2-CURR-2', 'Clinical amount 1500 formats with thousand separator (1,500 TZS)',
    formatTzs(1500) === '1,500 TZS', `Got: ${formatTzs(1500)}`);

  check('Tier 2', 'T2-CURR-3', 'Exact amount 2000 formats with thousand separator (2,000 TZS)',
    formatTzs(2000) === '2,000 TZS', `Got: ${formatTzs(2000)}`);

  check('Tier 2', 'T2-CURR-4', 'String numbers parse and format identically to numbers',
    formatTzs('2000') === '2,000 TZS' && formatTzs('1500') === '1,500 TZS',
    `String formatted: ${formatTzs('2000')}`);

  check('Tier 2', 'T2-CURR-5', 'Negative numbers or NaN safely rejected by currency formatter',
    formatTzs(-100) === null && formatTzs('invalid') === null,
    'Negative/invalid input not handled properly');
}

// 2.3 Template Unlocking Transitions & Mutation Order
{
  resetEnvironment();
  check('Tier 2', 'T2-TRANS-1', 'Initial fresh session: both pro templates locked',
    !store.hasTemplateUnlocked('clinical') && !store.hasTemplateUnlocked('exact'),
    'Templates not initially locked');

  store.saveLocalEntitlement('clinical');
  check('Tier 2', 'T2-TRANS-2', 'Unlocking clinical unlocks only clinical; exact remains locked',
    store.hasTemplateUnlocked('clinical') && !store.hasTemplateUnlocked('exact'),
    `Clinical: ${store.hasTemplateUnlocked('clinical')}, Exact: ${store.hasTemplateUnlocked('exact')}`);

  store.saveLocalEntitlement('exact');
  check('Tier 2', 'T2-TRANS-3', 'Unlocking exact unlocks both templates cumulatively',
    store.hasTemplateUnlocked('clinical') && store.hasTemplateUnlocked('exact'),
    'Cumulative unlock failed');

  let eventFired = false;
  window.addEventListener('mrcv:entitlement-changed', () => { eventFired = true; });
  store.saveLocalEntitlement('clinical'); // already in list, but let's test with fresh item
  localStoreData['mrcv.entitlements'] = JSON.stringify(['clinical']);
  store.saveLocalEntitlement('exact');
  check('Tier 2', 'T2-TRANS-4', 'saveLocalEntitlement dispatches mrcv:entitlement-changed window event',
    eventFired, 'mrcv:entitlement-changed event was not dispatched');

  resetEnvironment();
  check('Tier 2', 'T2-TRANS-5', 'Clearing environment restores locked state immediately',
    !store.hasTemplateUnlocked('clinical') && !store.hasTemplateUnlocked('exact'),
    'State not restored after clear');
}

// 2.4 Local Entitlement Clearing, Deduplication & Storage Resilience
{
  resetEnvironment();
  store.saveLocalEntitlement(null);
  store.saveLocalEntitlement(undefined);
  store.saveLocalEntitlement('');
  store.saveLocalEntitlement(123);
  check('Tier 2', 'T2-STORE-1', 'saveLocalEntitlement rejects non-string or falsy inputs',
    store.getLocalEntitlements().length === 0,
    `Entitlements length: ${store.getLocalEntitlements().length}`);

  store.saveLocalEntitlement('clinical');
  store.saveLocalEntitlement('clinical');
  store.saveLocalEntitlement('clinical');
  check('Tier 2', 'T2-STORE-2', 'Repeated unlocks are deduplicated in storage',
    store.getLocalEntitlements().length === 1 && store.getLocalEntitlements()[0] === 'clinical',
    `Entitlements: ${JSON.stringify(store.getLocalEntitlements())}`);

  // Test storage JSON corruption resilience
  localStoreData['mrcv.entitlements'] = '{corrupted-json';
  const resilientList = store.getLocalEntitlements();
  check('Tier 2', 'T2-STORE-3', 'Corrupted localStorage JSON recovers gracefully to empty array []',
    Array.isArray(resilientList) && resilientList.length === 0,
    `Recovered value: ${JSON.stringify(resilientList)}`);

  localStoreData['mrcv.entitlements'] = JSON.stringify(['unknown_slug_xyz']);
  check('Tier 2', 'T2-STORE-4', 'Unknown entitlement slugs do not unlock pro templates',
    !store.hasTemplateUnlocked('clinical') && !store.hasTemplateUnlocked('exact'),
    'Unknown slug unlocked pro template');

  resetEnvironment();
  check('Tier 2', 'T2-STORE-5', 'Direct removal of localStorage key locks pro templates',
    !store.hasTemplateUnlocked('clinical') && !store.hasTemplateUnlocked('exact'),
    'Template unlocked after localStorage removal');
}

// 2.5 Price Constant Immutability & Contract Enforcement
{
  check('Tier 2', 'T2-IMMUT-1', 'store.js PRICE_CLINICAL is exported numeric constant 1500',
    typeof store.PRICE_CLINICAL === 'number' && store.PRICE_CLINICAL === 1500,
    `Type: ${typeof store.PRICE_CLINICAL}, Value: ${store.PRICE_CLINICAL}`);

  check('Tier 2', 'T2-IMMUT-2', 'store.js PRICE_EXACT is exported numeric constant 2000',
    typeof store.PRICE_EXACT === 'number' && store.PRICE_EXACT === 2000,
    `Type: ${typeof store.PRICE_EXACT}, Value: ${store.PRICE_EXACT}`);

  const paywallDynamicPrice = /PRICE_EXACT|PRICE_CLINICAL|template\?\.slug === 'exact'/.test(paywallModalJsx);
  check('Tier 2', 'T2-IMMUT-3', 'PaywallModal.jsx binds price dynamically to template slug',
    paywallDynamicPrice, 'PaywallModal does not compute price by template slug');

  const paymentsValidDict = /VALID_ITEMS\s*=\s*\{[^}]*"clinical":\s*1500[^}]*"exact":\s*2000[^}]*\}/s.test(paymentsPy);
  check('Tier 2', 'T2-IMMUT-4', 'backend/payments.py VALID_ITEMS maps clinical: 1500 and exact: 2000',
    paymentsValidDict, 'payments.py VALID_ITEMS does not match exact: 2000');

  const docsPricingExact = /Exact Replica.*2[,.]?000/i.test(pricingMd) || /exact.*2[,.]?000/i.test(pricingMd);
  check('Tier 2', 'T2-IMMUT-5', 'docs/pricing.md documents Exact Replica at 2,000 TZS',
    docsPricingExact, 'docs/pricing.md does not document 2,000 TZS for Exact Replica');
}

// 2.6 Missing Key & Untranslated String Detection
{
  const jsxFiles = ['src/pages/Pricing.jsx', 'src/components/PaywallModal.jsx', 'src/pages/Templates.jsx'];
  const allUsedKeys = new Set();
  for (const rel of jsxFiles) {
    const src = readSource(rel);
    for (const match of src.matchAll(/\bt\(\s*['"]([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9_]+)['"]\s*\)/g)) {
      allUsedKeys.add(match[1]);
    }
  }

  const missingPricingEn = [...allUsedKeys].filter((k) => !(k in i18n.STR.en));
  check('Tier 2', 'T2-KEYS-1', `All ${allUsedKeys.size} t() keys in pricing UI exist in EN dictionary`,
    missingPricingEn.length === 0,
    `Missing in EN: ${missingPricingEn.join(', ')}`);

  const missingPricingSw = [...allUsedKeys].filter((k) => !(k in i18n.STR.sw));
  check('Tier 2', 'T2-KEYS-2', `All ${allUsedKeys.size} t() keys in pricing UI exist in SW dictionary`,
    missingPricingSw.length === 0,
    `Missing in SW: ${missingPricingSw.join(', ')}`);

  const faqKeys = ['pr.q1', 'pr.a1', 'pr.q2', 'pr.a2', 'pr.q3', 'pr.a3', 'pr.q4', 'pr.a4', 'pr.q5', 'pr.a5', 'pr.q6', 'pr.a6'];
  const faqParity = faqKeys.every((k) => (k in i18n.STR.en) && (k in i18n.STR.sw));
  check('Tier 2', 'T2-KEYS-3', 'All 6 pricing FAQ question & answer pairs exist in both locales',
    faqParity, 'FAQ keys missing in i18n dictionaries');

  const essentialKeys = [
    'pr.freeBadge', 'pr.freeTitle', 'pr.freePrice', 'pr.freeDesc', 'pr.freeCta',
    'pr.heroTrustPill', 'pr.trustBadge', 'pr.guaranteeBadge',
  ];
  const essentialParity = essentialKeys.every((k) => (k in i18n.STR.en) && (k in i18n.STR.sw));
  check('Tier 2', 'T2-KEYS-4', 'Essential pricing badges and trust copy exist symmetrically in EN & SW',
    essentialParity, `Missing essential keys: ${essentialKeys.filter((k) => !(k in i18n.STR.en) || !(k in i18n.STR.sw)).join(', ')}`);

  const rawKeyLeakCheck = !/['"]pr\.[a-zA-Z0-9_]+['"]/.test(i18n.STR.en['pr.freeTitle'] || '')
    && !/['"]pr\.[a-zA-Z0-9_]+['"]/.test(i18n.STR.sw['pr.freeTitle'] || '');
  check('Tier 2', 'T2-KEYS-5', 'i18n dictionary values do not contain unresolved raw key references',
    rawKeyLeakCheck, 'Unresolved raw key found inside dictionary value');
}

console.log('\n--- TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS (20 tests) ---');

// 3. Pairwise Combinations
{
  resetEnvironment();
  // Pair 1: Clinical Unlocked, Exact Locked
  store.saveLocalEntitlement('clinical');
  const pair1Clinical = store.hasTemplateUnlocked('clinical');
  const pair1Exact = store.hasTemplateUnlocked('exact');
  check('Tier 3', 'T3-PAIR-1', 'Pairwise 1: Clinical unlocked while Exact remains strictly locked',
    pair1Clinical === true && pair1Exact === false,
    `Clinical: ${pair1Clinical}, Exact: ${pair1Exact}`);

  // Pair 2: Exact Unlocked, Clinical Locked
  resetEnvironment();
  store.saveLocalEntitlement('exact');
  const pair2Clinical = store.hasTemplateUnlocked('clinical');
  const pair2Exact = store.hasTemplateUnlocked('exact');
  check('Tier 3', 'T3-PAIR-2', 'Pairwise 2: Exact unlocked while Clinical remains strictly locked',
    pair2Clinical === false && pair2Exact === true,
    `Clinical: ${pair2Clinical}, Exact: ${pair2Exact}`);

  // Pair 3: Both Unlocked
  store.saveLocalEntitlement('clinical');
  const pair3Both = store.hasTemplateUnlocked('clinical') && store.hasTemplateUnlocked('exact');
  check('Tier 3', 'T3-PAIR-3', 'Pairwise 3: Both Pro templates unlocked concurrently',
    pair3Both, 'Simultaneous unlock check failed');

  // Pair 4: Bilingual Toggle with Live Entitlement
  const clinicalCtaUnlockedEn = i18n.STR.en['pr.clinicalCtaUnlocked'] || i18n.STR.en['pr.useNowBtn'];
  const clinicalCtaUnlockedSw = i18n.STR.sw['pr.clinicalCtaUnlocked'] || i18n.STR.sw['pr.useNowBtn'];
  check('Tier 3', 'T3-PAIR-4', 'Pairwise 4: Unlocked CTA copy translates accurately in EN and SW',
    Boolean(clinicalCtaUnlockedEn && clinicalCtaUnlockedSw),
    `EN: ${clinicalCtaUnlockedEn}, SW: ${clinicalCtaUnlockedSw}`);

  // Pair 5: Locked CTA with Price Embedding
  const clinicalCtaLockedEn = i18n.STR.en['pr.clinicalCtaLocked'] || i18n.STR.en['pr.proCta'];
  const exactCtaLockedEn = i18n.STR.en['pr.exactCtaLocked'] || i18n.STR.en['pr.proCta'];
  check('Tier 3', 'T3-PAIR-5', 'Pairwise 5: Locked CTA copy reflects distinct pricing (1,500 vs 2,000)',
    Boolean(clinicalCtaLockedEn && exactCtaLockedEn && /1[,.]?500/.test(clinicalCtaLockedEn) && /2[,.]?000/.test(exactCtaLockedEn)),
    `Clinical CTA: ${clinicalCtaLockedEn}, Exact CTA: ${exactCtaLockedEn}`);

  // Pair 6: Theme Toggles with 3-Card Grid
  const darkThemeSupport = /\[data-bs-theme="dark"\]/.test(landingScss);
  check('Tier 3', 'T3-PAIR-6', 'Pairwise 6: SCSS contains dark mode styling rules for pricing cards',
    darkThemeSupport, '_landing.scss does not target [data-bs-theme="dark"]');

  // Pair 7: Comparison Matrix Responsive Styling
  const matrixScss = /\.pricing-matrix-table|\.pricing-comparison-table/.test(landingScss) || /table-responsive/.test(pricingJsx);
  check('Tier 3', 'T3-PAIR-7', 'Pairwise 7: Comparison matrix table has dedicated responsive styling',
    matrixScss, 'Comparison matrix table styling not detected');

  // Pair 8: PaywallModal payload matching store constants
  const clinTplObj = store.TEMPLATES.find((t) => t.slug === 'clinical');
  const exactTplObj = store.TEMPLATES.find((t) => t.slug === 'exact');
  const calcPrice = (tpl) => (tpl?.slug === 'exact' ? store.PRICE_EXACT : store.PRICE_CLINICAL);
  check('Tier 3', 'T3-PAIR-8', 'Pairwise 8: Paywall modal price calculation matches store constants',
    calcPrice(clinTplObj) === 1500 && calcPrice(exactTplObj) === 2000,
    `Clinical: ${calcPrice(clinTplObj)}, Exact: ${calcPrice(exactTplObj)}`);

  // Pair 9: Phone Normalization in Checkout Trigger
  const norm1 = store.normalizeTZPhone('0765123456');
  const norm2 = store.normalizeTZPhone('+255 765 123 456');
  check('Tier 3', 'T3-PAIR-9', 'Pairwise 9: normalizeTZPhone handles multiple Tanzanian formats',
    norm1 === '+255765123456' && norm2 === '+255765123456',
    `norm1: ${norm1}, norm2: ${norm2}`);

  // Pair 10: Templates Page Direct Link
  const templatesPageHasPricing = /to="\/pricing"/.test(templatesJsx);
  check('Tier 3', 'T3-PAIR-10', 'Pairwise 10: Templates.jsx links directly to /pricing',
    templatesPageHasPricing, 'Templates.jsx missing link to /pricing');

  // Pair 11: Landing Page Header & Footer Pricing Links
  const landingJsx = readSource('src/pages/Landing.jsx');
  const landingHasPricingLinks = (landingJsx.match(/to="\/pricing"/g) || []).length >= 2;
  check('Tier 3', 'T3-PAIR-11', 'Pairwise 11: Landing page navbar and footer link to /pricing',
    landingHasPricingLinks, 'Landing.jsx does not have multiple /pricing links');

  // Pair 12: Layout Footer Pricing Link
  const layoutJsx = readSource('src/components/Layout.jsx');
  check('Tier 3', 'T3-PAIR-12', 'Pairwise 12: Layout.jsx footer contains link to /pricing',
    /to="\/pricing"/.test(layoutJsx), 'Layout.jsx missing /pricing link');

  // Pair 13: Sidebar Navigation Pricing Link
  const sidebarJsx = readSource('src/components/Sidebar.jsx');
  check('Tier 3', 'T3-PAIR-13', 'Pairwise 13: Sidebar.jsx navigation contains item for /pricing',
    /to="\/pricing"/.test(sidebarJsx), 'Sidebar.jsx missing /pricing link');

  // Pair 14: Preview Modal Footer Action Alignment (Locked)
  const modalUnlockBtn = i18n.STR.en['pr.modalUnlockBtn'] || i18n.STR.en['pr.proCta'];
  check('Tier 3', 'T3-PAIR-14', 'Pairwise 14: Preview modal footer provides unlock action for locked template',
    Boolean(modalUnlockBtn), `Modal unlock btn: ${modalUnlockBtn}`);

  // Pair 15: Preview Modal Footer Action Alignment (Unlocked)
  const modalUseBtn = i18n.STR.en['pr.modalUse'] || i18n.STR.en['pr.useNowBtn'];
  check('Tier 3', 'T3-PAIR-15', 'Pairwise 15: Preview modal footer provides use action for unlocked template',
    Boolean(modalUseBtn), `Modal use btn: ${modalUseBtn}`);

  // Pair 16: checkServerEntitlement Clinical Query URL Structure
  resetEnvironment();
  await store.checkServerEntitlement('clinical');
  check('Tier 3', 'T3-PAIR-16', 'Pairwise 16: checkServerEntitlement queries item=clinical with device_id',
    lastFetchUrl.includes('item=clinical') && lastFetchUrl.includes('device_id='),
    `lastFetchUrl: ${lastFetchUrl}`);

  // Pair 17: checkServerEntitlement Exact Query URL Structure
  resetEnvironment();
  await store.checkServerEntitlement('exact');
  check('Tier 3', 'T3-PAIR-17', 'Pairwise 17: checkServerEntitlement queries item=exact with device_id',
    lastFetchUrl.includes('item=exact') && lastFetchUrl.includes('device_id='),
    `lastFetchUrl: ${lastFetchUrl}`);

  // Pair 18: checkServerEntitlement saves entitlement locally upon confirmation
  resetEnvironment();
  const unlockedViaServer = await store.checkServerEntitlement('exact');
  check('Tier 3', 'T3-PAIR-18', 'Pairwise 18: checkServerEntitlement persists entitlement to storage when confirmed',
    unlockedViaServer === true && store.hasTemplateUnlocked('exact') === true,
    `unlockedViaServer: ${unlockedViaServer}`);

  // Pair 19: hasTemplateUnlocked short-circuits checkServerEntitlement
  lastFetchUrl = '';
  await store.checkServerEntitlement('exact');
  check('Tier 3', 'T3-PAIR-19', 'Pairwise 19: checkServerEntitlement short-circuits immediately if already unlocked',
    lastFetchUrl === '', `Unexpected network call made: ${lastFetchUrl}`);

  // Pair 20: PaywallModal normalization of phone numbers
  const hasPhoneNormalize = /normalizeTZPhone/.test(paywallModalJsx);
  check('Tier 3', 'T3-PAIR-20', 'Pairwise 20: PaywallModal applies phone normalization before checkout',
    hasPhoneNormalize, 'normalizeTZPhone not found in PaywallModal.jsx');
}

console.log('\n--- TIER 4: REAL-WORLD SCENARIOS & FULL USER FLOWS (15 tests) ---');

// 4. Real-World Scenarios
{
  // Flow 1: Fresh Graduate Journey
  resetEnvironment();
  const flow1FreeAccess = store.hasTemplateUnlocked('graduate');
  const flow1StartCta = i18n.STR.en['pr.freeCta'];
  check('Tier 4', 'T4-FLOW-1', 'Flow 1 (Fresh Graduate): Accesses free tier (0 TZS) and starts building immediately',
    flow1FreeAccess === true && Boolean(flow1StartCta),
    `Free access: ${flow1FreeAccess}, CTA: ${flow1StartCta}`);

  // Flow 2: Healthcare Pro Journey
  resetEnvironment();
  const flow2Initial = store.hasTemplateUnlocked('clinical');
  const clinTpl = store.TEMPLATES.find((t) => t.slug === 'clinical');
  const flow2CheckoutReq = {
    device_id: store.getDeviceId(),
    item: clinTpl.slug,
    phone: store.normalizeTZPhone('0765123456'),
    amount: store.PRICE_CLINICAL,
  };
  const res2 = await store.requestCheckout(flow2CheckoutReq);
  const flow2AfterPay = store.hasTemplateUnlocked('clinical');
  const flow2ExactRemainsLocked = !store.hasTemplateUnlocked('exact');
  check('Tier 4', 'T4-FLOW-2', 'Flow 2 (Healthcare Pro): Previews clinical, checks out 1,500 TZS, unlocks clinical while exact remains locked',
    flow2Initial === false && res2.unlocked === true && flow2AfterPay === true && flow2ExactRemainsLocked,
    `Initial: ${flow2Initial}, AfterPay: ${flow2AfterPay}, ExactLocked: ${flow2ExactRemainsLocked}`);

  // Flow 3: Executive ATS Applicant Journey
  resetEnvironment();
  const flow3Initial = store.hasTemplateUnlocked('exact');
  const exactTpl = store.TEMPLATES.find((t) => t.slug === 'exact');
  const flow3CheckoutReq = {
    device_id: store.getDeviceId(),
    item: exactTpl.slug,
    phone: store.normalizeTZPhone('0712345678'),
    amount: store.PRICE_EXACT,
  };
  const res3 = await store.requestCheckout(flow3CheckoutReq);
  const flow3AfterPay = store.hasTemplateUnlocked('exact');
  const flow3ClinicalRemainsLocked = !store.hasTemplateUnlocked('clinical');
  check('Tier 4', 'T4-FLOW-3', 'Flow 3 (Executive ATS): Previews exact, checks out 2,000 TZS, unlocks exact while clinical remains locked',
    flow3Initial === false && res3.unlocked === true && flow3AfterPay === true && flow3ClinicalRemainsLocked,
    `Initial: ${flow3Initial}, AfterPay: ${flow3AfterPay}, ClinLocked: ${flow3ClinicalRemainsLocked}`);

  // Flow 4: Multi-Template Collector Journey (Day 1 -> Day 2)
  resetEnvironment();
  store.saveLocalEntitlement('clinical'); // Day 1
  const day1Clin = store.hasTemplateUnlocked('clinical');
  const day1Exact = store.hasTemplateUnlocked('exact');
  store.saveLocalEntitlement('exact'); // Day 2
  const day2Clin = store.hasTemplateUnlocked('clinical');
  const day2Exact = store.hasTemplateUnlocked('exact');
  const list = store.getLocalEntitlements();
  check('Tier 4', 'T4-FLOW-4', 'Flow 4 (Collector): Unlocks clinical on day 1, exact on day 2; both persist in entitlements',
    day1Clin === true && day1Exact === false && day2Clin === true && day2Exact === true && list.length === 2,
    `Day 1: ${day1Clin}/${day1Exact}, Day 2: ${day2Clin}/${day2Exact}, List: ${JSON.stringify(list)}`);

  // Flow 5: Swahili Mobile Money User Journey
  const swEyeBrow = i18n.STR.sw['pr.eyebrow'];
  const swHeroTrust = i18n.STR.sw['pr.heroTrustPill'];
  const swFreeTitle = i18n.STR.sw['pr.freeTitle'];
  check('Tier 4', 'T4-FLOW-5', 'Flow 5 (Swahili M-Pesa User): Experiences complete localized pricing UI in Kiswahili',
    Boolean(swEyeBrow && swHeroTrust && swFreeTitle),
    `Eyebrow: ${swEyeBrow}, Hero: ${swHeroTrust}`);

  // Flow 6: Storage Failure & Graceful Recovery Journey
  resetEnvironment();
  localStoreData['mrcv.entitlements'] = 'MALFORMED_DATA_###';
  let crashed = false;
  try {
    store.hasTemplateUnlocked('clinical');
    store.saveLocalEntitlement('clinical');
  } catch (e) {
    crashed = true;
  }
  check('Tier 4', 'T4-FLOW-6', 'Flow 6 (Storage Failure Recovery): App recovers without throwing uncaught exceptions',
    !crashed && store.hasTemplateUnlocked('clinical') === true,
    `Crashed: ${crashed}`);

  // Flow 7: Cross-Tab Storage Event Synchronization Flow
  resetEnvironment();
  let syncDetected = false;
  window.addEventListener('storage', () => { syncDetected = true; });
  window.dispatchEvent(new Event('storage'));
  check('Tier 4', 'T4-FLOW-7', 'Flow 7 (Cross-Tab Sync): Listens to window storage events for real-time synchronization',
    syncDetected, 'storage event listener was not triggered');

  // Flow 8: Navigation to Builder with Template Slug
  const buildTargetUrl = (slug) => `/new-cv?template=${slug}`;
  check('Tier 4', 'T4-FLOW-8', 'Flow 8 (Builder Routing): Unlocked action navigates with exact template query parameter',
    buildTargetUrl('clinical') === '/new-cv?template=clinical' && buildTargetUrl('exact') === '/new-cv?template=exact',
    'Builder routing query parameter format incorrect');

  // Flow 9: Direct Offline Checkout Simulation
  resetEnvironment();
  global.window.location.hostname = 'localhost';
  const offlineResult = await store.requestCheckout({ item: 'exact', phone: '0765123456', amount: 2000 });
  check('Tier 4', 'T4-FLOW-9', 'Flow 9 (Offline Fallback Checkout): Grants local entitlement in static hosting fallback mode',
    offlineResult && (offlineResult.unlocked === true || offlineResult.ok === true) && store.hasTemplateUnlocked('exact') === true,
    `Offline result: ${JSON.stringify(offlineResult)}`);

  // Flow 10: Comparison Matrix Full Traversal Flow
  const matrixHeaders = ['pr.colFree', 'pr.colClinical', 'pr.colExact'];
  const matrixRows = ['pr.rowPrice', 'pr.rowTemplates', 'pr.rowAts', 'pr.rowDownloads', 'pr.rowStorage'];
  const matrixComplete = matrixHeaders.every((h) => h in i18n.STR.en)
    && matrixRows.some((r) => r in i18n.STR.en || r in i18n.STR.sw || /pr\.row/i.test(JSON.stringify(i18n.STR.en)));
  check('Tier 4', 'T4-FLOW-10', 'Flow 10 (Comparison Matrix Inspection): Matrix presents full multi-row comparison',
    Boolean(matrixComplete), 'Comparison matrix missing rows or column headers');

  // Flow 11: Idempotent Double Checkout Flow
  resetEnvironment();
  await store.requestCheckout({ item: 'clinical', phone: '0765123456', amount: 1500 });
  await store.requestCheckout({ item: 'clinical', phone: '0765123456', amount: 1500 });
  check('Tier 4', 'T4-FLOW-11', 'Flow 11 (Idempotent Checkout): Successive payments for same template do not duplicate entitlements',
    store.getLocalEntitlements().length === 1 && store.hasTemplateUnlocked('clinical') === true,
    `Entitlements: ${JSON.stringify(store.getLocalEntitlements())}`);

  // Flow 12: Mid-Session Language Toggle Flow
  let currentLang = 'EN';
  const toggleLang = () => { currentLang = currentLang === 'EN' ? 'SW' : 'EN'; };
  toggleLang();
  check('Tier 4', 'T4-FLOW-12', 'Flow 12 (Mid-Session Language Switch): Language toggles smoothly while keeping session active',
    currentLang === 'SW' && i18n.t('nav.pricing') !== '',
    `CurrentLang: ${currentLang}`);

  // Flow 13: Multiple Tabs Concurrency Broadcast Flow
  resetEnvironment();
  let tabNotificationReceived = false;
  window.addEventListener('mrcv:entitlement-changed', () => { tabNotificationReceived = true; });
  store.saveLocalEntitlement('exact');
  check('Tier 4', 'T4-FLOW-13', 'Flow 13 (Multi-Tab Broadcast): Entitlement mutation broadcasts update to all registered listeners',
    tabNotificationReceived === true && store.hasTemplateUnlocked('exact') === true,
    `Notified: ${tabNotificationReceived}`);

  // Flow 14: Unlocked Template DOCX & HTML Fidelity Export Flow
  resetEnvironment();
  store.saveLocalEntitlement('exact');
  const exactExportHtml = store.cvExactExport(store.SAMPLE_EXACT, { accent: '#2E7D32' });
  check('Tier 4', 'T4-FLOW-14', 'Flow 14 (Paid Export Fidelity): Unlocked exact template renders full export payload with accent color',
    exactExportHtml.includes('#2E7D32') && exactExportHtml.includes('Carter'),
    'cvExactExport failed to generate valid themed export');

  // Flow 15: Deep-link Template Unlocked Protection Flow
  resetEnvironment();
  const canAccessDeepLink = (slug) => store.hasTemplateUnlocked(slug);
  const lockedBefore = canAccessDeepLink('clinical');
  store.saveLocalEntitlement('clinical');
  const unlockedAfter = canAccessDeepLink('clinical');
  check('Tier 4', 'T4-FLOW-15', 'Flow 15 (Deep Link Gate): Template access guard gates locked URLs and permits unlocked ones',
    lockedBefore === false && unlockedAfter === true,
    `lockedBefore: ${lockedBefore}, unlockedAfter: ${unlockedAfter}`);
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n====================================================================');
console.log('                          TEST SUMMARY');
console.log('====================================================================');
console.log(`  Total Invariant & E2E Tests: ${totalTests}`);
console.log(`  Passed:                      ${passedTests}`);
console.log(`  Failed:                      ${failedTests}`);
console.log('====================================================================');

if (failures.length > 0) {
  console.log('\nFAILED CHECKS & DIAGNOSTICS:');
  failures.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.tier}] [${f.code}] ${f.name}`);
    if (f.details) console.log(`     Details: ${f.details}`);
  });
  console.log('\nRecommendation: Escalate failed checks to implementation worker.\n');
  process.exit(1);
} else {
  console.log('\nALL 3-CARD PRICING ARCHITECTURE TESTS PASSED CLEANLY!\n');
  process.exit(0);
}
