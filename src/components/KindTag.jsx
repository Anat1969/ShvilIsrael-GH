import { KINDS } from '../data/phenomena.js';

/** תווית קידוד: חי, צומח, דומם או שמיים, בצבע הקבוע של המשפחה. */
export default function KindTag({ kind }) {
  const k = KINDS[kind];
  return <span className="kind-tag" style={{ '--k': k.color }}>{k.name}</span>;
}
