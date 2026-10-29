import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Profile from '../components/Profile.jsx';
import SortTable from '../components/SortTable.jsx';
import { ALL, OVERVIEW, MONTHS, MONTHS_SHORT, fmt, hours } from '../lib/data.js';
import { LEVELS } from '../lib/season.js';
import { buildPlan, scanStarts, planFromQuery, planToQuery, toISO } from '../lib/plan.js';
import { clock } from '../lib/sun.js';

const KEY = 'shvil-plan';

export default function PlanPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const [p, setP] = useState(() => {
    if (loc.search) return planFromQuery(loc.search);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return planFromQuery(saved);
    } catch { /* מצב פרטי */ }
    const d = new Date();
    return planFromQuery(`start=${toISO(d)}`);
  });
  const start = p.start || new Date();

  useEffect(() => {
    const q = planToQuery({ ...p, start });
    nav(`/plan?${q}`, { replace: true });
    try { localStorage.setItem(KEY, q); } catch { /* מצב פרטי */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  const plan = useMemo(() => buildPlan({ ...p, start }), [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const scan = useMemo(() => scanStarts(p, start.getFullYear()), [p.kmDay, p.rest, p.from, p.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const bestNS = scan.reduce((a, b) => (b.ns > a.ns ? b : a));
  const bestSN = scan.reduce((a, b) => (b.sn > a.sn ? b : a));
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const lo = ALL[Math.min(p.from, p.to) - 1];
  const hi = ALL[Math.max(p.from, p.to) - 1];
  const bands = plan.walk.map((d, i) => ({ n: i, from: Math.min(d.startKm, d.endKm), to: Math.max(d.startKm, d.endKm), color: LEVELS[d.suit.level].color, dim: i % 2 === 1 }));
  const totalUp = plan.walk.reduce((n, d) => n + d.up, 0);
  const totalH = plan.walk.reduce((n, d) => n + d.hours, 0);
  const longDay = plan.walk.filter((d) => d.hours > d.sun.daylight - 1.5).length;

  const rows = plan.days.map((d, i) => ({
    i: i + 1,
    date: d.date,
    type: d.type,
    where: d.type === 'rest' ? 'יום מנוחה' : p.dir === 'ns'
      ? `${ALL[d.sections[0] - 1].from} עד ${ALL[d.sections[d.sections.length - 1] - 1].to}`
      : `${ALL[d.sections[d.sections.length - 1] - 1].to} עד ${ALL[d.sections[0] - 1].from}`,
    secs: d.type === 'rest' ? '' : [...new Set(d.sections)].join(', '),
    km: d.km || 0,
    up: Math.round(d.up || 0),
    hours: d.hours || 0,
    sun: d.sun,
    level: d.suit?.level,
    t: d.suit?.t,
  }));

  return (
    <main className="plan">
      <header className="page-head">
        <p className="mono eyebrow">TRIP PLANNER</p>
        <h1>תכנון מסע</h1>
        <p className="lead">בחרו קטע, קצב ותאריך יציאה. החישוב מחלק את הדרך לימים, מעריך שעות הליכה לפי השיפועים, ובודק כל יום מול העונה והחום הממוצע במקום שבו תהיו.</p>
      </header>

      <section className="plan-controls card">
        <label>מאיפה
          <select value={p.from} onChange={(e) => set('from', Number(e.target.value))}>
            {ALL.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.from}</option>)}
          </select>
        </label>
        <label>עד לאן
          <select value={p.to} onChange={(e) => set('to', Number(e.target.value))}>
            {ALL.map((s) => <option key={s.n} value={s.n}>{s.n}. {s.to}</option>)}
          </select>
        </label>
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
        <label>ק"מ ליום: <b>{p.kmDay}</b>
          <input type="range" min="8" max="35" value={p.kmDay} onChange={(e) => set('kmDay', Number(e.target.value))} />
        </label>
        <label>יום מנוחה כל: <b>{p.rest ? `${p.rest} ימים` : 'בלי'}</b>
          <input type="range" min="0" max="10" value={p.rest} onChange={(e) => set('rest', Number(e.target.value))} />
        </label>
      </section>

      <section className="plan-summary">
        <div className="big-num"><b>{plan.days.length}</b><span>ימים</span></div>
        <div className="big-num"><b>{fmt(plan.total)}</b><span>ק"מ</span></div>
        <div className="big-num"><b>{fmt(totalUp)}</b><span>מטר עלייה</span></div>
        <div className="big-num"><b>{fmt(totalH)}</b><span>שעות הליכה</span></div>
        <div className="big-num"><b>{plan.end?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</b><span>מגיעים ל{p.dir === 'ns' ? hi.to : lo.from}</span></div>
        <div className="tally-wrap">
          <div className="tally" role="img" aria-label="ימי הליכה לפי רמזור">
            {Object.entries(plan.counts).map(([k, v]) => <motion.i key={k} layout style={{ flexGrow: v, background: LEVELS[k].color }} />)}
          </div>
          <p className="tally-text">
            <b style={{ color: LEVELS.go.color }}>{plan.counts.go} ימים ירוקים</b>, {plan.counts.maybe} בתנאים, {plan.counts.no} לא מומלצים.
            {longDay > 0 && <> <mark>{longDay} ימים ארוכים מאור היום</mark> פחות שעה וחצי למנוחות.</>}
          </p>
        </div>
      </section>

      <section className="card">
        <h2>מתי לצאת</h2>
        <p className="muted">הציון של כל תאריך יציאה לאורך השנה, באותו קצב ובאותו קטע. הקו המלא: מצפון לדרום. הקו המקווקו: מדרום לצפון. לחיצה על הגרף בוחרת תאריך.</p>
        <ScanChart scan={scan} start={start} dir={p.dir} onPick={(d, dir) => setP((x) => ({ ...x, start: d, dir }))} />
        <div className="scan-months mono" aria-hidden="true">{MONTHS_SHORT.map((m) => <span key={m}>{m}</span>)}</div>
        <div className="row small muted"><span className="band-key"><i style={{ background: '#1f2328' }} />מצפון לדרום</span><span className="band-key"><i style={{ background: '#f08a24' }} />מדרום לצפון</span></div>
        <p className="insight">
          הכי טוב מצפון לדרום: <mark>יציאה סביב {bestNS.start.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</mark> ({Math.round(bestNS.ns * 100)}%).
          {' '}מדרום לצפון: <mark>סביב {bestSN.start.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</mark> ({Math.round(bestSN.sn * 100)}%).
          {' '}<button className="link" onClick={() => setP((x) => ({ ...x, start: bestNS.ns >= bestSN.sn ? bestNS.start : bestSN.start, dir: bestNS.ns >= bestSN.sn ? 'ns' : 'sn' }))}>לבחור את הטוב מביניהם</button>
        </p>
      </section>

      <section className="card">
        <h2>הימים על פרופיל הגובה</h2>
        <Profile data={OVERVIEW.filter((d) => d[0] >= lo.startKm - 1 && d[0] <= hi.startKm + hi.length + 1).map(([k, e]) => [k - lo.startKm, e])} bands={bands.map((b) => ({ ...b, from: b.from - lo.startKm, to: b.to - lo.startKm }))} height={150} />
      </section>

      <section className="card card-table">
        <h2>יום אחרי יום</h2>
        <SortTable
          rows={rows}
          rowKey={(r) => r.i}
          rowClass={(r) => (r.type === 'rest' ? 'rest' : '')}
          columns={[
            { key: 'i', label: 'יום', mono: true },
            { key: 'date', label: 'תאריך', render: (r) => r.date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }), sort: (r) => r.date.getTime() },
            { key: 'where', label: 'מסלול', render: (r) => (r.type === 'rest' ? <span className="muted">יום מנוחה</span> : <span>{r.where}<small className="mono"> מקטעים {r.secs}</small></span>) },
            { key: 'km', label: 'ק"מ', render: (r) => (r.km ? fmt(r.km, 1) : '') },
            { key: 'up', label: 'עלייה', render: (r) => (r.km ? `${fmt(r.up)} מ'` : '') },
            { key: 'hours', label: 'שעות', render: (r) => (r.km ? hours(r.hours) : '') },
            { key: 'sun', label: 'אור יום', render: (r) => (r.sun ? `${clock(r.sun.rise)}–${clock(r.sun.set)}` : ''), sort: (r) => r.sun?.daylight ?? 0 },
            { key: 't', label: 'חום ממוצע', render: (r) => (r.t != null ? `${Math.round(r.t)}°` : '') },
            { key: 'level', label: 'רמזור', render: (r) => (r.level ? <span className={`chip chip-${r.level}`}>{LEVELS[r.level].name}</span> : ''), sort: (r) => ({ go: 0, maybe: 1, no: 2 }[r.level] ?? 3) },
          ]}
        />
        <p className="muted small">שעות לפי פונקציית ההליכה של טובלר, בלי הפסקות ובלי משקל תרמיל. הרמזור לפי החודש ונקודת האמצע של היום. <Link to="/seasons#method">איך מחושב</Link>. התכנית נשמרת בדפדפן, וכתובת הדף משתפת אותה.</p>
      </section>
    </main>
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
      {[0.25, 0.5, 0.75, 1].map((v) => <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className="pf-grid" vectorEffect="non-scaling-stroke" />)}
      <path d={line('ns')} fill="none" stroke="#1f2328" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      <path d={line('sn')} fill="none" stroke="#f08a24" strokeWidth="2.2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
      <line x1={x(sel)} x2={x(sel)} y1="0" y2={H} className="pf-cursor" vectorEffect="non-scaling-stroke" />
      <circle cx={x(sel)} cy={y(scan[sel][dir])} r="6" className="pf-dot" />
    </svg>
  );
}
