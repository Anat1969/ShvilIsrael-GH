import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Profile from '../components/Profile.jsx';
import SortTable from '../components/SortTable.jsx';
import ScaleLegend from '../components/ScaleLegend.jsx';
import { ALL, OVERVIEW, MONTHS, MONTHS_SHORT, fmt, hours } from '../lib/data.js';
import { SCALE, scoreColor } from '../lib/season.js';
import { buildPlan, scanStarts, planFromQuery, planToQuery, toISO } from '../lib/plan.js';
import { clock } from '../lib/sun.js';
import { moonOn } from '../lib/moon.js';
import { dayEvents } from '../lib/profiles.js';
import { KINDS } from '../data/phenomena.js';
import KindTag from '../components/KindTag.jsx';
import Sign from '../components/Sign.jsx';

const KIND_ORDER = ['chai', 'tzomeach', 'domem', 'shamayim'];

const KEY = 'shvil-plan';
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function PlanPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const [p, setP] = useState(() => {
    if (loc.search) return planFromQuery(loc.search);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return planFromQuery(saved);
    } catch { /* מצב פרטי */ }
    return planFromQuery(`start=${toISO(new Date())}`);
  });
  const start = p.start || new Date();

  useEffect(() => {
    const q = planToQuery({ ...p, start });
    nav(`/plan?${q}`, { replace: true });
    try { localStorage.setItem(KEY, q); } catch { /* מצב פרטי */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const plan = useMemo(() => buildPlan({ ...p, start }), [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const scan = useMemo(() => scanStarts(p, start.getFullYear()), [p.mode, p.kmDay, p.rest, p.from, p.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const bestNS = scan.reduce((a, b) => (b.ns > a.ns ? b : a));
  const bestSN = scan.reduce((a, b) => (b.sn > a.sn ? b : a));
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const lo = ALL[Math.min(p.from, p.to) - 1];
  const hi = ALL[Math.max(p.from, p.to) - 1];
  const bands = plan.walk.map((d, i) => ({ n: i, from: Math.min(d.startKm, d.endKm), to: Math.max(d.startKm, d.endKm), color: d.suit.color, dim: i % 2 === 1 }));
  // מה קורה בכל יום: תופעות החודש במקטעים של אותו יום, ואירועי שמיים בתאריך עצמו
  const [kinds, setKinds] = useState(KIND_ORDER);
  const evByDay = useMemo(() => plan.days.map((d) => (d.type === 'walk' ? dayEvents([...new Set(d.sections)], d.date) : [])), [plan]);
  const shown = (list) => list.filter((e) => kinds.includes(e.kind));
  const toggleKind = (k) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  const meet = useMemo(() => {
    const map = new Map();
    evByDay.forEach((list, i) => list.forEach((e) => {
      const key = e.name;
      if (!map.has(key)) map.set(key, { e, first: i, days: 0 });
      map.get(key).days += 1;
    }));
    return [...map.values()];
  }, [evByDay]);
  const totalUp = plan.walk.reduce((n, d) => n + d.up, 0);
  const totalH = plan.walk.reduce((n, d) => n + d.hours, 0);
  const longDay = plan.walk.filter((d) => d.hours > d.sun.daylight - 1.5).length;
  const where = (d) => {
    const first = ALL[d.sections[0] - 1];
    const last = ALL[d.sections[d.sections.length - 1] - 1];
    return p.dir === 'ns' ? `${first.from} עד ${last.to}` : `${last.to} עד ${first.from}`;
  };

  const rows = plan.days.map((d, i) => ({
    i: i + 1,
    date: d.date,
    type: d.type,
    where: d.type === 'rest' ? 'יום מנוחה' : where(d),
    secs: d.type === 'rest' ? '' : [...new Set(d.sections)].join(', '),
    km: d.km || 0,
    up: Math.round(d.up || 0),
    hours: d.hours || 0,
    sun: d.sun,
    score: d.suit?.score,
    suit: d.suit,
    t: d.suit?.t,
    ev: evByDay[i] || [],
  }));

  return (
    <main className="plan">
      <header className="page-head">
        <p className="mono eyebrow">TRIP PLANNER</p>
        <h1>תכנון מסע</h1>
        <p className="lead">בחרו קטע, קצב ותאריך יציאה. ברירת המחדל היא <b>מקטע ליום</b>, כמו בחלוקה הרשמית. כל יום נבדק מול העונה והחום הממוצע במקום שבו תהיו.</p>
      </header>

      <section className="card plan-controls-card">
        <h2 className="frame-h">הגדרות המסע</h2>
        <div className="plan-controls">
          <div className="ctl">
            <span>חלוקה לימים</span>
            <div className="seg" role="group" aria-label="חלוקה לימים">
              <button className={p.mode === 'section' ? 'on' : ''} aria-pressed={p.mode === 'section'} onClick={() => set('mode', 'section')}>מקטע ליום</button>
              <button className={p.mode === 'km' ? 'on' : ''} aria-pressed={p.mode === 'km'} onClick={() => set('mode', 'km')}>ק"מ קבוע ליום</button>
            </div>
          </div>
          <div className="ctl">
            <span>כיוון</span>
            <div className="seg" role="group" aria-label="כיוון">
              <button className={p.dir === 'ns' ? 'on' : ''} aria-pressed={p.dir === 'ns'} onClick={() => set('dir', 'ns')}>מצפון לדרום</button>
              <button className={p.dir === 'sn' ? 'on' : ''} aria-pressed={p.dir === 'sn'} onClick={() => set('dir', 'sn')}>מדרום לצפון</button>
            </div>
          </div>
          <label>תאריך יציאה
            <input type="date" value={toISO(start)} onChange={(e) => e.target.value && set('start', new Date(e.target.value))} />
          </label>
          <label>מקטע ראשון
            <select value={p.from} onChange={(e) => set('from', Number(e.target.value))}>
              {ALL.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.from}</option>)}
            </select>
          </label>
          <label>מקטע אחרון
            <select value={p.to} onChange={(e) => set('to', Number(e.target.value))}>
              {ALL.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.to}</option>)}
            </select>
          </label>
          {p.mode === 'km' ? (
            <label>ק"מ ליום: <b>{p.kmDay}</b>
              <input type="range" min="8" max="35" value={p.kmDay} onChange={(e) => set('kmDay', Number(e.target.value))} />
            </label>
          ) : (
            <div className="ctl"><span>ק"מ ליום</span><b className="ctl-note">לפי אורך המקטע: {fmt(Math.min(...plan.walk.map((d) => d.km)), 1)} עד {fmt(Math.max(...plan.walk.map((d) => d.km)), 1)}</b></div>
          )}
          <label>יום מנוחה כל: <b>{p.rest ? `${p.rest} ימים` : 'בלי'}</b>
            <input type="range" min="0" max="10" value={p.rest} onChange={(e) => set('rest', Number(e.target.value))} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2 className="frame-h">סיכום המסע</h2>
        <div className="plan-summary">
          <div className="big-num"><span>ימים</span><b>{plan.days.length}</b></div>
          <div className="big-num"><span>קילומטרים</span><b>{fmt(plan.total)}</b></div>
          <div className="big-num"><span>מטר עלייה</span><b>{fmt(totalUp)}</b></div>
          <div className="big-num"><span>שעות הליכה</span><b>{fmt(totalH)}</b></div>
          <div className="big-num"><span>מגיעים ל{p.dir === 'ns' ? hi.to : lo.from}</span><b>{plan.end?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</b></div>
          <div className="tally-wrap">
            <div className="tally" role="img" aria-label="ימי הליכה לפי דרגות">
              {SCALE.map((b) => <motion.i key={b.id} layout style={{ flexGrow: plan.counts[b.id], background: b.color }} />)}
            </div>
            <ul className="tally-keys">{SCALE.map((b) => <li key={b.id}><i style={{ background: b.color }} /><b>{plan.counts[b.id]}</b> {b.name}</li>)}</ul>
            <p className="tally-text">
              ציון ממוצע: <mark>{Math.round(plan.score * 100)}</mark>.
              {longDay > 0 && <> <b>{longDay} ימים</b> ארוכים מאור היום פחות שעה וחצי למנוחות.</>}
            </p>
          </div>
        </div>
      </section>

      <section className="card meet">
        <h2 className="frame-h">במסע שלך: חי, צומח, דומם ושמיים <small className="mono">לפי המקום והתאריך של כל יום</small></h2>
        <div className="kind-filter" role="group" aria-label="סינון לפי משפחה">
          {KIND_ORDER.map((k) => {
            const c = meet.filter((x) => x.e.kind === k).length;
            return (
              <button key={k} className={`chip-btn ${kinds.includes(k) ? 'on' : ''}`} aria-pressed={kinds.includes(k)} onClick={() => toggleKind(k)} style={kinds.includes(k) ? { background: KINDS[k].color, borderColor: KINDS[k].color } : undefined}>
                <Sign name={k} size={18} color={kinds.includes(k) ? '#fff' : undefined} />{KINDS[k].name}<b className="mono">{c}</b>
              </button>
            );
          })}
        </div>
        <div className="meet-grid">
          {KIND_ORDER.filter((k) => kinds.includes(k)).map((k) => {
            const list = meet.filter((x) => x.e.kind === k).sort((a, b) => a.first - b.first);
            if (!list.length) return null;
            return (
              <div key={k} className="meet-col" style={{ '--k': KINDS[k].color }}>
                <KindTag kind={k} />
                <ul>
                  {list.slice(0, 12).map(({ e, first, days }) => (
                    <li key={e.name}>
                      <b>{e.name}</b>
                      <small className="mono">יום {first + 1}, {plan.days[first].date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}{days > 1 ? ` · ${days} ימים במסע` : ''}</small>
                    </li>
                  ))}
                  {list.length > 12 && <li className="muted small">ועוד {list.length - 12}</li>}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="muted small">הסינון חל גם על לוח המסע ועל הטבלה. גאולוגיה ותופעות של כל השנה מופיעות בעמוד כל מקטע.</p>
      </section>

      <section className="card">
        <h2 className="frame-h">לוח המסע <small className="mono">כל יום בצבע ההתאמה, עם מספר המקטע, הקילומטרים ומה קורה בדרך</small></h2>
        <CalendarView days={plan.days} events={evByDay.map(shown)} />
        <ScaleLegend title="צבע היום: התאמה לטיול" />
      </section>

      <section className="card">
        <h2 className="frame-h">מתי לצאת <small className="mono">ציון המסע לכל תאריך יציאה בשנה</small></h2>
        <p className="muted">באותו קצב ובאותו קטע. הקו הכהה: מצפון לדרום. הקו הכתום המקווקו: מדרום לצפון. לחיצה על הגרף בוחרת תאריך.</p>
        <ScanChart scan={scan} start={start} dir={p.dir} onPick={(d, dir) => setP((x) => ({ ...x, start: d, dir }))} />
        <div className="scan-months mono" aria-hidden="true">{MONTHS_SHORT.map((m) => <span key={m}>{m}</span>)}</div>
        <div className="row small muted"><span className="band-key"><i style={{ background: '#1f2328' }} />מצפון לדרום</span><span className="band-key"><i style={{ background: '#f08a24' }} />מדרום לצפון</span></div>
        <p className="insight">
          הכי טוב מצפון לדרום: <mark>יציאה סביב {bestNS.start.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</mark> (ציון {Math.round(bestNS.ns * 100)}).
          {' '}מדרום לצפון: <mark>סביב {bestSN.start.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</mark> (ציון {Math.round(bestSN.sn * 100)}).
          {' '}<button className="link" onClick={() => setP((x) => ({ ...x, start: bestNS.ns >= bestSN.sn ? bestNS.start : bestSN.start, dir: bestNS.ns >= bestSN.sn ? 'ns' : 'sn' }))}>לבחור את הטוב מביניהם</button>
        </p>
      </section>

      <section className="card">
        <h2 className="frame-h">הימים על פרופיל הגובה</h2>
        <Profile data={OVERVIEW.filter((d) => d[0] >= lo.startKm - 1 && d[0] <= hi.startKm + hi.length + 1).map(([k, e]) => [k - lo.startKm, e])} bands={bands.map((b) => ({ ...b, from: b.from - lo.startKm, to: b.to - lo.startKm }))} height={150} />
      </section>

      <section className="card card-table">
        <h2 className="frame-h">יום אחרי יום <small className="mono">לחיצה על כותרת עמודה ממיינת</small></h2>
        <SortTable
          rows={rows}
          rowKey={(r) => r.i}
          rowClass={(r) => (r.type === 'rest' ? 'rest' : '')}
          columns={[
            { key: 'i', label: 'יום', mono: true },
            { key: 'date', label: 'תאריך', render: (r) => r.date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }), sort: (r) => r.date.getTime() },
            { key: 'where', label: 'מסלול', render: (r) => (r.type === 'rest' ? <span className="muted">יום מנוחה</span> : <span><b>{r.where}</b><small className="mono"> מקטעים {r.secs}</small></span>) },
            { key: 'km', label: 'ק"מ', render: (r) => (r.km ? fmt(r.km, 1) : '') },
            { key: 'up', label: 'עלייה', render: (r) => (r.km ? `${fmt(r.up)} מ'` : '') },
            { key: 'hours', label: 'שעות', render: (r) => (r.km ? hours(r.hours) : '') },
            { key: 'sun', label: 'אור יום', render: (r) => (r.sun ? `${clock(r.sun.rise)}–${clock(r.sun.set)}` : ''), sort: (r) => r.sun?.daylight ?? 0 },
            { key: 't', label: 'חום ממוצע', render: (r) => (r.t != null ? `${Math.round(r.t)}°` : '') },
            { key: 'ev', label: 'בדרך', render: (r) => <span className="day-ev">{shown(r.ev).map((e) => <span key={e.name} className="dev" style={{ '--k': KINDS[e.kind].color }}><Sign name={e.kind} size={14} />{e.name}</span>)}</span>, sort: (r) => shown(r.ev).length },
            { key: 'score', label: 'התאמה', render: (r) => (r.suit ? <span className="chip" style={{ background: r.suit.color }}>{r.suit.label}</span> : ''), sort: (r) => r.score ?? -1 },
          ]}
        />
        <p className="muted small">שעות לפי פונקציית ההליכה של טובלר, בלי הפסקות ובלי משקל תרמיל. ההתאמה לפי החודש ונקודת האמצע של היום. <Link to="/seasons#method">איך מחושב</Link>. התכנית נשמרת בדפדפן, וכתובת הדף משתפת אותה.</p>
      </section>
    </main>
  );
}

/** לוח חודשי: שבוע מימין לשמאל, ראשון מימין. כל יום מסע צבוע לפי ההתאמה. */
function CalendarView({ days, events = [] }) {
  if (!days.length) return null;
  const byDate = new Map(days.map((d, i) => [toISO(d.date), { ...d, i: i + 1, ev: events[i] || [] }]));
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const months = [];
  for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
  return (
    <div className="cal">
      {months.map((m) => {
        const offset = m.getDay();
        const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1))];
        return (
          <div key={m.toISOString()} className="cal-month">
            <h3>{MONTHS[m.getMonth()]} {m.getFullYear()}</h3>
            <div className="cal-grid">
              {WEEKDAYS.map((w) => <span key={w} className="cal-wd mono">{w}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const day = byDate.get(toISO(d));
                const moon = moonOn(d);
                if (!day) return <span key={i} className="cal-day off"><b>{d.getDate()}</b>{moon && <em className={`cal-moon ${moon}`} />}</span>;
                const rest = day.type === 'rest';
                const sec = rest ? [] : [...new Set(day.sections)];
                return (
                  <span
                    key={i}
                    className={`cal-day ${rest ? 'rest' : 'walk'}`}
                    style={rest ? undefined : { background: day.suit.color }}
                    title={rest ? `יום ${day.i}: מנוחה` : `יום ${day.i}: מקטע ${sec.join(', ')}, ${fmt(day.km, 1)} ק"מ, ${day.suit.label}${day.ev.length ? `. בדרך: ${day.ev.map((e) => e.name).join(', ')}` : ''}`}
                  >
                    <b>{d.getDate()}</b>
                    <small>{rest ? 'מנוחה' : `מק' ${sec.length > 1 ? `${sec[0]}–${sec[sec.length - 1]}` : sec[0]}`}</small>
                    {!rest && <small className="mono">{fmt(day.km, 0)} ק"מ</small>}
                    {!rest && day.ev.length > 0 && <span className="cal-ev">{KIND_ORDER.filter((k) => day.ev.some((e) => e.kind === k)).map((k) => <Sign key={k} name={k} size={11} color="#fff" />)}</span>}
                    {moon && <em className={`cal-moon ${moon}`} title={moon === 'full' ? 'ירח מלא' : 'מולד'} />}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="muted small cal-note">עיגול צהוב בפינה: ירח מלא. עיגול חלול: מולד (לילה חשוך).</p>
    </div>
  );
}

function ScanChart({ scan, start, dir, onPick }) {
  const W = 1000;
  const H = 150;
  const x = (i) => W - (i / (scan.length - 1)) * W;
  const y = (v) => 10 + (1 - v) * (H - 20);
  const line = (k) => scan.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join('');
  const doy = Math.round((start - new Date(start.getFullYear(), 0, 1)) / 86400000);
  const sel = Math.min(scan.length - 1, Math.round(doy / 7));
  return (
    <svg
      className="scan"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="ציון לפי תאריך יציאה"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const i = Math.round((1 - (e.clientX - r.left) / r.width) * (scan.length - 1));
        const d = scan[Math.max(0, Math.min(scan.length - 1, i))];
        onPick(d.start, d.ns >= d.sn ? 'ns' : 'sn');
      }}
    >
      {scan.map((d, i) => <rect key={i} x={x(i) - W / scan.length / 2} width={W / scan.length + 0.5} y={H - 6} height="6" fill={scoreColor(Math.max(d.ns, d.sn))} />)}
      {[0.25, 0.5, 0.75, 1].map((v) => <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className="pf-grid" vectorEffect="non-scaling-stroke" />)}
      <path d={line('ns')} fill="none" stroke="#1f2328" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      <path d={line('sn')} fill="none" stroke="#f08a24" strokeWidth="2.2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
      <line x1={x(sel)} x2={x(sel)} y1="0" y2={H} className="pf-cursor" vectorEffect="non-scaling-stroke" />
      <circle cx={x(sel)} cy={y(scan[sel][dir])} r="6" className="pf-dot" />
    </svg>
  );
}
