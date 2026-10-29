import { ALL, sectionAtKm, TOTAL_KM } from './data.js';
import { suitability } from './season.js';
import { sunTimes } from './sun.js';

// מתכנן מסע. זמן ההליכה מחושב לפי קצב טובלר של כל מקטע (מתוך פרופיל הגובה),
// כך שיום בהרים "שוקל" יותר מיום במישור באותו מספר קילומטרים.
const SCORE = { go: 1, maybe: 0.5, no: 0 };

export const DEFAULT_PLAN = { dir: 'ns', start: null, kmDay: 20, rest: 6, from: 1, to: 56 };

function legs(a, b) {
  // הקטעים בין שני קילומטרים לאורך השביל, עם החלק היחסי מכל מקטע
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return ALL.filter((s) => s.startKm < hi && s.startKm + s.length > lo).map((s) => {
    const part = Math.min(hi, s.startKm + s.length) - Math.max(lo, s.startKm);
    return { s, km: part, f: part / s.length };
  });
}

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function buildPlan(p) {
  const from = ALL[Math.min(p.from, p.to) - 1];
  const to = ALL[Math.max(p.from, p.to) - 1];
  const lo = from.startKm;
  const hi = to.startKm + to.length;
  const forward = p.dir === 'ns';
  const total = hi - lo;
  const days = [];
  let pos = 0;
  let date = p.start ? new Date(p.start) : new Date();
  let walked = 0;
  while (pos < total - 0.05 && days.length < 400) {
    if (p.rest && walked > 0 && walked % p.rest === 0 && days[days.length - 1]?.type === 'walk') {
      days.push({ type: 'rest', date, at: days[days.length - 1].endKm });
      date = addDays(date, 1);
    }
    const step = Math.min(p.kmDay, total - pos);
    const a = forward ? lo + pos : hi - pos;
    const b = forward ? lo + pos + step : hi - pos - step;
    const ls = legs(a, b);
    const up = ls.reduce((n, l) => n + (forward ? l.s.up : l.s.down) * l.f, 0);
    const hrs = ls.reduce((n, l) => n + l.s.tobler * l.f, 0);
    const mid = sectionAtKm((a + b) / 2);
    const end = sectionAtKm(Math.min(b, TOTAL_KM - 0.01));
    const month = date.getMonth() + 1;
    const suit = suitability(mid, month);
    const sun = sunTimes(date, end.mid[0], end.mid[1]);
    days.push({ type: 'walk', date, startKm: a, endKm: b, km: step, up, hours: hrs, sections: ls.map((l) => l.s.n), mid, suit, sun });
    pos += step;
    walked += 1;
    date = addDays(date, 1);
  }
  const walk = days.filter((d) => d.type === 'walk');
  const score = walk.reduce((n, d) => n + SCORE[d.suit.level], 0) / Math.max(1, walk.length);
  const counts = { go: 0, maybe: 0, no: 0 };
  walk.forEach((d) => { counts[d.suit.level] += 1; });
  return { days, walk, score, counts, total, end: days[days.length - 1]?.date };
}

/** ציון לכל תאריך יציאה לאורך השנה, בשני הכיוונים. כך רואים "חלון" ולא רק תשובה אחת. */
export function scanStarts(p, year = new Date().getFullYear()) {
  const out = [];
  for (let w = 0; w < 52; w++) {
    const start = new Date(year, 0, 1 + w * 7);
    const ns = buildPlan({ ...p, dir: 'ns', start }).score;
    const sn = buildPlan({ ...p, dir: 'sn', start }).score;
    out.push({ start, ns, sn });
  }
  return out;
}

export function planToQuery(p) {
  const q = new URLSearchParams();
  q.set('dir', p.dir);
  if (p.start) q.set('start', toISO(p.start));
  q.set('km', p.kmDay);
  q.set('rest', p.rest);
  q.set('from', p.from);
  q.set('to', p.to);
  return q.toString();
}

export function planFromQuery(search) {
  const q = new URLSearchParams(search);
  const num = (k, d, a, b) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && q.get(k) !== null ? Math.max(a, Math.min(b, v)) : d;
  };
  const start = q.get('start') ? new Date(q.get('start')) : null;
  return {
    dir: q.get('dir') === 'sn' ? 'sn' : 'ns',
    start: start && !isNaN(start) ? start : null,
    kmDay: num('km', DEFAULT_PLAN.kmDay, 8, 40),
    rest: num('rest', DEFAULT_PLAN.rest, 0, 14),
    from: num('from', 1, 1, 56),
    to: num('to', 56, 1, 56),
  };
}

export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
