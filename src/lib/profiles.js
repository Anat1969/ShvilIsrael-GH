import factsData from '../data/generated/facts.json';
import { GUIDE } from '../data/stations.js';
import { difficulty, suitability } from './season.js';
import { ALL } from './data.js';
import { ALL_EVENTS, inSection } from './phenomena.js';
import { moonOn } from './moon.js';

// סימני שטח לכל מקטע, מהמדריכים הרשמיים (scripts/build_data.py facts), עם המשפט המקורי.
export const FACTS = factsData.sections;
export const FACTS_SOURCE = factsData.source;
export const factsFor = (n) => FACTS[n] || {};

/** תופעות במקטע בחודש מסוים: בלי גאולוגיה ובלי תופעות של כל השנה, כדי שהרשימה תהיה של החודש. */
export function monthEvents(n, month) {
  return ALL_EVENTS.filter((e) => inSection(e, n) && !e.geo && !e.date && e.monthList.length < 12 && e.monthList.includes(month));
}

/** כל מה שקורה ביום מסוים במקטעים מסוימים: תופעות החודש, שיא מטר מטאורים או תקופת השנה בטווח של יום, ומופע הירח. */
export function dayEvents(sections, date) {
  const m = date.getMonth() + 1;
  const seen = new Set();
  const list = [];
  sections.forEach((n) => monthEvents(n, m).forEach((e) => { if (!seen.has(e.name)) { seen.add(e.name); list.push(e); } }));
  const y = date.getFullYear();
  ALL_EVENTS.filter((e) => e.date).forEach((e) => {
    const d = new Date(`${y}-${e.date}T12:00:00`);
    if (Math.abs(d - date) <= 36 * 3600000 + 12 * 3600000) list.push({ ...e, today: true });
  });
  const moon = moonOn(date);
  if (moon) list.push({ kind: 'shamayim', name: moon === 'full' ? 'ירח מלא: לילה מואר' : 'מולד הירח: לילה חשוך', today: true });
  return list;
}

const HERITAGE = /תל |חורבת|חירבת|מבצר|מצודת|מצודה|עתיק|קדום|קדומ|מקדש|כנסיי|בית כנסת|אמת המים|אמות|מכרות|טחנ|דרך הבשמים|רומי|צלבני|לכיש|ציפורי|מצדה|לטרון|קיסריה|אפולוניה/;

/** שישה פרופילי מטיילים. לכל אחד כלל שקוף, ו-test שמחזיר התאמה ונימוק. */
export const PROFILES = [
  {
    id: 'family', name: 'משפחות', sign: 'family',
    rule: 'קושי קל או בינוני (עד 18 ק"מ־מאמץ). מודגשים צל ומים.',
    test: (s) => {
      const d = difficulty(s);
      const f = factsFor(s.n);
      return { match: d.kme <= 18, why: `${d.name}, ${d.kme.toFixed(0)} ק"מ־מאמץ${f.shade === 'shade' ? ', מוצל' : f.shade === 'exposed' ? ', חשוף לשמש' : ''}` };
    },
  },
  {
    id: 'thru', name: 'שביליסטים', sign: 'thru',
    rule: 'כל המקטעים. מודגשים לינה, תחבורה ואור יום.',
    test: (s) => {
      const f = factsFor(s.n);
      return { match: true, why: f.nightCamps ? `המדריך מזכיר חניון לילה (${f.nightCamps} אזכורים)` : f.lodge ? `לינה מומלצת: ${f.lodge}` : 'לינה: לבדוק במדריך' };
    },
  },
  {
    id: 'day', name: 'מטיילי יום', sign: 'day',
    rule: 'יש תחבורה ציבורית לפי המדריך, וקושי עד 26 ק"מ־מאמץ.',
    test: (s) => {
      const f = factsFor(s.n);
      const d = difficulty(s);
      return { match: f.bus === true && d.kme <= 26, why: f.bus === true ? `תחבורה: ${f.busText}` : f.bus === false ? 'אין תחבורה ציבורית לפי המדריך' : 'תחבורה: אין מידע במדריך' };
    },
  },
  {
    id: 'nature', name: 'צפרים וחובבי טבע', sign: 'nature',
    rule: 'יש במקטע נדידה או פריחה בחודש שנבחר.',
    test: (s, month) => {
      const ev = monthEvents(s.n, month).filter((e) => e.kind === 'chai' || e.kind === 'tzomeach');
      return { match: ev.length > 0, why: ev.length ? ev.slice(0, 2).map((e) => e.name).join(', ') : 'אין נדידה או פריחה בולטת החודש' };
    },
  },
  {
    id: 'history', name: 'היסטוריה וארכאולוגיה', sign: 'history',
    rule: 'יש במדריך בכיס תחנה של אתר עתיק או היסטורי.',
    test: (s) => {
      const st = (GUIDE[s.n]?.stations || []).filter((x) => HERITAGE.test(`${x.name} ${x.story}`));
      return { match: st.length > 0, why: st.length ? st.map((x) => x.name).join(', ') : 'אין אתר היסטורי בתחנות' };
    },
  },
  {
    id: 'sky', name: 'צילום ושמיים', sign: 'sky',
    rule: 'מדבר עם שמיים חשוכים, או תופעת שמיים ונוף גאולוגי במקטע.',
    test: (s) => {
      const geo = ALL_EVENTS.filter((e) => inSection(e, s.n) && (e.geo || (e.kind === 'shamayim' && !e.date)));
      const desert = s.n >= 31;
      return { match: desert || geo.length > 0, why: geo.length ? geo.map((e) => e.name).slice(0, 2).join(', ') : desert ? 'מדבר: מעט זיהום אור' : '' };
    },
  },
];
export const profileById = (id) => PROFILES.find((p) => p.id === id);

/**
 * מתי לצאת. לכל חודש: n = מקטעים שמתאימים לפרופיל ובציון 60 ומעלה, km = האורך שלהם,
 * ו-q = סכום (ציון × אורך) על כל המקטעים שמתאימים לפרופיל. q הוא הדירוג: ספירה מעל סף
 * בלבד נותנת תיקו בכל חודשי החורף, ו-q מבחין גם בגשם קל, בפריחה ובחום מתון.
 */
const bestCache = new Map();
export function bestMonths(profile) {
  if (bestCache.has(profile.id)) return bestCache.get(profile.id);
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let n = 0; let km = 0; let q = 0;
    ALL.forEach((s) => {
      if (!profile.test(s, m).match) return;
      const sc = suitability(s, m).score;
      q += sc * s.length;
      if (sc >= 0.6) { n += 1; km += s.length; }
    });
    return { m, n, km, q };
  });
  const top = months.reduce((a, b) => (b.q > a.q ? b : a));
  // חודשים בטווח של 2% מהשיא מוצגים יחד, כדי לא לבחור אחד באופן שרירותי
  const tops = months.filter((x) => x.q > 0 && x.q >= top.q * 0.98).map((x) => x.m);
  const res = { months, top, tops, max: Math.max(1e-9, top.q) };
  bestCache.set(profile.id, res);
  return res;
}
