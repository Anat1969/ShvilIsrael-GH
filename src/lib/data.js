import { SECTIONS, REGIONS, SUBREGIONS, regionOf, subOf, SEASON_MONTHS } from '../data/sections.js';
import stats from '../data/generated/stats.json';
import climate from '../data/generated/climate.json';
import nature from '../data/generated/nature.json';

export { REGIONS, SUBREGIONS, nature, climate };
export const TOTAL_KM = stats.totalKm;
export const OVERVIEW = stats.overview; // [km, גובה] כל 500 מ' לאורך כל השביל

/** כל מקטע: התוכן הכתוב + מדדים שחושבו מהתוואי + אקלים. */
export const ALL = SECTIONS.map((s) => {
  const m = stats.sections.find((x) => x.n === s.n);
  return {
    ...s,
    ...m,
    region: regionOf(s.n),
    sub: subOf(s.n),
    color: regionOf(s.n).color,
    months: SEASON_MONTHS[s.season],
    climate: climate.sections[s.n] || null,
  };
});

export const byN = (n) => ALL.find((s) => s.n === Number(n));
export const sectionAtKm = (km) => ALL.find((s) => km >= s.startKm && km < s.startKm + s.length) || ALL[ALL.length - 1];

let trailPromise;
/** הגאומטריה ופרופיל הגובה המפורט (כ-220KB), נטענים פעם אחת. */
export function loadTrail() {
  if (!trailPromise) trailPromise = fetch('/data/trail.json').then((r) => r.json());
  return trailPromise;
}

export const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const MONTHS_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

export const fmt = (x, d = 0) => Number(x).toLocaleString('he-IL', { maximumFractionDigits: d, minimumFractionDigits: d });
export const hours = (h) => {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60 / 5) * 5;
  return M === 60 ? `${H + 1}:00` : `${H}:${String(M).padStart(2, '0')}`;
};
