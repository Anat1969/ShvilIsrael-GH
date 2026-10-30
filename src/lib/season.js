import { sunTimes } from './sun.js';
import { eventsForSection } from './phenomena.js';

// ציון התאמה לטיול (0 עד 1) לכל מקטע ולכל חודש. הכלל שקוף ומוצג באפליקציה.
// הצבע הוא סולם המלצה (חיובי מול שלילי), לא מפת חום: ירוק כהה = מצוין, צהוב = בתנאים, אדום = לא מומלץ.
//
// 1. עונה: בתוך העונה המומלצת במדריך הרשמי = 1. מחוץ לה = 0.45.
// 2. חום: ממוצע הטמפרטורה המרבית היומית (ERA5, נקודת האמצע, מתוקן לגובה).
//    עד 24 מעלות אין הפחתה; מ-24 עד 34 ההפחתה עולה בהדרגה עד 0.85.
// 3. גשם (צפון ומרכז בלבד): ימי גשם בחודש; מ-8 עד 16 ההפחתה עולה עד 0.35 (בוץ).
//    במדבר הגשם לא מוריד ציון (החורף הוא עונת השיא שם), אבל מוסיף הערת שיטפונות.
//    כיול: סף קשיח של 8 ימים צבע את כל עונת הפריחה בגליל, בניגוד למדריך הרשמי.
// 4. אור יום: אם ההליכה עם מנוחות (פי 1.3) לא נכנסת בשעות האור פחות שעה, הפחתה עד 0.3.
// 5. חוויה עונתית: שיא פריחה לפי המדריך 0.1, ועוד 0.02 לכל תופעה עונתית במקטע (עד 0.06).
// כל רכיב מוחזר עם ערך, השפעה ומקור, ו-why מנמק את הדרגה (הגורם המכריע).
// הקושי לא נכלל בציון: הוא קבוע לאורך השנה ומוצג בנפרד (difficulty).

export const SCALE = [
  { id: 'top', name: 'מצוין', min: 0.8, color: '#1f7a45' },
  { id: 'good', name: 'טוב', min: 0.6, color: '#6fae5c' },
  { id: 'mid', name: 'בתנאים', min: 0.4, color: '#e5b443' },
  { id: 'hard', name: 'קשה', min: 0.2, color: '#e07b2a' },
  { id: 'no', name: 'לא מומלץ', min: 0, color: '#b8372a' },
];
export const LEVELS = Object.fromEntries(SCALE.map((b) => [b.id, b]));
export const bucketOf = (score) => SCALE.find((b) => score >= b.min) || SCALE[SCALE.length - 1];

// מעבר רציף בין חמש התחנות, כך שהצבע זורם ולא קופץ
const STOPS = [[0, '#b8372a'], [0.3, '#e07b2a'], [0.5, '#e5b443'], [0.7, '#6fae5c'], [1, '#1f7a45']];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function scoreColor(v) {
  const x = Math.max(0, Math.min(1, v));
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1];
      const [b, cb] = STOPS[i];
      const t = (x - a) / (b - a);
      const A = hex(ca);
      const B = hex(cb);
      return `rgb(${A.map((c, k) => Math.round(c + (B[k] - c) * t)).join(',')})`;
    }
  }
  return STOPS[STOPS.length - 1][1];
}
export const GRADIENT = `linear-gradient(to right, ${STOPS.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`;

export const BLOOM_COLOR = '#8e5bb5';
const desert = (s) => s.n >= 31;
const clamp = (v) => Math.max(0, Math.min(1, v));
const r0 = (x) => Math.round(x * 100);

/**
 * ציון התאמה לחודש, מפורק לרכיבים גלויים. כל רכיב: שם, ערך, השפעה על הציון (בנקודות) ומקור.
 * הקושי אינו חלק מהציון, כי הוא לא משתנה עם החודש. הוא מוצג בנפרד (difficulty).
 */
const memo = new Map();
export function suitability(s, month /* 1-12 */) {
  const key = `${s.n}-${month}`;
  if (!memo.has(key)) memo.set(key, compute(s, month));
  return memo.get(key);
}

function compute(s, month) {
  const inSeason = s.months.includes(month);
  const t = s.climate?.tmax?.[month - 1];
  const rd = s.climate?.rainDays?.[month - 1];
  const bloom = inBloom(s, month);
  const factors = [];

  // 1. עונה רשמית
  factors.push({
    key: 'season', name: 'עונה רשמית', short: inSeason ? 'בעונה' : 'מחוץ לעונה',
    value: inSeason ? 'בתוך העונה המומלצת' : 'מחוץ לעונה המומלצת',
    effect: inSeason ? 0 : -0.55, source: 'המדריך של החברה להגנת הטבע',
  });
  // 2. אקלים: חום
  if (t != null) {
    const pen = clamp((t - 24) / 10) * 0.85;
    factors.push({
      key: 'heat', name: 'חום', short: `חום ${Math.round(t)} מעלות`,
      value: `${Math.round(t)} מעלות בממוצע ביום${t > 31 ? ': עומס חום, סכנת התייבשות' : t >= 27 ? ': ללכת בשעות הבוקר' : ': נוח'}`,
      effect: -pen, source: 'ERA5, ממוצע 2021 עד 2023',
    });
  }
  // 2. אקלים: גשם
  if (rd != null) {
    const pen = desert(s) ? 0 : clamp((rd - 8) / 8) * 0.35;
    factors.push({
      key: 'rain', name: desert(s) ? 'שיטפונות' : 'גשם ובוץ', short: desert(s) ? 'שיטפונות' : 'בוץ',
      value: desert(s)
        ? (rd >= 2 ? `כ-${Math.round(rd)} ימי גשם בחודש: לבדוק התרעות לפני כניסה לערוצים` : 'כמעט בלי גשם')
        : `${Math.round(rd)} ימי גשם בחודש${pen > 0.05 ? ': שביל בוצי בחלק מהימים' : ''}`,
      effect: -pen, source: 'ERA5, ימים עם 1 מ"מ ומעלה',
    });
  }
  // 3. אור יום מול זמן ההליכה (כולל מנוחות, פי 1.3)
  if (s.mid && s.tobler) {
    const day = sunTimes(new Date(2026, month - 1, 15), s.mid[0], s.mid[1]).daylight;
    const need = Math.max(s.tobler, s.naismith) * 1.3;
    const pen = clamp((need - (day - 1)) / 2) * 0.3;
    factors.push({
      key: 'light', name: 'אור יום', short: 'ימים קצרים',
      value: `${day.toFixed(1)} שעות אור, ההליכה עם מנוחות כ-${need.toFixed(1)} שעות${pen > 0.02 ? ': צמוד לחשכה' : ''}`,
      effect: -pen, source: 'NOAA, זמן לפי טובלר ונייסמית',
    });
  }
  // 4. חוויה עונתית: פריחה לפי המדריך ותופעות באותו חודש
  const evs = eventsForSection(s.n).filter((e) => !e.risk && !e.geo && e.monthList.length < 12 && e.monthList.includes(month));
  const exp = (bloom ? 0.1 : 0) + Math.min(0.06, evs.length * 0.02);
  factors.push({
    key: 'experience', name: 'חוויה עונתית', short: bloom ? 'פריחה' : evs[0]?.name || 'נוף',
    value: [bloom ? 'שיא הפריחה לפי המדריך' : null, ...evs.slice(0, 3).map((e) => e.name)].filter(Boolean).join(' · ') || 'בלי תופעה עונתית מיוחדת',
    effect: exp, source: 'המדריך הרשמי ו-iNaturalist',
  });

  const score = clamp(1 + factors.reduce((n, f) => n + f.effect, 0));
  const b = bucketOf(score);
  const neg = factors.filter((f) => f.effect < -0.04).sort((a, c) => a.effect - c.effect);
  const main = score < 0.6 && neg.length ? neg[0] : factors.find((f) => f.key === 'experience' && f.effect > 0) || { short: 'תנאים נוחים' };
  const why = score < 0.6 && neg.length ? neg.map((f) => f.short).slice(0, 2).join(', ') : main.short;
  const reasons = factors.map((f) => `${f.name}: ${f.value}`);
  return { score, level: b.id, bucket: b, color: scoreColor(score), label: `${b.name} · ${why}`, why, factors, reasons, t, bloom, inSeason };
}

/** קושי פיזי, קבוע לכל מקטע: קילומטר־מאמץ (השיטה השווייצרית, Leistungskilometer) = ק"מ + עלייה במטרים / 100. */
export const DIFF = [
  { max: 15, name: 'קל', color: '#6fae5c' },
  { max: 22, name: 'בינוני', color: '#e5b443' },
  { max: 30, name: 'מאתגר', color: '#e07b2a' },
  { max: Infinity, name: 'קשה', color: '#b8372a' },
];
export function difficulty(s) {
  const kme = s.length + s.up / 100;
  const g = DIFF.find((d) => kme <= d.max);
  const steep = s.length ? s.up / s.length : 0;
  return { kme, ...g, text: `${s.length.toFixed(1)} ק"מ ועוד ${Math.round(s.up)} מ' עלייה = ${kme.toFixed(1)} ק"מ־מאמץ${steep > 40 ? ', שיפועים תלולים' : ''}` };
}

export function inBloom(s, month) {
  if (!s.bloom) return false;
  const [a, b] = s.bloom;
  return a <= b ? month >= a && month <= b : month >= a || month <= b;
}

export const currentMonth = () => new Date().getMonth() + 1;
