// מולד וירח מלא לפי החודש הסינודי הממוצע (29.530589 ימים) ממולד ידוע: 6 בינואר 2000, 18:14 UTC.
// דיוק: עד כחצי יום (המסלול האמיתי של הירח אינו אחיד). מספיק לתכנון לילות חשוכים או מוארים.
const SYN = 29.530588853;
const EPOCH = Date.UTC(2000, 0, 6, 18, 14);

export function moonEvents(year, month /* 1-12 */) {
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1);
  const out = [];
  let k = Math.floor((start - EPOCH) / 86400000 / SYN) - 1;
  for (; ; k++) {
    const nu = EPOCH + k * SYN * 86400000;
    const full = nu + (SYN / 2) * 86400000;
    if (nu >= end) break;
    if (nu >= start) out.push({ type: 'new', date: new Date(nu) });
    if (full >= start && full < end) out.push({ type: 'full', date: new Date(full) });
  }
  return out.sort((a, b) => a.date - b.date);
}

/** מופע הירח ביום מסוים: 'new' / 'full' / null (בטווח של חצי יום). */
export function moonOn(date) {
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const age = (((t - EPOCH) / 86400000) % SYN + SYN) % SYN;
  if (age < 0.75 || age > SYN - 0.75) return 'new';
  if (Math.abs(age - SYN / 2) < 0.75) return 'full';
  return null;
}
