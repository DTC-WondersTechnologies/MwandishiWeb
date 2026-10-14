import React from 'react';
import {
  SAMPLE_CV, SAMPLE_EXACT, SAMPLE_LETTER, SAMPLE_TRADITIONAL, SAMPLE_BIODATA,
  cvToHTML, cvExactHTML, cvTraditionalHTML, cvBiodataHTML, letterToHTML,
} from '../lib/store.js';

// Single source of truth for how a template is drawn, so /templates and the
// landing page can never drift apart.
const TRAD_THEME = { accent: '#171717', font: "'Poppins',sans-serif", size: '13px' };
const BIODATA_THEME = { accent: '#244655', font: "'Poppins',sans-serif", size: '13px' };
export function sheetFor(t) {
  if (t.kind === 'letter') return { cls: 'cv-sheet tpl-letter', html: letterToHTML(SAMPLE_LETTER) };
  if (t.slug === 'exact') return { cls: 'cv-sheet tpl-exact', html: cvExactHTML(SAMPLE_EXACT) };
  if (t.slug === 'traditional') return { cls: 'cv-sheet tpl-traditional', html: cvTraditionalHTML(SAMPLE_TRADITIONAL, TRAD_THEME) };
  if (t.slug === 'biodata') return { cls: 'cv-sheet tpl-biodata', html: cvBiodataHTML(SAMPLE_BIODATA, BIODATA_THEME) };
  return { cls: `cv-sheet tpl-${t.slug}`, html: cvToHTML(SAMPLE_CV) };
}

export function useLinkFor(tpl) {
  return tpl.useLink ? `/${tpl.useLink.replace('.html', '')}` : `/new-cv?template=${tpl.slug}`;
}

// Scaled live preview of the real CV markup, clipped to a paper frame.
export default function TemplatePreview({ tpl, className = 'cv-frame cv-frame-sm' }) {
  const s = sheetFor(tpl);
  return (
    <div className={className}>
      <div className={`${s.cls} cv-zoom`} dangerouslySetInnerHTML={{ __html: s.html }}></div>
    </div>
  );
}
