import { KINDS } from '../data/phenomena.js';
import Sign from './Sign.jsx';

/** תווית קידוד: סימן ושם המשפחה (חי, צומח, דומם או שמיים), בצבע הקבוע שלה. */
export default function KindTag({ kind }) {
  const k = KINDS[kind];
  return <span className="kind-tag" style={{ '--k': k.color }}><Sign name={kind} size={16} />{k.name}</span>;
}
