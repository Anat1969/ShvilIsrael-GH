import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TrailMap, { pointAt } from '../components/TrailMap.jsx';
import Legend from '../components/Legend.jsx';
import Profile from '../components/Profile.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import SeasonStrip from '../components/SeasonStrip.jsx';
import Photo from '../components/Photo.jsx';
import { ALL, REGIONS, OVERVIEW, TOTAL_KM, MONTHS, nature, loadTrail, sectionAtKm, fmt } from '../lib/data.js';
import { suitability, LEVELS, currentMonth } from '../lib/season.js';
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
  const counts = { go: 0, maybe: 0, no: 0 };
  levels.forEach((l) => { counts[l.level] += 1; });
  const kmGreen = ALL.reduce((n, s, i) => n + (levels[i].level === 'go' ? s.length : 0), 0);
  const picks = ALL.map((s, i) => ({ s, r: levels[i] }))
    .filter((x) => x.r.level === 'go')
    .sort((a, b) => (b.r.bloom - a.r.bloom) || Math.abs((a.r.t ?? 22) - 21) - Math.abs((b.r.t ?? 22) - 21))
    .slice(0, 4);
  const blooming = nature.species
    .map((sp) => {
      const v = sp.months.all;
      const max = Math.max(...v);
      return { sp, share: max ? v[month - 1] / max : 0 };
    })
    .filter((x) => x.share >= 0.5)
    .sort((a, b) => b.share - a.share);

  const bands = ALL.map((s, i) => ({ n: s.n, from: s.startKm, to: s.startKm + s.length, color: colorBy === 'season' ? LEVELS[levels[i].level].color : s.color, dim: focus && focus !== s.n }));
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
            <div><b>56</b><span>מקטעים</span></div>
            <div><b>5</b><span>אזורים</span></div>
            <div><b>{fmt(maxE)}</b><span>מטר, הגבוה</span></div>
            <div><b>{fmt(minE)}</b><span>מטר, הנמוך</span></div>
          </div>
          <MonthPicker month={month} setMonth={(m) => set('m', m)} />
          <div className="seg" role="group" aria-label="צביעת השביל">
            <button className={colorBy === 'season' ? 'on' : ''} aria-pressed={colorBy === 'season'} onClick={() => set('c', null)}>רמזור עונתי</button>
            <button className={colorBy === 'region' ? 'on' : ''} aria-pressed={colorBy === 'region'} onClick={() => set('c', 'region')}>אזורים</button>
          </div>
        </div>
      </section>

      <section className="atlas">
        <div className="atlas-map">
          <TrailMap ref={mapRef} trail={trail} month={month} colorBy={colorBy} focus={focus} marker={markerPt} base={base} terrain={terrain} onSelect={(n) => set('s', n)} />
          <Legend colorBy={colorBy} base={base} setBase={setBase} terrain={terrain} setTerrain={setTerrain} monthName={MONTHS[month - 1]} />
          {!trail && <div className="map-loading mono">טוען את התוואי</div>}
        </div>

        <aside className="now">
          <AnimatePresence mode="wait">
            {f ? (
              <motion.div key={`f${f.n}`} className="focus" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <p className="mono eyebrow" style={{ color: f.color }}>מקטע {f.n} · {f.region.name}</p>
                <h2>{f.from} – {f.to}</h2>
                <p>{f.lead}</p>
                <div className="kv">
                  <span><b>{fmt(f.length, 1)}</b> ק"מ</span>
                  <span><b>{fmt(f.up)}</b> מ' עלייה</span>
                  <span><b>{fmt(f.down)}</b> מ' ירידה</span>
                </div>
                <SeasonStrip s={f} month={month} />
                <p className={`chip chip-${fr.level}`}>{MONTHS[month - 1]}: {LEVELS[fr.level].name}</p>
                <ul className="reasons">{fr.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="row">
                  <Link className="btn" to={`/s/${f.n}`}>לעמוד המקטע</Link>
                  <button className="btn-quiet" onClick={() => set('s', null)}>חזרה לכל השביל</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="now" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <p className="mono eyebrow">עכשיו בשביל · {MONTHS[month - 1]}</p>
                <div className="tally" role="img" aria-label="חלוקת המקטעים ברמזור">
                  {Object.entries(counts).map(([k, v]) => (
                    <motion.i key={k} layout style={{ flexGrow: v, background: LEVELS[k].color }} title={`${LEVELS[k].name}: ${v}`} />
                  ))}
                </div>
                <p className="tally-text">
                  <b style={{ color: LEVELS.go.color }}>{counts.go} מקטעים מומלצים</b>, {counts.maybe} בתנאים, {counts.no} לא מומלצים.
                  {' '}<mark>{fmt(kmGreen)} ק"מ ירוקים</mark> ב{MONTHS[month - 1]}.
                </p>
                {picks.length > 0 && (
                  <>
                    <h3 className="mono small-head">ההמלצות לחודש</h3>
                    <ul className="picks">
                      {picks.map(({ s, r }) => (
                        <li key={s.n}>
                          <button onClick={() => set('s', s.n)}>
                            <span className="pick-n mono" style={{ background: s.color }}>{s.n}</span>
                            <span><b>{s.from} – {s.to}</b><small>{r.bloom ? 'שיא הפריחה · ' : ''}{r.t != null ? `כ-${Math.round(r.t)} מעלות ביום` : s.region.name}</small></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {blooming.length > 0 && (
                  <>
                    <h3 className="mono small-head">בשיא החודש, לפי תצפיות</h3>
                    <div className="bloom-row">
                      {blooming.slice(0, 6).map(({ sp }) => (
                        <Link key={sp.sci} to={`/seasons#${sp.sci.replace(/ /g, '-')}`} className="bloom-chip" title={sp.note}>
                          {sp.photo && <img src={sp.photo.src} alt="" loading="lazy" />}
                          <span>{sp.he}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <p className="method"><Link to="/seasons#method">איך מחושב הרמזור</Link></p>
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
      </section>

      <section className="regions">
        {REGIONS.map((r) => {
          const list = ALL.filter((s) => s.region.id === r.id);
          const km = list.reduce((n, s) => n + s.length, 0);
          const done = list.filter((s) => walked.has(s.n)).length;
          return (
            <motion.article key={r.id} className="region" style={{ '--c': r.color }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}>
              <header className="region-head">
                <Photo wiki={ALL[r.from - 1].wiki} name={r.name} color={r.color} />
                <div>
                  <p className="mono eyebrow">מקטעים {r.from} עד {r.to} · {fmt(km)} ק"מ{done ? ` · הלכתי ${done}` : ''}</p>
                  <h2>{r.name}</h2>
                  <p>{REGION_TEXT[r.id]}</p>
                </div>
              </header>
              <ol className="sec-list">
                {list.map((s) => (
                  <li key={s.n}>
                    <button className={`sec-row ${walked.has(s.n) ? 'walked' : ''}`} onClick={() => nav(`/s/${s.n}`)}>
                      <span className="sec-n mono">{s.n}</span>
                      <span className="sec-name"><b>{s.from} – {s.to}</b><small>{s.sites.slice(0, 3).join(' · ')}</small></span>
                      <Spark s={s} />
                      <span className="sec-km mono">{fmt(s.length, 1)} ק"מ<small>{fmt(s.up)}+ מ'</small></span>
                      <SeasonStrip s={s} month={month} />
                    </button>
                  </li>
                ))}
              </ol>
            </motion.article>
          );
        })}
      </section>
      <footer className="foot">
        <p>מקורות: תוואי השביל מ-OpenStreetMap, חלוקת המקטעים והעונות מהמדריכים של <a href="https://www.teva.org.il/israel-national-trail" target="_blank" rel="noreferrer">החברה להגנת הטבע</a>, גבהים מ-AWS Terrain Tiles, תצפיות טבע מ-iNaturalist, תמונות מוויקיפדיה. אפליקציה עצמאית, לא של החברה להגנת הטבע.</p>
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
