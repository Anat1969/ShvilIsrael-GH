import { MONTHS } from '../lib/data.js';
import { suitability, LEVELS } from '../lib/season.js';

/** 12 תאים ברמזור לכל חודש. */
export default function SeasonStrip({ s, month, big = false }) {
  return (
    <div className={`strip ${big ? 'strip-big' : ''}`} role="img" aria-label="התאמה לפי חודשים">
      {MONTHS.map((m, i) => {
        const r = suitability(s, i + 1);
        return (
          <i
            key={m}
            className={`${month === i + 1 ? 'on' : ''} ${r.bloom ? 'bloom' : ''}`}
            style={{ background: LEVELS[r.level].color }}
            title={`${m}: ${LEVELS[r.level].name}. ${r.reasons.join('. ')}`}
          />
        );
      })}
    </div>
  );
}
