import { MONTHS_SHORT } from '../lib/data.js';
import { currentMonth } from '../lib/season.js';

/** בחירת חודש: 12 תאים, החודש הנוכחי מסומן בקו. */
export default function MonthPicker({ month, setMonth, label = 'חודש' }) {
  const now = currentMonth();
  return (
    <div className="months" role="group" aria-label={label}>
      {MONTHS_SHORT.map((m, i) => (
        <button
          key={m}
          className={`${month === i + 1 ? 'on' : ''} ${now === i + 1 ? 'now' : ''}`}
          aria-pressed={month === i + 1}
          onClick={() => setMonth(i + 1)}
          title={now === i + 1 ? 'החודש הנוכחי' : undefined}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
