import { MONTHS, MONTHS_SHORT } from '../lib/data.js';
import { suitability } from '../lib/season.js';

/** 12 תאים, תא לכל חודש, בצבע סולם ההתאמה. ינואר מימין. labels: שם החודש מתחת לכל תא. */
export default function SeasonStrip({ s, month, big = false, labels = big, onPick, picked }) {
  return (
    <div className={`strip-wrap ${big ? 'strip-big' : ''}`}>
      <div className="strip" role="img" aria-label="התאמה לפי חודשים">
        {MONTHS.map((m, i) => {
          const r = suitability(s, i + 1);
          return (
            <i
              key={m}
              className={`${month === i + 1 ? 'on' : ''} ${picked === i + 1 ? 'picked' : ''} ${r.bloom ? 'bloom' : ''} ${onPick ? 'pickable' : ''}`}
              onClick={onPick ? () => onPick(i + 1) : undefined}
              style={{ background: r.color }}
              title={`${m}: ${r.label}. ${r.reasons.join('. ')}`}
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
