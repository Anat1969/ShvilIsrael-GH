import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TrailMap, { pointAt } from '../components/TrailMap.jsx';
import Legend from '../components/Legend.jsx';
import Profile from '../components/Profile.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import SeasonStrip from '../components/SeasonStrip.jsx';
import ScaleLegend from '../components/ScaleLegend.jsx';
import KindTag from '../components/KindTag.jsx';
import Photo from '../components/Photo.jsx';
import { ALL, REGIONS, SUBREGIONS, OVERVIEW, TOTAL_KM, MONTHS, MONTHS_SHORT, loadTrail, sectionAtKm, fmt } from '../lib/data.js';
import { suitability, SCALE, currentMonth } from '../lib/season.js';
import { eventsInMonth, monthsText, KINDS } from '../lib/phenomena.js';
import { moonEvents } from '../lib/moon.js';
import { useWalked } from '../lib/walked.js';

const REGION_TEXT = {
  galil: 'מהחרמון המושלג אל מעיינות הבניאס, עמק החולה, הר מירון והכנרת, ואז הרי הגליל התחתון עד מרגלות הכרמל.',
  coast: 'רכס הכרמל הירוק, ואחריו חופים, מצוקי כורכר ודיונות לאורך מישור החוף, ועד מקורות הירקון.',
  shfela: 'גבעות השפלה, יערות, מעיינות ונקבות בהרי ירושלים, תלים מקראיים בשפלת יהודה ויער יתיר.',
  judea: 'מערד יורדים למדבר: הקניון של נחל צאלים, מצדה, ים המלח במקום הנמוך בעולם וגבי פרס.',
  negev: 'שלושת המכתשים, הערבה והרי אילת. ארוך, צחיח ומרשים. דורש תכנון מים והטמנות.',
};

export default function Home() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [trail, setTrail] = useState(null);
  const month = Number(params.get('m')) || currentMonth();
  const colorBy = params.get('c') === 'region' ? 'region' : 'season';
  const focus = Number(params.get('s')) || null;
  const [base, setBase] = useState('map');
  const [terrain, setTerrain] = useState(false);
  const [hoverKm, setHoverKm] = useState(null);
  const { walked } = useWalked();
  const mapRef = useRef(null);

  useEffect(() => { loadTrail().then(setTrail); }, []);
  const set = (k, v) => {
    const p = new URLSearchParams(params);
    if (v == null) p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const levels = useMemo(() => ALL.map((s) => suitability(s, month)), [month]);
  const counts = Object.fromEntries(SCALE.map((b) => [b.id, 0]));
  levels.forEach((l) => { counts[l.level] += 1; });
  const kmGood = ALL.reduce((n, s, i) => n + (levels[i].score >= 0.6 ? s.length : 0), 0);
  const picks = ALL.map((s, i) => ({ s, r: levels[i] })).sort((a, b) => b.r.score - a.r.score).slice(0, 4);
  const events = eventsInMonth(month);
  const year = new Date().getFullYear();
  const moon = moonEvents(year, month);

  const bands = ALL.map((s, i) => ({ n: s.n, from: s.startKm, to: s.startKm + s.length, color: colorBy === 'season' ? levels[i].color : s.color, dim: focus && focus !== s.n }));
  const markerPt = useMemo(() => {
    if (hoverKm == null || !trail) return null;
    const s = sectionAtKm(hoverKm);
    const t = trail.sections[s.n - 1];
    return pointAt(t.geom, hoverKm - s.startKm);
  }, [hoverKm, trail]);
  const hovered = hoverKm != null ? sectionAtKm(hoverKm) : null;
  const f = focus ? ALL[focus - 1] : null;
  const fr = f ? levels[focus - 1] : null;
  const maxE = Math.max(...ALL.map((s) => s.max));
  const minE = Math.min(...ALL.map((s) => s.min));
  const totalUp = ALL.reduce((n, s) => n + s.up, 0);
  const goTo = (n) => set('s', n);

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow mono">ISRAEL NATIONAL TRAIL · 56 SECTIONS</p>
          <h1>{fmt(TOTAL_KM)} ק"מ<br />מהחרמון לאילת</h1>
          <p className="lead">
            השביל חוצה את כל אזורי האקלים של הארץ: מ-<b>{fmt(maxE)} מטר</b> על מורדות החרמון ועד <b>{fmt(Math.abs(minE))} מטר מתחת לפני הים</b> ליד ים המלח.
            בדרך מצטברים <b>{fmt(totalUp)} מטר</b> של עליות. בחרו חודש, והמפה תראה <mark>איפה כדאי ללכת עכשיו</mark>.
          </p>
        </div>
        <div className="hero-controls">
          <div className="keys">
            <div><span>מקטעים</span><b>56</b></div>
            <div><span>אזורים</span><b>5</b></div>
            <div><span>הנקודה הגבוהה</span><b>{fmt(maxE)}</b><small>מטר</small></div>
            <div><span>הנקודה הנמוכה</span><b>{fmt(minE)}</b><small>מטר</small></div>
          </div>
          <span className="ctl-label">בחירת חודש</span>
          <MonthPicker month={month} setMonth={(m) => set('m', m)} />
          <div className="row">
            <span className="ctl-label">צביעת השביל</span>
            <div className="seg" role="group" aria-label="צביעת השביל">
              <button className={colorBy === 'season' ? 'on' : ''} aria-pressed={colorBy === 'season'} onClick={() => set('c', null)}>התאמה לחודש</button>
              <button className={colorBy === 'region' ? 'on' : ''} aria-pressed={colorBy === 'region'} onClick={() => set('c', 'region')}>אזורים</button>
            </div>
          </div>
        </div>
      </section>

      <section className="atlas">
        <div className="atlas-map">
          <span className="frame-title">מפת השביל · {colorBy === 'season' ? `התאמה ל${MONTHS[month - 1]}` : 'חמשת האזורים'}</span>
          <TrailMap ref={mapRef} trail={trail} month={month} colorBy={colorBy} focus={focus} marker={markerPt} base={base} terrain={terrain} onSelect={goTo} />
          <Legend colorBy={colorBy} base={base} setBase={setBase} terrain={terrain} setTerrain={setTerrain} monthName={MONTHS[month - 1]} />
          {!trail && <div className="map-loading mono">טוען את התוואי</div>}
        </div>

        <aside className="now">
          <AnimatePresence mode="wait">
            {f ? (
              <motion.div key={`f${f.n}`} className="focus" style={{ '--c': f.color }} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <p className="frame-label">מקטע נבחר</p>
                <p className="mono eyebrow" style={{ color: f.color }}>מקטע {f.n} · {f.region.name}</p>
                <h2>{f.from} – {f.to}</h2>
                <p>{f.lead}</p>
                <div className="kv">
                  <span><b>{fmt(f.length, 1)}</b> ק"מ</span>
                  <span><b>{fmt(f.up)}</b> מ' עלייה</span>
                  <span><b>{fmt(f.down)}</b> מ' ירידה</span>
                </div>
                <h3 className="small-head">התאמה לאורך השנה</h3>
                <SeasonStrip s={f} month={month} labels />
                <p className="chip" style={{ background: fr.color }}>{MONTHS[month - 1]}: {fr.bucket.name} · {Math.round(fr.score * 100)}</p>
                <ul className="reasons">{fr.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="row">
                  <Link className="btn" to={`/s/${f.n}`}>לעמוד המקטע</Link>
                  <button className="btn-quiet" onClick={() => set('s', null)}>חזרה לכל השביל</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="now" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <p className="frame-label">עכשיו בשביל · {MONTHS[month - 1]}</p>
                <div className="tally" role="img" aria-label="חלוקת המקטעים לפי דרגות">
                  {SCALE.map((b) => <motion.i key={b.id} layout style={{ flexGrow: counts[b.id], background: b.color }} title={`${b.name}: ${counts[b.id]}`} />)}
                </div>
                <ul className="tally-keys">
                  {SCALE.map((b) => <li key={b.id}><i style={{ background: b.color }} /><b>{counts[b.id]}</b> {b.name}</li>)}
                </ul>
                <p className="tally-text"><mark>{fmt(kmGood)} ק"מ בדרגת "טוב" ומעלה</mark> ב{MONTHS[month - 1]}.</p>

                <h3 className="small-head">הכי מתאים החודש</h3>
                <ul className="picks">
                  {picks.map(({ s, r }) => (
                    <li key={s.n}>
                      <button onClick={() => goTo(s.n)}>
                        <span className="pick-n mono" style={{ background: r.color }}>{s.n}</span>
                        <span><b>{s.from} – {s.to}</b><small>{r.bucket.name}{r.bloom ? ' · שיא הפריחה' : ''}{r.t != null ? ` · כ-${Math.round(r.t)} מעלות ביום` : ''}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>

                <h3 className="small-head">החודש בשביל: חי, צומח, דומם ושמיים</h3>
                <ul className="events">
                  {['chai', 'tzomeach', 'domem', 'shamayim'].map((k) => {
                    const list = events.filter((e) => e.kind === k).slice(0, k === 'tzomeach' ? 4 : 3);
                    const extra = k === 'shamayim' ? moon.map((mo) => ({ name: mo.type === 'new' ? 'מולד הירח: לילה חשוך' : 'ירח מלא: לילה מואר', when: mo.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }) })) : [];
                    if (!list.length && !extra.length) return null;
                    return (
                      <li key={k} className="ev-group" style={{ '--k': KINDS[k].color }}>
                        <KindTag kind={k} />
                        <ul>
                          {list.map((e) => (
                            <li key={e.name}>
                              <button onClick={() => goTo(e.sections[0])} title={e.note}><b>{e.name}</b><small>{monthsText(e, MONTHS_SHORT)} · מקטעים {e.sections[0]}{e.sections[1] !== e.sections[0] ? `–${e.sections[1]}` : ''}</small></button>
                            </li>
                          ))}
                          {extra.map((e) => <li key={e.name + e.when}><span><b>{e.name}</b><small>{e.when}</small></span></li>)}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
                <p className="method"><Link to="/seasons#method">איך מחושבת ההתאמה</Link> · <Link to="/seasons#calendar">לוח השנה המלא</Link></p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </section>

      <section className="overview">
        <div className="overview-head">
          <h2>פרופיל הגובה של המדינה</h2>
          <p className="muted">
            {hovered ? <span>מקטע {hovered.n}: <b>{hovered.from} – {hovered.to}</b></span> : 'העבירו את הסמן על הפרופיל כדי לראות את המקום במפה. לחיצה פותחת את המקטע.'}
          </p>
        </div>
        <Profile
          data={OVERVIEW}
          bands={bands}
          marker={null}
          height={190}
          onHover={setHoverKm}
          onPick={(k) => set('s', sectionAtKm(k).n)}
          labels={REGIONS.map((r) => ({ text: r.name, at: ALL[r.from - 1].startKm }))}
        />
        {colorBy === 'season' && <ScaleLegend title={`צבע הפס: התאמה ל${MONTHS[month - 1]}`} />}
      </section>

      <section className="regions">
        <header className="regions-head">
          <h2>56 המקטעים, לפי אזורים</h2>
          <ScaleLegend title="פס החודשים בכל שורה: התאמה לטיול" bloom />
        </header>
        {REGIONS.map((r) => {
          const list = ALL.filter((s) => s.region.id === r.id);
          const km = list.reduce((n, s) => n + s.length, 0);
          const done = list.filter((s) => walked.has(s.n)).length;
          return (
            <motion.article key={r.id} className="region" style={{ '--c': r.color }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}>
              <header className="region-head">
                <Photo wiki={ALL[r.from - 1].wiki} name={r.name} color={r.color} />
                <div>
                  <p className="mono eyebrow">אזור · מקטעים {r.from} עד {r.to} · {fmt(km)} ק"מ{done ? ` · הלכתי ${done}` : ''}</p>
                  <h2>{r.name}</h2>
                  <p>{REGION_TEXT[r.id]}</p>
                </div>
              </header>
              {SUBREGIONS.filter((sr) => sr.region === r.id).map((sr) => (
                <div key={sr.id} className="sub">
                  <h3 className="sub-name">{sr.name} <span className="mono">מקטעים {sr.from}–{sr.to}</span></h3>
                  <div className="sec-row sec-head mono" aria-hidden="true">
                    <span>מס'</span>
                    <span>מקטע ואתרים</span>
                    <span>פרופיל</span>
                    <span>אורך</span>
                    <span className="sec-head-months">{MONTHS_SHORT.map((m, i) => <i key={m} className={month === i + 1 ? 'on' : ''}>{m}</i>)}</span>
                  </div>
                  <ol className="sec-list">
                    {list.filter((s) => s.sub.id === sr.id).map((s) => (
                      <li key={s.n}>
                        <button className={`sec-row ${walked.has(s.n) ? 'walked' : ''}`} onClick={() => nav(`/s/${s.n}`)}>
                          <span className="sec-n mono">{s.n}</span>
                          <span className="sec-name"><b>{s.from} – {s.to}</b><small>{s.sites.slice(0, 3).join(' · ')}</small></span>
                          <Spark s={s} />
                          <span className="sec-km mono"><span><b>{fmt(s.length, 1)}</b> ק"מ</span><small>{fmt(s.up)}+ מ'</small></span>
                          <SeasonStrip s={s} month={month} />
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </motion.article>
          );
        })}
      </section>
      <footer className="foot">
        <p>מקורות: תוואי השביל מ-OpenStreetMap, חלוקת המקטעים והעונות מהמדריכים של <a href="https://www.teva.org.il/israel-national-trail" target="_blank" rel="noreferrer">החברה להגנת הטבע</a>, גבהים מ-AWS Terrain Tiles, אקלים מ-ERA5, תצפיות טבע מ-iNaturalist, תמונות מוויקיפדיה. אפליקציה עצמאית, לא של החברה להגנת הטבע.</p>
      </footer>
    </main>
  );
}

/** קו גובה זעיר של המקטע מתוך פרופיל הארץ. */
function Spark({ s }) {
  const pts = OVERVIEW.filter((p) => p[0] >= s.startKm && p[0] <= s.startKm + s.length);
  if (pts.length < 2) return <span className="spark" />;
  const lo = Math.min(...pts.map((p) => p[1]));
  const hi = Math.max(...pts.map((p) => p[1]));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(100 - ((p[0] - s.startKm) / s.length) * 100).toFixed(1)},${(26 - ((p[1] - lo) / Math.max(60, hi - lo)) * 22).toFixed(1)}`).join('');
  return (
    <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d}L0,28L100,28Z`} fill="var(--c)" opacity="0.18" />
      <path d={d} fill="none" stroke="var(--c)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
