import { SCALE, GRADIENT, BLOOM_COLOR } from '../lib/season.js';

/** מקרא אחיד לסולם ההתאמה: פס צבע רציף וחמש דרגות. אותו מקרא בכל מקום באפליקציה. */
export default function ScaleLegend({ bloom = false, title = 'התאמה לטיול' }) {
  return (
    <div className="scale-legend" role="img" aria-label={`${title}: מימין מצוין, משמאל לא מומלץ`}>
      <span className="scale-title">{title}</span>
      <span className="scale-bar" style={{ background: GRADIENT }} />
      <span className="scale-names">{SCALE.map((b) => <span key={b.id}>{b.name}</span>)}</span>
      {bloom && <span className="scale-bloom"><i style={{ background: BLOOM_COLOR }} />פס סגול בתחתית: שיא פריחה לפי המדריך</span>}
    </div>
  );
}
