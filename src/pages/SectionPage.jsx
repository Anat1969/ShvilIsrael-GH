import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import TrailMap, { pointAt } from '../components/TrailMap.jsx';
import Legend from '../components/Legend.jsx';
import Profile from '../components/Profile.jsx';
import SeasonStrip from '../components/SeasonStrip.jsx';
import Photo from '../components/Photo.jsx';
import ClimateChart from '../components/ClimateChart.jsx';
import { ALL, MONTHS, loadTrail, fmt, hours, climate } from '../lib/data.js';
import { SEASON_TEXT } from '../data/sections.js';
import { suitability, currentMonth, difficulty } from '../lib/season.js';
import Verdict from '../components/Verdict.jsx';
import ScaleLegend from '../components/ScaleLegend.jsx';
import KindTag from '../components/KindTag.jsx';
import { eventsForSection, monthsText, KINDS } from '../lib/phenomena.js';
import { MONTHS_SHORT } from '../lib/data.js';
import { sunTimes, clock } from '../lib/sun.js';
import { forecast, recentNature } from '../lib/live.js';
import { useWalked } from '../lib/walked.js';
import Thumb from '../components/Thumb.jsx';
import { stationCount } from '../lib/guide.js';

export default function SectionPage() {
  const { n } = useParams();
  const s = ALL[Number(n) - 1] || ALL[0];
  const [params, setParams] = useSearchParams();
  const reverse = params.get('dir') === 'sn';
  const [trail, setTrail] = useState(null);
  const [hoverKm, setHoverKm] = useState(null);
  const [flyKm, setFlyKm] = useState(null);
  const [flying, setFlying] = useState(false);
  const [base, setBase] = useState('map');
  const [terrain, setTerrain] = useState(false);
  const stopRef = useRef(null);
  const mapRef = useRef(null);
  const { walked, toggle } = useWalked();
  const nav = useNavigate();
  const month = currentMonth();
  const r = suitability(s, month);
  const [pick, setPick] = useState(month);

  useEffect(() => { loadTrail().then(setTrail); }, []);
  useEffect(() => { stopRef.current?.(); setFlying(false); window.scrollTo({ top: 0 }); }, [s.n]);

  const t = trail?.sections[s.n - 1];
  const profile = useMemo(() => {
    if (!t) return null;
    return reverse ? t.profile.map(([k, e]) => [+(t.length - k).toFixed(2), e]).reverse() : t.profile;
  }, [t, reverse]);
  const km = flyKm ?? hoverKm;
  const markerPt = useMemo(() => {
    if (km == null || !t) return null;
    return pointAt(t.geom, reverse ? t.length - km : km);
  }, [km, t, reverse]);

  const flyingRef = useRef(false);
  const fly = () => {
    if (flyingRef.current) { stopRef.current?.(); return; }
    flyingRef.current = true;
    setFlying(true);
    stopRef.current = mapRef.current?.fly(s.n);
  };
  const onFly = (k) => {
    if (k == null) { flyingRef.current = false; setFlying(false); setFlyKm(null); return; }
    setFlyKm(reverse ? s.length - k : k);
  };

  const from = reverse ? s.to : s.from;
  const to = reverse ? s.from : s.to;
  const up = reverse ? s.down : s.up;
  const down = reverse ? s.up : s.down;
  const today = new Date();
  const sunA = sunTimes(today, ...(reverse ? s.end : s.start));
  const prev = ALL[s.n - 2];
  const next = ALL[s.n];
  const official = s.km;
  const diff = Math.abs(s.length - official) / official;

  return (
    <main className="section-page" style={{ '--c': s.color }}>
      <header className="s-head">
        <div className="s-title">
          <p className="mono eyebrow"><Link to="/">שביל ישראל</Link> · {s.region.name} · {s.sub.name}</p>
          <h1><span className="s-num mono">{s.n}</span>{from} – {to}</h1>
          <p className="lead">{s.lead}</p>
          <div className="row">
            <div className="seg" role="group" aria-label="כיוון הליכה">
              <button className={!reverse ? 'on' : ''} aria-pressed={!reverse} onClick={() => setParams({}, { replace: true })}>מצפון לדרום</button>
              <button className={reverse ? 'on' : ''} aria-pressed={reverse} onClick={() => setParams({ dir: 'sn' }, { replace: true })}>מדרום לצפון</button>
            </div>
            <Link className="btn guide-btn" to={`/s/${s.n}/guide${reverse ? '?dir=sn' : ''}`}>מדריך בכיס: {stationCount(s.n)} תחנות עם סיפור</Link>
            <button className={`check ${walked.has(s.n) ? 'on' : ''}`} aria-pressed={walked.has(s.n)} onClick={() => toggle(s.n)} title="נשמר בדפדפן הזה בלבד">
              {walked.has(s.n) ? 'הלכתי כאן' : 'סימון: הלכתי כאן'}
            </button>
          </div>
        </div>
        <Photo wiki={s.wiki} name={`${s.from} – ${s.to}`} color={s.color} withText />
      </header>

      <section className="tiles">
        <Tile k="אורך" v={`${fmt(s.length, 1)} ק"מ`} sub={`רשמי: ${fmt(official, 1)}${diff > 0.08 ? ' · ההפרש בגלל תוואי מעודכן או נקודות קצה' : ''}`} />
        <Tile k="עלייה מצטברת" v={`${fmt(up)} מ'`} sub={`ירידה: ${fmt(down)} מ'`} />
        <Tile k="גובה" v={`${fmt(s.min)} עד ${fmt(s.max)} מ'`} sub="מעל פני הים" />
        <Tile k="זמן הליכה" v={`${hours(Math.min(s.tobler, s.naismith))} עד ${hours(Math.max(s.tobler, s.naismith))}`} sub="שעות, בלי הפסקות" hint="טווח בין שני כללים מקובלים: נייסמית (5 קמ״ש ועוד שעה לכל 600 מ׳ עלייה) וטובלר (מהירות לפי שיפוע). פער גדול ביניהם = מקטע עם שיפועים חריגים." />
        <Tile k={`התאמה ל${MONTHS[month - 1]}`} v={`${r.bucket.name} · ${Math.round(r.score * 100)}`} color={r.color} sub={r.score < 0.6 ? `בעיקר בגלל: ${r.why}` : `בזכות: ${r.why}`} />
        <Tile k="קושי" v={difficulty(s).name} color={difficulty(s).color} sub={`${fmt(difficulty(s).kme, 1)} ק"מ־מאמץ`} hint="קילומטר־מאמץ (השיטה השווייצרית): ק״מ ועוד עלייה במטרים חלקי 100. עד 15 קל, עד 22 בינוני, עד 30 מאתגר, מעל 30 קשה." />
        <Tile k="אור יום היום" v={`${clock(sunA.rise)} – ${clock(sunA.set)}`} sub={`${fmt(sunA.daylight, 1)} שעות אור בנקודת ההתחלה`} hint="חישוב לפי אלגוריתם NOAA, דיוק של דקה עד שתיים. לא כולל הסתרה של הרים." />
      </section>

      <section className="s-map">
        <h2 className="frame-h">מפה ותבליט <small className="mono">התוואי המסומן, נקודות התחלה וסיום</small></h2>
        <div className="atlas-map tall">
          <TrailMap ref={mapRef} trail={trail} focus={s.n} marker={markerPt} base={base} terrain={terrain || flying} onSelect={(x) => x !== s.n && nav(`/s/${x}`)} onFly={onFly} reverse={reverse} />
          <Legend colorBy="region" base={base} setBase={setBase} terrain={terrain} setTerrain={setTerrain} />
          <button className={`fly ${flying ? 'on' : ''}`} onClick={fly} disabled={!trail}>{flying ? 'עצירת הטיסה' : 'טיסה לאורך המקטע'}</button>
        </div>
        <h2 className="frame-h">פרופיל גובה <small className="mono">{from} מימין, {to} משמאל</small></h2>
        {profile && (
          <Profile data={profile} marker={km} onHover={(k) => !flying && setHoverKm(k)} height={170} labels={[{ text: from, at: 0 }, { text: to, at: s.length * 0.97 }]} />
        )}
      </section>

      <section className="s-grid">
        <article className="card">
          <h2>מה בדרך</h2>
          <ul className="sites">{s.sites.map((x) => <li key={x}>{x}</li>)}</ul>
          <a className="btn" href={s.url} target="_blank" rel="noreferrer">המדריך הרשמי של המקטע</a>
          <p className="muted small">תיאור הדרך, נקודות מים ולינה, קיצורים ותחבורה ציבורית: באתר החברה להגנת הטבע. לפני יציאה כדאי לבדוק גם את <a href="https://www.teva.org.il/israel-national-trail" target="_blank" rel="noreferrer">עדכוני השביל</a>.</p>
        </article>
        <article className="card">
          <h2>לאורך השנה</h2>
          <h3 className="small-head">התאמה לטיול בכל חודש (ציון מ-0 עד 100). לחיצה על חודש מנמקת את הציון</h3>
          <SeasonStrip s={s} month={month} big onPick={setPick} picked={pick} />
          <Verdict s={s} r={suitability(s, pick)} monthName={MONTHS[pick - 1]} />
          <ScaleLegend bloom />
          <h3 className="small-head">אקלים: חום וגשם</h3>
          <ClimateChart s={s} />
          <p className="muted small">{climate.source ? `מקור האקלים: ${climate.source}.` : 'נתוני האקלים עדיין לא נטענו, ולכן הרמזור מבוסס כרגע רק על העונה הרשמית.'} כלל הרמזור מוסבר ב<Link to="/seasons#method">עמוד העונות</Link>.</p>
        </article>
        <Forecast s={s} />
        <Phenomena s={s} month={month} />
        <NatureNow s={s} />
      </section>

      <nav className="prevnext">
        {prev ? <Link to={`/s/${prev.n}`} className="pn"><small className="mono">מקטע {prev.n}</small>{prev.from} – {prev.to}</Link> : <span />}
        {next ? <Link to={`/s/${next.n}`} className="pn pn-next"><small className="mono">מקטע {next.n}</small>{next.from} – {next.to}</Link> : <span />}
      </nav>
    </main>
  );
}

function Tile({ k, v, sub, color, hint }) {
  return (
    <motion.div className="tile" style={color ? { borderTopColor: color, '--v': color } : undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} title={hint}>
      <span className="mono">{k}</span>
      <b>{v}</b>
      {sub && <small>{sub}</small>}
      {hint && <small className="hint">{hint}</small>}
    </motion.div>
  );
}

function Forecast({ s }) {
  const [days, setDays] = useState(undefined);
  useEffect(() => {
    let live = true;
    setDays(undefined);
    forecast(s.mid, Math.round((s.min + s.max) / 2)).then((d) => live && setDays(d));
    return () => { live = false; };
  }, [s.n]);
  return (
    <article className="card">
      <h2>תחזית לימים הקרובים</h2>
      {days === undefined && <p className="muted">טוען תחזית</p>}
      {days === null && <p className="muted">התחזית לא זמינה כרגע. אפשר לבדוק ב<a href="https://ims.gov.il/he/Forecasts" target="_blank" rel="noreferrer">השירות המטאורולוגי</a>.</p>}
      {days && (
        <ul className="fc">
          {days.map((d) => (
            <li key={d.date.toISOString()} className={d.tmax > 31 ? 'hot' : ''}>
              <span className="mono">{d.date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
              <b>{Math.round(d.tmax)}°</b>
              <small>{Math.round(d.tmin)}° בלילה</small>
              <small>{d.rain != null ? `גשם ${d.rain}%` : ''}</small>
              <small>רוח {Math.round(d.wind)} קמ"ש</small>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Open-Meteo, בנקודת האמצע של המקטע ובגובה הממוצע שלו. מעל 31 מעלות: מסומן באדום.</p>
    </article>
  );
}

function NatureNow({ s }) {
  const [kind, setKind] = useState('Plantae');
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let live = true;
    setData(undefined);
    recentNature(s.bbox, kind).then((d) => live && setData(d));
    return () => { live = false; };
  }, [s.n, kind]);
  return (
    <article className="card card-wide">
      <div className="card-head">
        <h2>נצפה כאן לאחרונה</h2>
        <div className="seg" role="group" aria-label="סוג תצפית">
          {[['Plantae', 'צמחים'], ['Aves', 'ציפורים'], ['Animalia', 'בעלי חיים']].map(([k, l]) => (
            <button key={k} className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
      </div>
      {data === undefined && <p className="muted">טוען תצפיות</p>}
      {data === null && <p className="muted">התצפיות לא זמינות כרגע.</p>}
      {data && data.items.length === 0 && <p className="muted">אין תצפיות עם תמונה ב-45 הימים האחרונים בתחום המקטע.</p>}
      {data && data.items.length > 0 && (
        <>
          <div className="obs">
            {data.items.slice(0, 12).map((o) => (
              <a key={o.id} href={o.url} target="_blank" rel="noreferrer" className="ob">
                <img src={o.photo} alt={o.name} loading="lazy" />
                <span>{o.name}<small className="mono">{o.date}{o.grade === 'research' ? ' · מאומת' : ''}</small></span>
              </a>
            ))}
          </div>
          <p className="muted small">{fmt(data.total)} תצפיות ב-45 הימים האחרונים, מתוך iNaturalist. "מאומת" = זיהוי שאושר על ידי שני משתתפים לפחות.</p>
        </>
      )}
    </article>
  );
}

function Phenomena({ s, month }) {
  const evs = eventsForSection(s.n);
  return (
    <article className="card card-wide">
      <h2>חי, צומח ודומם במקטע</h2>
      <p className="muted small">מה קורה כאן לאורך השנה. החודש הנוכחי מודגש. צומח: לפי תצפיות iNaturalist ברצועת הרוחב של המקטע.</p>
      <div className="kinds">
        {['chai', 'tzomeach', 'domem', 'shamayim'].map((k) => {
          const list = evs.filter((e) => e.kind === k);
          if (!list.length) return null;
          return (
            <section key={k} className="kind-col" style={{ '--k': KINDS[k].color }}>
              <h3><KindTag kind={k} /> <small>{KINDS[k].sub}</small></h3>
              <ul>
                {list.map((e) => {
                  const now = e.monthList.includes(month) && e.monthList.length < 12;
                  return (
                    <li key={e.name} className={`${now ? 'now' : ''} ${k === 'tzomeach' ? 'compact' : 'with-thumb'}`}>
                      {k !== 'tzomeach' && <Thumb title={e.wiki} color={KINDS[k].color} size={56} />}
                      <b>{k === 'tzomeach' ? e.name.replace(/ ב(צפון|מרכז|דרום)$/, '') : e.name}</b>
                      <span className="mono">{monthsText(e, MONTHS_SHORT)}{now ? ' · עכשיו' : ''}</span>
                      {e.note && k !== 'tzomeach' && <small>{e.note}</small>}
                      <MonthDots list={e.monthList} month={month} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function MonthDots({ list, month }) {
  return (
    <span className="mdots" aria-hidden="true">
      {MONTHS_SHORT.map((m, i) => <i key={m} className={`${list.includes(i + 1) ? 'in' : ''} ${month === i + 1 ? 'cur' : ''}`} title={m} />)}
    </span>
  );
}
