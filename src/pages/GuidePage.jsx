import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import TrailMap from '../components/TrailMap.jsx';
import Legend from '../components/Legend.jsx';
import Photo from '../components/Photo.jsx';
import { ALL, loadTrail, fmt } from '../lib/data.js';
import { difficulty } from '../lib/season.js';
import { KNOWLEDGE } from '../data/knowledge.js';
import { KINDS } from '../data/phenomena.js';
import { dayEvents } from '../lib/profiles.js';
import SectionSigns from '../components/SectionSigns.jsx';
import Sign from '../components/Sign.jsx';
import { stationsFor, quizFor, maxPoints, useGuide, usePosition, meters, direction, speak, stopSpeaking, POINTS, ARRIVE_M } from '../lib/guide.js';

export default function GuidePage() {
  const { n } = useParams();
  const s = ALL[Number(n) - 1] || ALL[0];
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const reverse = params.get('dir') === 'sn';
  const [trail, setTrail] = useState(null);
  const [active, setActive] = useState(1);
  const [speaking, setSpeaking] = useState(null);
  const [base, setBase] = useState('map');
  const [terrain, setTerrain] = useState(false);
  const { state, update, points } = useGuide(s.n);
  const gps = usePosition();
  const refs = useRef({});

  useEffect(() => { loadTrail().then(setTrail); }, []);
  useEffect(() => () => stopSpeaking(), []);
  const t = trail?.sections[s.n - 1];
  const stations = useMemo(() => stationsFor(s.n, t, reverse), [s.n, t, reverse]);
  const quiz = quizFor(s.n);
  const max = maxPoints(s.n);
  const k = KNOWLEDGE[s.region.id];
  const from = reverse ? s.to : s.from;
  const to = reverse ? s.from : s.to;
  const done = stations.filter((x) => state.visited[x.i]).length;
  const complete = stations.length > 0 && done === stations.length && (!quiz || state.quiz);

  // מיקום חי: מרחק לכל תחנה, והגעה אוטומטית בטווח של 150 מטר
  const near = useMemo(() => {
    if (!gps.pos) return null;
    const list = stations.map((x) => ({ x, m: meters(gps.pos.at, [x.lat, x.lon]) }));
    const next = list.find((l) => !state.visited[l.x.i]) || list[list.length - 1];
    const closest = list.reduce((a, b) => (b.m < a.m ? b : a), list[0]);
    return { next, closest };
  }, [gps.pos, stations, state.visited]);
  useEffect(() => {
    if (!near) return;
    const { closest } = near;
    if (closest && closest.m <= ARRIVE_M && state.visited[closest.x.i] !== 'gps') {
      update((g) => ({ ...g, visited: { ...g.visited, [closest.x.i]: 'gps' } }));
      setActive(closest.x.k);
    }
  }, [near]); // eslint-disable-line react-hooks/exhaustive-deps

  // בחירה ברשימה או במפה: התחנה נפתחת ליד המפה, בלי לגלול. "לכרטיס המלא" גולל אליו.
  const go = (kk) => setActive(kk);
  const toCard = (kk) => refs.current[kk]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const answerSq = (x, j) => update((g) => (g.sq[x.i] ? g : { ...g, sq: { ...g.sq, [x.i]: { picked: j, correct: j === x.sq.a } } }));
  const cur = stations.find((x) => x.k === active) || stations[0];
  const read = (x) => {
    if (speaking === x.k) { stopSpeaking(); setSpeaking(null); return; }
    const ok = speak(`תחנה ${x.k}. ${x.name}. ${x.story} תשימו לב: ${x.look}`, () => setSpeaking(null));
    setSpeaking(ok ? x.k : 'none');
  };
  const markVisit = (x) => update((g) => {
    const v = { ...g.visited };
    if (v[x.i]) delete v[x.i]; else v[x.i] = 'self';
    return { ...g, visited: v };
  });
  const markLook = (x) => update((g) => {
    const l = { ...g.look };
    if (l[x.i]) delete l[x.i]; else l[x.i] = true;
    return { ...g, look: l };
  });
  const answer = (i) => update((g) => (g.quiz ? g : { ...g, quiz: { picked: i, correct: i === quiz.a } }));
  const reset = () => update(() => ({ visited: {}, look: {}, sq: {}, quiz: null }));

  if (!stations.length && trail) {
    return <main className="guide"><p className="muted">אין עדיין תחנות למקטע הזה.</p></main>;
  }

  return (
    <main className="guide" style={{ '--c': s.color }}>
      <header className="g-head">
        <div>
          <p className="mono eyebrow"><Link to={`/s/${s.n}`}>מקטע {s.n}</Link> · מדריך בכיס · סיור עצמאי</p>
          <h1>{from} – {to}</h1>
          <p className="g-insight"><mark>{stations.length} תחנות, סיפור בכל אחת, וחידה בסוף.</mark></p>
          <p className="lead">
            המדריך מוביל מתחנה לתחנה לאורך המקטע.
            <br />בכל תחנה יש <b>סיפור</b> שאפשר להקריא בקול, <b>משימת התבוננות</b> בשטח, ו<b>ניקוד</b>.
            <br />עם מיקום פעיל, הגעה לתחנה נרשמת לבד (בטווח של {ARRIVE_M} מטר) ומקבלת נקודות נוספות.
          </p>
          <div className="row">
            <div className="seg" role="group" aria-label="כיוון הליכה">
              <button className={!reverse ? 'on' : ''} aria-pressed={!reverse} onClick={() => setParams({}, { replace: true })}>מצפון לדרום</button>
              <button className={reverse ? 'on' : ''} aria-pressed={reverse} onClick={() => setParams({ dir: 'sn' }, { replace: true })}>מדרום לצפון</button>
            </div>
            <span className="mono small">{fmt(s.length, 1)} ק"מ · קושי: <b style={{ color: difficulty(s).color }}>{difficulty(s).name}</b></span>
          </div>
        </div>
        <aside className="score card">
          <p className="frame-label">הניקוד שלי</p>
          <div className="score-num"><b>{points}</b><span>מתוך {max}</span></div>
          <div className="score-bar"><motion.i animate={{ width: `${(points / max) * 100}%` }} /></div>
          <p className="small">תחנות: <b>{done}</b> מתוך {stations.length}{quiz ? ` · חידה: ${state.quiz ? (state.quiz.correct ? 'נכון' : 'נענתה') : 'פתוחה'}` : ''}</p>
          <ul className="score-rules small muted">
            <li>הגעה לתחנה: {POINTS.visit}, ועוד {POINTS.gps} כשה-GPS מאשר</li>
            <li>משימת התבוננות: {POINTS.look}</li>
            {quiz && <li>חידה נכונה: {POINTS.quiz}</li>}
          </ul>
          <div className="row">
            {complete && <button className="btn" onClick={() => window.print()}>תעודה להדפסה</button>}
            <button className="btn-quiet" onClick={reset}>איפוס</button>
          </div>
          <p className="muted small">נשמר אוטומטית בדפדפן. לוח תוצאות משותף דורש שרת, ולכן אינו קיים כאן.</p>
        </aside>
      </header>

      {k && (
        <section className="g-know card">
          <p className="frame-label">{s.region.name}: מה כדאי לדעת לפני היציאה</p>
          <blockquote>
            <p>"{k.quote}"</p>
            <cite><a href={k.link} target="_blank" rel="noreferrer">{k.source}</a></cite>
          </blockquote>
          <p className="g-ins"><mark>{k.insight}</mark></p>
          <div className="haiku">{k.haiku.map((l) => <span key={l}>{l}</span>)}<small>{k.haikuNote}</small></div>
        </section>
      )}

      <TodayHere s={s} />

      <section className="g-map">
        <div className="atlas-map tall">
          <span className="frame-title">מפת התחנות{gps.status === 'on' ? ' · המיקום שלך מסומן' : ''}</span>
          <TrailMap trail={trail} focus={s.n} base={base} terrain={terrain} reverse={reverse}
            points={stations.map((x) => ({ ...x, done: !!state.visited[x.i] }))} activePoint={active} onPoint={go}
            me={gps.pos?.at} onSelect={(x) => x !== s.n && nav(`/s/${x}/guide`)} />
          <Legend colorBy="region" base={base} setBase={setBase} terrain={terrain} setTerrain={setTerrain} />
        </div>
        <aside className="gps card">
          <p className="frame-label">ניווט בשטח</p>
          {gps.status === 'off' && (
            <>
              <p>המיקום מופעל רק בלחיצה, ונשאר בטלפון שלך.</p>
              <button className="btn" onClick={gps.start}>הפעלת מיקום</button>
            </>
          )}
          {gps.status === 'wait' && <p className="muted">מחפש קליטת GPS. בשטח פתוח זה לוקח עד דקה.</p>}
          {gps.status === 'denied' && <p className="tone-problem">אין הרשאת מיקום. אפשר לאשר בהגדרות הדפדפן, או לסמן הגעה ידנית בכל תחנה.</p>}
          {gps.status === 'none' && <p className="tone-problem">הדפדפן הזה לא תומך במיקום. אפשר לסמן הגעה ידנית.</p>}
          {gps.status === 'on' && near && (
            <>
              <p className="gps-next">התחנה הבאה: <b>{near.next.x.k}. {near.next.x.name}</b></p>
              <p className="gps-dist"><b>{near.next.m < 1000 ? `${Math.round(near.next.m)} מטר` : `${fmt(near.next.m / 1000, 1)} ק"מ`}</b> בכיוון <b>{direction(gps.pos.at, [near.next.x.lat, near.next.x.lon])}</b> (בקו אווירי)</p>
              <p className="muted small">דיוק המיקום: כ-{Math.round(gps.pos.acc)} מטר.</p>
              <button className="btn-quiet" onClick={gps.stop}>כיבוי מיקום</button>
            </>
          )}
          <ol className="g-index">
            {stations.map((x) => (
              <li key={x.k}>
                <button className={`${active === x.k ? 'on' : ''} ${state.visited[x.i] ? 'done' : ''}`} onClick={() => go(x.k)}>
                  <span className="mono">{x.k}</span>{x.name}<small className="mono">{fmt(x.km, 1)} ק"מ</small>
                </button>
              </li>
            ))}
          </ol>
          {cur && (
            <div className="active-st" aria-live="polite">
              <p className="frame-label">תחנה {cur.k} על המפה</p>
              <Photo wiki={[`he:${cur.wiki || cur.name}`, ...s.wiki]} name={cur.name} color={s.color} />
              <h3>{cur.name}</h3>
              <p className="active-story">{cur.story}</p>
              <p className="small"><b>תשימו לב:</b> {cur.look}</p>
              <div className="row">
                <button className="btn-quiet" onClick={() => read(cur)} aria-pressed={speaking === cur.k}>{speaking === cur.k ? 'עצירה' : 'הקראה'}</button>
                <button className="btn-quiet" onClick={() => toCard(cur.k)}>לכרטיס המלא ולחידה</button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="stations">
        {stations.map((x) => (
          <article key={x.k} ref={(el) => { refs.current[x.k] = el; }} className={`station-card ${active === x.k ? 'on' : ''}`} onMouseEnter={() => setActive(x.k)}>
            <Photo wiki={[`he:${x.wiki || x.name}`, ...s.wiki]} name={x.name} color={s.color} />
            <div className="st-body">
              <p className="mono eyebrow">תחנה {x.k} מתוך {stations.length} · ק"מ {fmt(x.km, 1)} מ{from}{x.approx ? ' · מיקום משוער' : ''}</p>
              <h2>{x.name}</h2>
              <p className="st-story">{x.story}</p>
              <div className="look tone-insight">
                <b>תשימו לב</b>
                <p>{x.look}</p>
              </div>
              {x.sq && <StationQuiz x={x} res={state.sq[x.i]} onAnswer={(j) => answerSq(x, j)} />}
              <div className="row">
                <button className="btn-quiet" onClick={() => read(x)} aria-pressed={speaking === x.k}>{speaking === x.k ? 'עצירת ההקראה' : 'הקראה בקול'}</button>
                <button className={`check ${state.visited[x.i] ? 'on' : ''}`} aria-pressed={!!state.visited[x.i]} onClick={() => markVisit(x)}>
                  {state.visited[x.i] === 'gps' ? 'הגעתי (אושר במיקום)' : state.visited[x.i] ? 'הגעתי' : 'סימון: הגעתי'}
                </button>
                <button className={`check ${state.look[x.i] ? 'on' : ''}`} aria-pressed={!!state.look[x.i]} onClick={() => markLook(x)}>
                  {state.look[x.i] ? 'עשיתי את המשימה' : 'סימון: עשיתי את המשימה'}
                </button>
              </div>
              {speaking === 'none' && <p className="muted small">ההקראה לא זמינה בדפדפן הזה.</p>}
            </div>
          </article>
        ))}
      </section>

      {quiz && (
        <section className="quiz card">
          <p className="frame-label">חידת המקטע · {POINTS.quiz} נקודות</p>
          <h2>{quiz.q}</h2>
          <div className="quiz-opts">
            {quiz.options.map((o, i) => {
              const picked = state.quiz?.picked === i;
              const cls = state.quiz ? (i === quiz.a ? 'right' : picked ? 'wrong' : '') : '';
              return <button key={o} className={`btn-quiet ${cls}`} disabled={!!state.quiz} onClick={() => answer(i)}>{o}</button>;
            })}
          </div>
          {state.quiz && <p className={state.quiz.correct ? 'tone-solution' : 'tone-problem'}>{state.quiz.correct ? 'נכון.' : `התשובה הנכונה: ${quiz.options[quiz.a]}.`} אפשר לענות פעם אחת.</p>}
        </section>
      )}

      <section className="certificate" aria-hidden={!complete}>
        <p className="mono">שביל ישראל · מדריך בכיס</p>
        <h1>תעודת מעבר</h1>
        <p>הלכתי במקטע <b>{s.n}</b>, מ{from} ל{to},</p>
        <p>ועברתי ב-<b>{done}</b> תחנות. ניקוד: <b>{points}</b> מתוך {max}.</p>
        <p className="mono">{new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        {k && <p className="cert-quote">"{k.quote}" ({k.source})</p>}
      </section>

      <nav className="prevnext">
        {ALL[s.n - 2] ? <Link to={`/s/${s.n - 1}/guide`} className="pn"><small className="mono">מדריך מקטע {s.n - 1}</small>{ALL[s.n - 2].from} – {ALL[s.n - 2].to}</Link> : <span />}
        {ALL[s.n] ? <Link to={`/s/${s.n + 1}/guide`} className="pn pn-next"><small className="mono">מדריך מקטע {s.n + 1}</small>{ALL[s.n].from} – {ALL[s.n].to}</Link> : <span />}
      </nav>
      <p className="muted small foot-note">בהשראת הסיורים העצמאיים של goBeeTravel: תחנות, ניווט, הקראה, משימות וניקוד. כאן הכול חינם, בלי הרשמה ובלי שרת.</p>
    </main>
  );
}

/** מה קורה היום במקטע: חי, צומח, דומם ושמיים של החודש, ואירועי שמיים בתאריך. */
function TodayHere({ s }) {
  const today = new Date();
  const ev = dayEvents([s.n], today);
  return (
    <section className="today card">
      <p className="frame-label">היום במקטע · {today.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</p>
      <SectionSigns s={s} month={today.getMonth() + 1} size={22} />
      {ev.length > 0 ? (
        <ul className="today-list">
          {ev.map((e) => (
            <li key={e.name} style={{ '--k': KINDS[e.kind].color }}><Sign name={e.kind} size={18} /><b>{e.name}</b>{e.note && <small>{e.note}</small>}</li>
          ))}
        </ul>
      ) : <p className="muted small">אין החודש תופעה עונתית בולטת במקטע. הגאולוגיה והנוף כאן כל השנה.</p>}
    </section>
  );
}

/** חידת תחנה: שלוש תשובות, עונים פעם אחת. התשובה מופיעה בסיפור של התחנה. */
function StationQuiz({ x, res, onAnswer }) {
  return (
    <div className="st-quiz">
      <p className="small"><b>חידת התחנה · {POINTS.sq} נקודות:</b> {x.sq.q}</p>
      <div className="st-quiz-opts">
        {x.sq.options.map((o, j) => {
          const cls = !res ? '' : j === x.sq.a ? 'right' : j === res.picked ? 'wrong' : '';
          return <button key={o} className={`btn-quiet ${cls}`} disabled={!!res} onClick={() => onAnswer(j)}>{o}</button>;
        })}
      </div>
      {res && <p className={`small ${res.correct ? 'tone-solution' : 'tone-problem'}`}>{res.correct ? 'נכון.' : `התשובה: ${x.sq.options[x.sq.a]}.`} הרמז היה בסיפור.</p>}
    </div>
  );
}
