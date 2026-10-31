import Sign, { Count, SIGN_NAMES } from './Sign.jsx';
import { factsFor, monthEvents } from '../lib/profiles.js';
import { difficulty, suitability } from '../lib/season.js';

/**
 * שורת סימנים של מקטע: תנאי שטח (מהמדריך הרשמי) ומה קורה בו בחודש שנבחר.
 * כמות נאמרת בחזרה: שתי טיפות = שני מקומות מים שהמדריך מזכיר.
 */
export default function SectionSigns({ s, month, emphasis = [], size = 18 }) {
  const f = factsFor(s.n);
  const ev = monthEvents(s.n, month);
  const kinds = ['chai', 'tzomeach', 'domem', 'shamayim'].filter((k) => ev.some((e) => e.kind === k));
  const r = suitability(s, month);
  const d = difficulty(s);
  const em = (k) => (emphasis.includes(k) ? 'em' : '');
  const shadeName = f.shade === 'shade' ? 'shade' : f.shade === 'exposed' ? 'sun' : null;
  return (
    <span className="sec-signs">
      <span className="sg-group" title="תנאי שטח לפי המדריך הרשמי">
        {f.water > 0 && !f.noWater && <span className={`sg ${em('water')}`} title={`מים, לפי המדריך: ${f.waterText}`}><Count name="water" n={f.water} size={size} /></span>}
        {(f.nightCamps > 0) && <span className={`sg ${em('tent')}`} title={`לינה, לפי המדריך: ${f.nightText}`}><Sign name="tent" size={size} label="חניון לילה" /></span>}
        {shadeName && <span className={`sg ${em('shade')}`} title={`${SIGN_NAMES[shadeName]}, לפי המדריך: ${f.shadeText}`}><Sign name={shadeName} size={size} label={SIGN_NAMES[shadeName]} /></span>}
        {f.bus === true && <span className={`sg ${em('bus')}`} title={`תחבורה ציבורית: ${f.busText}`}><Sign name="bus" size={size} label="תחבורה ציבורית" /></span>}
        {d.kme <= 18 && <span className={`sg ${em('family')}`} title={`מתאים למשפחות: ${d.name}, ${d.kme.toFixed(0)} ק"מ־מאמץ`}><Sign name="family" size={size} label="מתאים למשפחות" /></span>}
        {r.t != null && r.t > 31 && <span className="sg" title={`עומס חום: כ-${Math.round(r.t)} מעלות בממוצע ביום`}><Sign name="heat" size={size} label="עומס חום" /></span>}
      </span>
      {kinds.length > 0 && (
        <span className="sg-group sg-kinds" title={ev.map((e) => e.name).join(' · ')}>
          {kinds.map((k) => <span key={k} className={`sg ${em(k)}`}><Sign name={k} size={size} label={`${SIGN_NAMES[k]}: ${ev.filter((e) => e.kind === k).map((e) => e.name).join(', ')}`} /></span>)}
        </span>
      )}
    </span>
  );
}
