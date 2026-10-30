import { EVENTS, KINDS, inMonths, inSection } from '../data/phenomena.js';
import { nature } from './data.js';

export { KINDS, inMonths, inSection };

// הצומח נגזר מהנתונים: חודשים שבהם מספר התצפיות הוא לפחות חצי מחודש השיא, בכל רצועה שיש בה 20 תצפיות ומעלה.
const BAND_SECTIONS = { north: [1, 13], center: [14, 30], south: [31, 56] };
const BAND_NAME = { north: 'בצפון', center: 'במרכז', south: 'בדרום' };

function peakMonths(v) {
  const max = Math.max(...v);
  const list = v.map((c, i) => (max && c >= max * 0.5 ? i + 1 : null)).filter(Boolean);
  // סדר מעגלי: מתחילים בחודש שהחודש שלפניו אינו ברשימה (דצמבר לפני ינואר)
  const start = list.find((m) => !list.includes(m === 1 ? 12 : m - 1)) ?? list[0];
  return [...list.filter((m) => m >= start), ...list.filter((m) => m < start)];
}

const PLANTS = nature.species.filter((sp) => sp.kind === 'bloom').flatMap((sp) =>
  Object.keys(BAND_SECTIONS)
    .filter((b) => sp.months[b].reduce((a, c) => a + c, 0) >= 20)
    .map((b) => ({
      kind: 'tzomeach',
      name: `${sp.he} ${BAND_NAME[b]}`,
      monthList: peakMonths(sp.months[b]),
      sections: BAND_SECTIONS[b],
      note: sp.note,
      photo: sp.photo,
      sci: sp.sci,
    })),
);

export const ALL_EVENTS = [...EVENTS, ...PLANTS].map((e) => ({
  ...e,
  monthList: e.monthList || (e.date ? [Number(e.date.slice(0, 2))] : e.months === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : range(e.months)),
}));

function range([a, b]) {
  const out = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b) break;
  }
  return out;
}

export const eventsInMonth = (m) => ALL_EVENTS.filter((e) => e.monthList.includes(m) && !(e.geo));
export const eventsForSection = (n) => ALL_EVENTS.filter((e) => inSection(e, n) && !(e.kind === 'shamayim' && e.date));
export const monthsText = (e, short) => {
  if (e.date) {
    const [mm, dd] = e.date.split('-').map(Number);
    return `${dd} ב${short[mm - 1]}`;
  }
  if (e.monthList.length === 12) return 'כל השנה';
  const l = e.monthList;
  if (l.length === 1) return short[l[0] - 1];
  const contiguous = l.every((m, i) => i === 0 || m === (l[i - 1] % 12) + 1);
  return contiguous ? `${short[l[0] - 1]} עד ${short[l[l.length - 1] - 1]}` : l.map((m) => short[m - 1]).join(', ');
};
