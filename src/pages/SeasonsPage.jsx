import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScaleLegend from '../components/ScaleLegend.jsx';
import KindTag from '../components/KindTag.jsx';
import { ALL, REGIONS, SUBREGIONS, MONTHS, MONTHS_SHORT, nature, climate, fmt } from '../lib/data.js';
import { suitability, scoreColor, currentMonth, BLOOM_COLOR } from '../lib/season.js';
import { ALL_EVENTS, KINDS, monthsText } from '../lib/phenomena.js';
import { moonEvents } from '../lib/moon.js';

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

  // ממוצע ציון משוקלל באורך, לכל אזור ולכל חודש
  const regionAvg = REGIONS.map((r) => {
    const rows = ALL.map((s, i) => [s, i]).filter(([s]) => s.region.id === r.id);
    const total = rows.reduce((n, [s]) => n + s.length, 0);
    const avg = MONTHS.map((_, m) => rows.reduce((n, [s, i]) => n + grid[i][m].score * s.length, 0) / total);
    const best = avg.map((v, m) => ({ v, m })).filter((x) => x.v >= 0.7).map((x) => x.m);
    return { r, avg, best };
  });
  const goodKm = MONTHS.map((_, m) => ALL.reduce((n, s, i) => n + (grid[i][m].score >= 0.6 ? s.length : 0), 0));
  const bestMonth = goodKm.indexOf(Math.max(...goodKm));
  const worstMonth = goodKm.indexOf(Math.min(...goodKm));

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
          לכל מקטע ולכל חודש יש <b>ציון התאמה מ-0 עד 100</b>. הצבע הוא סולם המלצה: ירוק כהה מצוין, צהוב בתנאים, אדום לא מומלץ.
          ב<mark>{MONTHS[bestMonth]}</mark> יש הכי הרבה קילומטרים בדרגת "טוב" ומעלה ({fmt(goodKm[bestMonth])} ק"מ), וב<b>{MONTHS[worstMonth]}</b> הכי מעט ({fmt(goodKm[worstMonth])} ק"מ).
        </p>
        <ScaleLegend bloom />
      </header>

      <section className="frame">
        <h2 className="frame-h">חלון עונתי לפי אזור <small className="mono">גובה העמודה וצבעה: ממוצע ההתאמה באזור, משוקלל באורך</small></h2>
        <div className="windows">
          {regionAvg.map(({ r, avg, best }) => (
            <div key={r.id} className="window" style={{ '--c': r.color }}>
              <b>{r.name}</b>
              <div className="win-bars" aria-hidden="true">
                {avg.map((v, m) => <i key={m} style={{ height: `${Math.max(4, v * 100)}%`, background: scoreColor(v) }} className={m + 1 === now ? 'now' : ''} title={`${MONTHS[m]}: ${Math.round(v * 100)}`} />)}
              </div>
              <div className="win-months mono" aria-hidden="true">{MONTHS_SHORT.map((m, i) => <span key={m} className={i + 1 === now ? 'now' : ''}>{m}</span>)}</div>
              <small>{best.length ? <>החלון הטוב: <b>{best.map((m) => MONTHS_SHORT[m]).join(', ')}</b></> : 'אין חודש עם ממוצע "טוב" ומעלה'}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="frame">
        <h2 className="frame-h">מקטע מול חודש <small className="mono">56 שורות, 12 עמודות. העבירו את הסמן על תא לפירוט</small></h2>
        <div className="matrix-wrap">
          <div className="matrix" role="table" aria-label="התאמה לפי מקטע וחודש">
            <div className="mx-row mx-head" role="row">
              <span className="mx-name" role="columnheader">מקטע</span>
              {MONTHS_SHORT.map((m, i) => <span key={m} role="columnheader" className={i + 1 === now ? 'now' : ''}>{m}</span>)}
            </div>
            {REGIONS.map((r) => (
              <div key={r.id} role="rowgroup" style={{ '--c': r.color }}>
                <div className="mx-group" role="row"><span role="rowheader">{r.name}</span><small className="mono">מקטעים {r.from}–{r.to}</small></div>
                {SUBREGIONS.filter((sr) => sr.region === r.id).map((sr) => (
                  <div key={sr.id}>
                    <div className="mx-sub" role="row"><span role="rowheader">{sr.name}</span></div>
                    {ALL.filter((s) => s.sub.id === sr.id).map((s) => {
                      const i = s.n - 1;
                      return (
                        <div key={s.n} className="mx-row" role="row">
                          <button className="mx-name" role="rowheader" onClick={() => nav(`/s/${s.n}`)}><span className="mono">{s.n}</span> {s.from} – {s.to}</button>
                          {grid[i].map((rr, m) => (
                            <button
                              key={m}
                              role="cell"
                              className={`mx-cell ${m + 1 === now ? 'now' : ''} ${rr.bloom ? 'bloom' : ''}`}
                              style={{ background: rr.color }}
                              aria-label={`${s.from} – ${s.to}, ${MONTHS[m]}: ${rr.bucket.name}`}
                              onMouseEnter={() => setCell({ s, m, r: rr })}
                              onFocus={() => setCell({ s, m, r: rr })}
                              onClick={() => setCell({ s, m, r: rr })}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <aside className="mx-detail">
            <p className="frame-label">פירוט התא</p>
            {cell ? (
              <motion.div key={`${cell.s.n}-${cell.m}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <p className="mono eyebrow">מקטע {cell.s.n} · {MONTHS[cell.m]}</p>
                <h3>{cell.s.from} – {cell.s.to}</h3>
                <p className="chip" style={{ background: cell.r.color }}>{cell.r.bucket.name} · {Math.round(cell.r.score * 100)}</p>
                <ul className="reasons">{cell.r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                <Link className="btn" to={`/s/${cell.s.n}`}>לעמוד המקטע</Link>
              </motion.div>
            ) : (
              <p className="muted">העבירו את הסמן על תא כדי לראות את הציון ואת הסיבות לו.</p>
            )}
            <ScaleLegend bloom />
          </aside>
        </div>
      </section>

      <section className="method frame" id="method">
        <h2>איך מחושב הציון</h2>
        <div className="method-grid">
          <div><b>1. עונה</b><p>בתוך העונה המומלצת במדריך של החברה להגנת הטבע: 100. מחוץ לה: 45.</p></div>
          <div><b>2. חום</b><p>ממוצע הטמפרטורה המרבית ביום, בנקודת האמצע של המקטע. עד 24 מעלות אין הפחתה; מ-24 עד 34 ההפחתה עולה בהדרגה עד 85.</p></div>
          <div><b>3. גשם</b><p>בצפון ובמרכז: מ-8 עד 16 ימי גשם בחודש ההפחתה עולה עד 35 (בוץ). במדבר הגשם מוסיף הערת שיטפונות ולא מוריד ציון, כי החורף הוא עונת השיא שם.</p></div>
          <div><b>4. פריחה</b><p>בחודשי שיא הפריחה לפי המדריך: תוספת 10, ופס <span style={{ color: BLOOM_COLOR, fontWeight: 600 }}>סגול</span> בתחתית התא.</p></div>
        </div>
        <p className="muted small">
          {climate.source ? `מקור האקלים: ${climate.source}.` : 'נתוני האקלים עדיין לא נטענו, ולכן הציון מבוסס כרגע רק על העונה הרשמית.'} מגבלות: ERA5 חם בכ-2 עד 3 מעלות בקיץ במישור החוף ובהרי ירושלים לעומת תחנות השירות המטאורולוגי.
          ממוצע חודשי אינו מבטיח יום מסוים. לפני יציאה: תחזית יומית (בעמוד המקטע) והתרעות שיטפונות.
        </p>
      </section>

      <YearCalendar now={now} />

      <section className="pheno frame" id="nature">
        <header className="page-head">
          <p className="mono eyebrow">PHENOLOGY · iNATURALIST</p>
          <h2>עקומות פריחה ונדידה</h2>
          <p className="lead">
            כל עקומה היא מספר התצפיות המאומתות בכל חודש, בכל אחת משלוש רצועות רוחב. ב-<mark>{earlierSouth} מתוך {shift.length}</mark> הפרחים שנבדקו, השיא בדרום מגיע לפני הצפון או באותו חודש איתו.
            כך אפשר "ללכת עם הפריחה" מדרום לצפון.
          </p>
          <div className="row">{BANDS.map((b) => <span key={b.id} className="band-key"><i style={{ background: b.color }} />{b.name}</span>)}<span className="band-key"><i className="now-key" />החודש הנוכחי</span></div>
        </header>
        {['bloom', 'migration', 'wildlife'].map((k) => (
          <div key={k}>
            <h3 className="kind-head"><KindTag kind={k === 'bloom' ? 'tzomeach' : 'chai'} /> {KIND[k]}</h3>
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
                      שיא: {BANDS.filter((b) => peaks[b.id] != null).map((b) => `${b.name} ${MONTHS_SHORT[peaks[b.id]]}`).join(' · ') || 'מעט מדי תצפיות לפילוח'}
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

/** לוח השנה: כל תופעה כפס על פני החודשים שלה, מקובץ לפי חי, צומח, דומם ושמיים. ינואר מימין. */
function YearCalendar({ now }) {
  const year = new Date().getFullYear();
  const moons = MONTHS.flatMap((_, i) => moonEvents(year, i + 1));
  const groups = ['chai', 'tzomeach', 'domem', 'shamayim'];
  const pos = (date) => {
    const d = typeof date === 'string' ? new Date(`${year}-${date}T12:00:00`) : date;
    const start = new Date(year, 0, 1);
    return (d - start) / (new Date(year + 1, 0, 1) - start);
  };
  return (
    <section className="frame" id="calendar">
      <h2 className="frame-h">לוח השנה בשביל <small className="mono">חי, צומח, דומם ושמיים · {year}</small></h2>
      <div className="ycal">
        <div className="yc-row yc-head" aria-hidden="true">
          <span className="yc-name" />
          <span className="yc-track">{MONTHS_SHORT.map((m, i) => <span key={m} className={i + 1 === now ? 'now' : ''}>{m}</span>)}</span>
        </div>
        {groups.map((k) => {
          const list = k === 'tzomeach' ? [] : ALL_EVENTS.filter((e) => e.kind === k && !e.geo && !e.date);
          const dated = ALL_EVENTS.filter((e) => e.kind === k && e.date);
          return (
            <div key={k} className="yc-group" style={{ '--k': KINDS[k].color }}>
              <div className="yc-ghead"><KindTag kind={k} /> <small>{KINDS[k].sub}</small></div>
              {list.map((e) => (
                <div key={e.name} className="yc-row">
                  <span className="yc-name"><b>{e.name}</b><small className="mono">{monthsText(e, MONTHS_SHORT)} · מקטעים {e.sections[0]}{e.sections[1] !== e.sections[0] ? `–${e.sections[1]}` : ''}</small></span>
                  <span className="yc-track">
                    {MONTHS.map((_, i) => <i key={i} className={`${e.monthList.includes(i + 1) ? 'in' : ''} ${i + 1 === now ? 'now' : ''}`} title={e.note || ''} />)}
                  </span>
                </div>
              ))}
              {k === 'tzomeach' && (
                <>
                  <p className="muted small yc-note">בכל חודש שלושה פסים: עליון צפון, אמצעי מרכז, תחתון דרום. כהה יותר = יותר תצפיות ביחס לשיא של אותו צמח באותה רצועה.</p>
                  {nature.species.filter((sp) => sp.kind === 'bloom').map((sp) => (
                    <div key={sp.sci} className="yc-row">
                      <Link className="yc-name" to={`#${sp.sci.replace(/ /g, '-')}`}><b>{sp.he}</b><small className="mono">{sp.sci}</small></Link>
                      <span className="yc-track yc-bands">
                        {MONTHS.map((_, i) => (
                          <span key={i} className={i + 1 === now ? 'now' : ''}>
                            {BANDS.map((b) => {
                              const v = sp.months[b.id];
                              const max = Math.max(...v);
                              const tot = v.reduce((a, c) => a + c, 0);
                              const a = tot >= 20 && max ? v[i] / max : 0;
                              return <i key={b.id} style={{ opacity: a < 0.15 ? 0.08 : 0.25 + a * 0.75 }} title={`${b.name}, ${MONTHS[i]}: ${v[i]} תצפיות`} />;
                            })}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {k === 'shamayim' && (
                <>
                  <div className="yc-row">
                    <span className="yc-name"><b>מטרי מטאורים ותקופות השנה</b><small className="mono">תאריכי שיא קבועים</small></span>
                    <span className="yc-track yc-dots">
                      {MONTHS.map((_, i) => <i key={i} className={i + 1 === now ? 'now' : ''} />)}
                      {dated.map((e) => <em key={e.name} style={{ right: `${pos(e.date) * 100}%` }} title={`${e.name}: ${monthsText(e, MONTHS_SHORT)}`} />)}
                    </span>
                  </div>
                  <ul className="sky-list">
                    {dated.map((e) => <li key={e.name}><b>{monthsText(e, MONTHS_SHORT)}</b> {e.name}</li>)}
                  </ul>
                  <div className="yc-row">
                    <span className="yc-name"><b>מולד וירח מלא</b><small className="mono">חישוב, דיוק של כחצי יום</small></span>
                    <span className="yc-track yc-dots">
                      {MONTHS.map((_, i) => <i key={i} className={i + 1 === now ? 'now' : ''} />)}
                      {moons.map((mo) => <b key={mo.date.toISOString()} className={`moon ${mo.type}`} style={{ right: `${pos(mo.date) * 100}%` }} title={`${mo.type === 'new' ? 'מולד' : 'ירח מלא'}: ${mo.date.toLocaleDateString('he-IL')}`} />)}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="yc-group" style={{ '--k': KINDS.domem.color }}>
          <div className="yc-ghead"><KindTag kind="domem" /> <small>גאולוגיה לאורך השביל, כל השנה</small></div>
          <ul className="geo-list">
            {ALL_EVENTS.filter((e) => e.geo).map((e) => (
              <li key={e.name}><Link to={`/s/${e.sections[0]}`}><b>{e.name}</b><small className="mono">מקטעים {e.sections[0]}{e.sections[1] !== e.sections[0] ? `–${e.sections[1]}` : ''}</small></Link><span>{e.note}</span></li>
            ))}
          </ul>
        </div>
        <p className="muted small">מקרא הירח: עיגול צהוב מלא = ירח מלא (לילה מואר, טוב להליכת לילה). עיגול חלול = מולד (לילה חשוך, טוב לכוכבים). מעוין = שיא מטר מטאורים או תקופת השנה.</p>
      </div>
    </section>
  );
}

function Curves({ sp, now }) {
  const W = 240;
  const H = 62;
  const x = (i) => W - (i + 0.5) * (W / 12);
  return (
    <svg className="curves" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`עונתיות של ${sp.he}`}>
      <rect x={x(now - 1) - W / 24} width={W / 12} y="0" height={H - 10} className="cv-now" />
      {BANDS.map((b) => {
        const v = sp.months[b.id];
        const max = Math.max(...v);
        if (!max || v.reduce((a, c) => a + c, 0) < 20) return null;
        const d = v.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${(H - 12 - (c / max) * (H - 18)).toFixed(1)}`).join('');
        return <motion.path key={b.id} d={d} fill="none" stroke={b.color} strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1 }} />;
      })}
      {MONTHS_SHORT.map((m, i) => <text key={m} x={x(i)} y={H - 1} textAnchor="middle" className="cv-m">{m}</text>)}
    </svg>
  );
}
