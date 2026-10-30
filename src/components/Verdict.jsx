import { difficulty } from '../lib/season.js';

/** חוות דעת מנומקת: הדרגה, הגורם המכריע, וכל רכיב עם השפעתו בנקודות ומקורו. */
export default function Verdict({ s, r, monthName, compact = false }) {
  const d = difficulty(s);
  return (
    <div className="verdict">
      <p className="verdict-head">
        <span className="chip" style={{ background: r.color }}>{r.bucket.name} · {Math.round(r.score * 100)}</span>
        <span className="verdict-why">{monthName ? `${monthName}: ` : ''}{r.score < 0.6 ? 'בעיקר בגלל ' : 'בזכות '}<b>{r.why}</b></span>
      </p>
      <table className="factors">
        <caption className="sr">רכיבי הציון</caption>
        <thead><tr><th>רכיב</th><th>מה נמדד</th><th>השפעה</th></tr></thead>
        <tbody>
          {r.factors.map((f) => (
            <tr key={f.key}>
              <th scope="row">{f.name}</th>
              <td>{f.value}{!compact && <small>{f.source}</small>}</td>
              <td className="eff">
                <span className={`effbar ${f.effect < 0 ? 'neg' : f.effect > 0 ? 'pos' : 'zero'}`} style={{ width: `${Math.max(3, Math.round((Math.abs(f.effect) / 0.85) * 50))}px` }} />
                <b dir="ltr">{f.effect === 0 ? '0' : `${f.effect > 0 ? '+' : '−'}${Math.round(Math.abs(f.effect) * 100)}`}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="diff"><span className="diff-tag" style={{ background: d.color }}>קושי: {d.name}</span> {d.text}. <small>הקושי לא משתנה עם החודש, ולכן הוא מוצג בנפרד ולא נכלל בציון.</small></p>
    </div>
  );
}
