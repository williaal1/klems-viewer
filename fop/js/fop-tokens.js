// Forces of Production — read the design tokens from CSS so chart code never hard-codes a colour.
// Usage (ES module):  import { tokens, seriesColors } from './fop-tokens.js';
//                     const t = tokens();  t.accent, t.grid, t.fontLabel …
// Values come from css/fop-tokens.css; change them there, never here.

function read(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function tokens(el) {
  const r = (n) => read(n, el);
  return {
    bg: r('--color-bg'),
    surface: r('--color-surface'),
    text: r('--color-text'),
    textMuted: r('--color-text-muted'),
    accent: r('--color-accent'),
    rule: r('--color-rule'),
    grid: r('--color-grid'),
    positive: r('--color-positive'),
    negative: r('--color-negative'),
    recession: r('--color-recession'),
    onDark: r('--color-on-dark'),
    onBright: r('--color-on-bright'),
    aggregate: r('--series-aggregate'),
    diverging: [r('--scale-div-low'), r('--scale-div-mid'), r('--scale-div-high')],
    sequential: [r('--scale-seq-1'), r('--scale-seq-2'), r('--scale-seq-3'), r('--scale-seq-4')],
    fontSans: r('--font-sans'),
    fontLabel: r('--font-label'),
    strokeAxis: parseFloat(r('--stroke-axis')),
    strokeGrid: parseFloat(r('--stroke-grid')),
    strokeSeries: parseFloat(r('--stroke-series')),
  };
}

// Brand series order. Assign to series ranked by final value, largest first;
// an aggregate/total series takes tokens().aggregate instead.
export function seriesColors(el) {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => read(`--series-${i}`, el));
}

// Text colour that stays readable on a given brand fill.
export function textOn(fill, el) {
  const t = tokens(el);
  const dark = ['--fop-dark-teal', '--fop-medium-teal', '--fop-dark-gray', '--fop-medium-gray'].map((n) => read(n, el));
  return dark.includes(fill.trim().toLowerCase()) ? t.onDark : t.onBright;
}
