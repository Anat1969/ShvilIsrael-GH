// ציון התאמה לטיול (0 עד 1) לכל מקטע ולכל חודש. הכלל שקוף ומוצג באפליקציה.
// הצבע הוא סולם המלצה (חיובי מול שלילי), לא מפת חום: ירוק כהה = מצוין, צהוב = בתנאים, אדום = לא מומלץ.
//
// 1. עונה: בתוך העונה המומלצת במדריך הרשמי = 1. מחוץ לה = 0.45.
// 2. חום: ממוצע הטמפרטורה המרבית היומית (ERA5, נקודת האמצע, מתוקן לגובה).
//    עד 24 מעלות אין הפחתה; מ-24 עד 34 ההפחתה עולה בהדרגה עד 0.85.
// 3. גשם (צפון ומרכז בלבד): ימי גשם בחודש; מ-8 עד 16 ההפחתה עולה עד 0.35 (בוץ).
//    במדבר הגשם לא מוריד ציון (החורף הוא עונת השיא שם), אבל מוסיף הערת שיטפונות.
//    כיול: סף קשיח של 8 ימים צבע את כל עונת הפריחה בגליל, בניגוד למדריך הרשמי.
// 4. פריחה: בחודשי שיא הפריחה לפי המדריך, תוספת 0.1.

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

export function suitability(s, month /* 1-12 */) {
  const inSeason = s.months.includes(month);
  const t = s.climate?.tmax?.[month - 1];
  const rd = s.climate?.rainDays?.[month - 1];
  const bloom = inBloom(s, month);
  const heatPen = t != null ? clamp((t - 24) / 10) * 0.85 : 0;
  const wetPen = rd != null && !desert(s) ? clamp((rd - 8) / 8) * 0.35 : 0;
  const score = clamp((inSeason ? 1 : 0.45) - heatPen - wetPen + (bloom ? 0.1 : 0));
  const b = bucketOf(score);

  const reasons = [inSeason ? 'בעונה המומלצת במדריך הרשמי' : 'מחוץ לעונה המומלצת במדריך הרשמי'];
  if (t != null) reasons.push(`ממוצע החום ביום: ${Math.round(t)} מעלות${t > 31 ? ', עומס חום' : t >= 27 ? ', ללכת בשעות הבוקר' : ''}`);
  if (wetPen > 0.05) reasons.push(`${Math.round(rd)} ימי גשם בחודש: השביל עלול להיות בוצי`);
  if (rd != null && desert(s) && rd >= 2) reasons.push(`כ-${Math.round(rd)} ימי גשם בחודש: לבדוק התרעות שיטפונות לפני כניסה לערוצים`);
  if (bloom) reasons.push('שיא הפריחה לפי המדריך');
  return { score, level: b.id, bucket: b, color: scoreColor(score), reasons, t, bloom, inSeason };
}

export function inBloom(s, month) {
  if (!s.bloom) return false;
  const [a, b] = s.bloom;
  return a <= b ? month >= a && month <= b : month >= a || month <= b;
}

export const currentMonth = () => new Date().getMonth() + 1;
