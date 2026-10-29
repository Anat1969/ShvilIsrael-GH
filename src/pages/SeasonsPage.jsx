import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL, REGIONS, MONTHS, MONTHS_SHORT, nature, climate, fmt } from '../lib/data.js';
import { suitability, LEVELS, currentMonth } from '../lib/season.js';

const BANDS = [
  { id: 'north', name: 'צפון', color: '#3f7d4e' },
  { id: 'center', name: 'מרכז', color: '#8a7a2e' },
  { id: 'south', name: 'דרום', color: '#b34a2c' },
];
const KIND = { bloom: 'פריחה', migration: 'נדידה', wildlife: 'חיות בר' };

export default function SeasonsPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const now = currentMonth();
  const [cell, setCell] = useState(null);
  const grid = useMemo(() => ALL.map((s) => MONTHS.map((_, i) => suitability(s, i + 1))), []);

  useEffect(() => {
    if (!loc.hash) return;
    const el = document.getElementById(decodeURIComponent(loc.hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }, [loc.hash]);

  // סינתזה: באיזה חודש כל אזור הכי ירוק
  const regionBest = REGIONS.map((r) => {
    const rows = ALL.map((s, i) => [s, i]).filter(([s]) => s.region.id === r.id);
    const km = MONTHS.map((_, m) => rows.reduce((n, [s, i]) => n + (grid[i][m].level === 'go' ? s.length : 0), 0));
    const total = rows.reduce((n, [s]) => n + s.length, 0);
    const best = km.map((v, m) => ({ m, share: v / total })).filter((x) => x.share >= 0.6).map((x) => x.m);
    return { r, best, km, total };
  });
  const greenByMonth = MONTHS.map((_, m) => ALL.reduce((n, s, i) => n + (grid[i][m].level === 'go' ? s.length : 0), 0));
  const bestMonth = greenByMonth.indexOf(Math.max(...greenByMonth));
  const worstMonth = greenByMonth.indexOf(Math.min(...greenByMonth));

  // פנולוגיה: מתי השיא בכל רצועה
  const pheno = nature.species.map((sp) => {
    const peaks = {};
    BANDS.forEach((b) => {
      const v = sp.months[b.id];
      const tot = v.reduce((a, c) => a + c, 0);
      peaks[b.id] = tot >= 20 ? v.indexOf(Math.max(...v)) : null;
    });
    return { sp, peaks };
  });
  const shift = pheno.filter((p) => p.sp.kind === 'bloom' && p.peaks.north != null && p.peaks.south != null);
  const earlierSouth = shift.filter((p) => p.peaks.south <= p.peaks.north).length;

  return (
    <main className="seasons">
      <header className="page-head">
        <p className="mono eyebrow">SEASONS · 56 × 12</p>
        <h1>מתי ללכת, ואיפה</h1>
        <p className="lead">
          כל שורה היא מקטע, כל עמודה היא חודש. <mark>{MONTHS[bestMonth]}</mark> הוא החודש עם הכי הרבה קילומטרים ירוקים ({fmt(greenByMonth[bestMonth])} ק"מ),
          ו<b>{MONTHS[worstMonth]}</b> עם הכי מעט ({fmt(greenByMonth[worstMonth])} ק"מ). החלון זז: הנגב פתוח בחורף, הצפון גם בסתיו ובאביב.
        </p>
      </header>

      <section className="windows">
        {regionBest.map(({ r, best, km, total }) => (
          <div key={r.id} className="window" style={{ '--c': r.color }}>
            <b>{r.name}</b>
            <div className="win-bars" aria-hidden="true">
              {km.map((v, m) => <i key={m} style={{ height: `${(v / total) * 100}%` }} className={m + 1 === now ? 'now' : ''} title={`${MONTHS[m]}: ${Math.round((v / total) * 100)}% ירוק`} />)}
            </div>
            <small>{best.length ? `החלון: ${best.map((m) => MONTHS_SHORT[m]).join(', ')}` : 'אין חודש שבו רוב האזור ירוק'}</small>
          </div>
        ))}
      </section>

      <section className="matrix-wrap">
        <div className="matrix" role="table" aria-label="רמזור לפי מקטע וחודש">
          <div className="mx-row mx-head" role="row">
            <span className="mx-name" role="columnheader">מקטע</span>
            {MONTHS_SHORT.map((m, i) => <span key={m} role="columnheader" className={i + 1 === now ? 'now' : ''}>{m}</span>)}
          </div>
          {ALL.map((s, i) => (
            <div key={s.n} className={`mx-row ${s.n === s.region.from ? 'mx-first' : ''}`} role="row" style={{ '--c': s.color }}>
              <button className="mx-name" role="rowheader" onClick={() => nav(`/s/${s.n}`)}><span className="mono">{s.n}</span> {s.from} – {s.to}</button>
              {grid[i].map((r, m) => (
                <button
                  key={m}
                  role="cell"
                  className={`mx-cell ${m + 1 === now ? 'now' : ''} ${r.bloom ? 'bloom' : ''}`}
                  style={{ background: LEVELS[r.level].color }}
                  aria-label={`${s.from} – ${s.to}, ${MONTHS[m]}: ${LEVELS[r.level].name}`}
                  onMouseEnter={() => setCell({ s, m, r })}
                  onFocus={() => setCell({ s, m, r })}
                  onClick={() => setCell({ s, m, r })}
                />
              ))}
            </div>
          ))}
        </div>
        <aside className="mx-detail">
          {cell ? (
            <motion.div key={`${cell.s.n}-${cell.m}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mono eyebrow">מקטע {cell.s.n} · {MONTHS[cell.m]}</p>
              <h3>{cell.s.from} – {cell.s.to}</h3>
              <p className={`chip chip-${cell.r.level}`}>{LEVELS[cell.r.level].name}</p>
              <ul className="reasons">{cell.r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
              <Link className="btn" to={`/s/${cell.s.n}`}>לעמוד המקטע</Link>
            </motion.div>
          ) : (
            <p className="muted">העבירו את הסמן על תא כדי לראות למה הוא בצבע הזה. נקודה לבנה בתא: שיא פריחה לפי המדריך.</p>
          )}
          <ul className="legend-list">
            {Object.entries(LEVELS).map(([k, l]) => <li key={k}><i className="sw-line" style={{ background: l.color }} />{l.name}</li>)}
          </ul>
        </aside>
      </section>

      <section className="method" id="method">
        <h2>איך מחושב הרמזור</h2>
        <div className="method-grid">
          <div><b>1. העונה הרשמית</b><p>לכל מקטע, העונה המומלצת במדריך של החברה להגנת הטבע: סתיו עד אביב, חורף ואביב, או כל השנה.</p></div>
          <div><b>2. חום</b><p>ממוצע הטמפרטורה המרבית היומית בכל חודש, בנקודת האמצע של המקטע. עד 26 מעלות נוח, 27 עד 31 חם, מעל 31 עומס חום.</p></div>
          <div><b>3. גשם</b><p>שמונה ימי גשם או יותר בחודש: בוץ בצפון, וסכנת שיטפונות בערוצי המדבר.</p></div>
          <div><b>התוצאה</b><p><span style={{ color: LEVELS.go.color }}>ירוק</span>: בעונה, נוח ויבש. <span style={{ color: LEVELS.maybe.color }}>כתום</span>: בעונה אבל חם או גשום, או מחוץ לעונה אבל נוח. <span style={{ color: LEVELS.no.color }}>אדום</span>: עומס חום, או מחוץ לעונה וחם.</p></div>
        </div>
        <p className="muted small">
          {climate.source ? `מקור האקלים: ${climate.source}.` : 'נתוני האקלים עדיין לא נטענו, ולכן הרמזור מבוסס כרגע רק על העונה הרשמית.'} מגבלות: ממוצע חודשי אינו מבטיח יום מסוים, ונקודה אחת אינה מייצגת מקטע שיורד מאות מטרים.
          לפני יציאה: תחזית יומית (בעמוד המקטע) והתרעות שיטפונות של השירות המטאורולוגי.
        </p>
      </section>

      <section className="pheno" id="nature">
        <header className="page-head">
          <p className="mono eyebrow">PHENOLOGY · iNATURALIST</p>
          <h2>מה פורח ומי נודד, ומתי</h2>
          <p className="lead">
            כל עקומה היא מספר התצפיות המאומתות בכל חודש, בכל אחת משלוש רצועות רוחב. ב-<mark>{earlierSouth} מתוך {shift.length}</mark> הפרחים שנבדקו, השיא בדרום מגיע לפני הצפון או באותו חודש איתו.
            כך אפשר "ללכת עם הפריחה" מדרום לצפון.
          </p>
          <div className="row">{BANDS.map((b) => <span key={b.id} className="band-key"><i style={{ background: b.color }} />{b.name}</span>)}</div>
        </header>
        {['bloom', 'migration', 'wildlife'].map((k) => (
          <div key={k}>
            <h3 className="kind-head">{KIND[k]}</h3>
            <div className="species">
              {pheno.filter((p) => p.sp.kind === k).map(({ sp, peaks }) => (
                <article key={sp.sci} id={sp.sci.replace(/ /g, '-')} className="sp">
                  {sp.photo ? (
                    <a className="sp-photo" href={sp.photo.page} target="_blank" rel="noreferrer" title={sp.photo.by}>
                      <img src={sp.photo.src} alt={sp.he} loading="lazy" />
                    </a>
                  ) : <span className="sp-photo" />}
                  <div className="sp-body">
                    <h4>{sp.he} <i className="mono">{sp.sci}</i></h4>
                    <p>{sp.note}</p>
                    <Curves sp={sp} now={now} />
                    <p className="mono small muted">
                      {BANDS.filter((b) => peaks[b.id] != null).map((b) => `${b.name}: ${MONTHS_SHORT[peaks[b.id]]}`).join(' · ') || 'מעט מדי תצפיות לפילוח'}
                      {' · '}{fmt(sp.months.all.reduce((a, c) => a + c, 0))} תצפיות
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
        <p className="muted small">מקור: {nature.source}, נבנה ב-{nature.built}. התצפיות משקפות גם איפה ומתי אנשים מטיילים, ולכן מתאימות לזיהוי עיתוי ולא לספירת אוכלוסיות. התמונות ברישיון Creative Commons, הקישור מוביל לתצפית ולשם הצלם.</p>
      </section>
    </main>
  );
}

function Curves({ sp, now }) {
  const W = 240;
  const H = 54;
  const x = (i) => W - (i + 0.5) * (W / 12);
  return (
    <svg className="curves" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`עונתיות של ${sp.he}`}>
      <rect x={x(now - 1) - W / 24} width={W / 12} y="0" height={H} className="cv-now" />
      {BANDS.map((b) => {
        const v = sp.months[b.id];
        const max = Math.max(...v);
        if (!max || v.reduce((a, c) => a + c, 0) < 20) return null;
        const d = v.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${(H - 4 - (c / max) * (H - 10)).toFixed(1)}`).join('');
        return <motion.path key={b.id} d={d} fill="none" stroke={b.color} strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1 }} />;
      })}
      {MONTHS_SHORT.map((m, i) => (i % 3 === 0 ? <text key={m} x={x(i)} y={H - 0.5} textAnchor="middle" className="cv-m">{m}</text> : null))}
    </svg>
  );
}
