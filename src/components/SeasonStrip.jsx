import { MONTHS, MONTHS_SHORT } from '../lib/data.js';
import { suitability } from '../lib/season.js';

/** 12 תאים, תא לכל חודש, בצבע סולם ההתאמה. ינואר מימין. labels: שם החודש מתחת לכל תא. */
export default function SeasonStrip({ s, month, big = false, labels = big }) {
  return (
    <div className={`strip-wrap ${big ? 'strip-big' : ''}`}>
      <div className="strip" role="img" aria-label="התאמה לפי חודשים">
        {MONTHS.map((m, i) => {
          const r = suitability(s, i + 1);
          return (
            <i
              key={m}
              className={`${month === i + 1 ? 'on' : ''} ${r.bloom ? 'bloom' : ''}`}
              style={{ background: r.color }}
              title={`${m}: ${r.bucket.name}. ${r.reasons.join('. ')}`}
            >
              {big && <b>{Math.round(r.score * 100)}</b>}
            </i>
          );
        })}
      </div>
      {labels && <div className="strip-months mono" aria-hidden="true">{MONTHS_SHORT.map((m, i) => <span key={m} className={month === i + 1 ? 'on' : ''}>{m}</span>)}</div>}
    </div>
  );
}
