// רמזור עונתי לכל מקטע ולכל חודש. הכלל שקוף ומוצג באפליקציה:
// 1. העונה המומלצת במדריך הרשמי של החברה להגנת הטבע (בתוך העונה / מחוצה לה).
// 2. ממוצע הטמפרטורה המרבית היומית בחודש, בנקודת האמצע של המקטע (ERA5, מתוקן לגובה).
//    עד 26 מעלות: נוח. 27 עד 31: חם, ללכת בבוקר. מעל 31: עומס חום.
// 3. ימי גשם (1 מ"מ ומעלה) בחודש: 8 ומעלה = בוץ, ובמדבר גם סכנת שיטפונות.
// ירוק: בעונה וטמפרטורה נוחה. כתום: בעונה אבל חם או גשום, או מחוץ לעונה אבל נוח. אדום: עומס חום, או מחוץ לעונה וחם.

export const LEVELS = {
  go: { name: 'מומלץ', color: '#2f8a4f' },
  maybe: { name: 'בתנאים', color: '#d9861c' },
  no: { name: 'לא מומלץ', color: '#c2412d' },
};

const desert = (s) => s.n >= 31;

export function suitability(s, month /* 1-12 */) {
  const inSeason = s.months.includes(month);
  const reasons = [];
  const t = s.climate?.tmax?.[month - 1];
  const rd = s.climate?.rainDays?.[month - 1];
  let heat = 0;
  if (t != null) {
    if (t > 31) heat = 2;
    else if (t >= 27) heat = 1;
  }
  const wet = rd != null && rd >= 8;
  const bloom = inBloom(s, month);

  reasons.push(inSeason ? 'בעונה המומלצת במדריך הרשמי' : 'מחוץ לעונה המומלצת במדריך הרשמי');
  if (t != null) reasons.push(`ממוצע החום היומי: ${Math.round(t)} מעלות${heat === 2 ? ', עומס חום' : heat === 1 ? ', ללכת בשעות הבוקר' : ''}`);
  if (wet) reasons.push(desert(s) ? `${Math.round(rd)} ימי גשם בחודש: סכנת שיטפונות בערוצים` : `${Math.round(rd)} ימי גשם בחודש: השביל עלול להיות בוצי`);
  if (bloom) reasons.push('שיא הפריחה לפי המדריך');

  let level;
  if (heat === 2) level = 'no';
  else if (inSeason && heat === 0 && !wet) level = 'go';
  else if (!inSeason && heat >= 1) level = 'no';
  else level = 'maybe';
  return { level, reasons, t, bloom, inSeason };
}

export function inBloom(s, month) {
  if (!s.bloom) return false;
  const [a, b] = s.bloom;
  return a <= b ? month >= a && month <= b : month >= a || month <= b;
}

export const currentMonth = () => new Date().getMonth() + 1;
