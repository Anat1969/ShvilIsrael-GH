import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL, REGIONS, SUBREGIONS, fmt } from '../lib/data.js';
import { difficulty } from '../lib/season.js';
import { stationCount, maxPoints, useGuide } from '../lib/guide.js';
import { GUIDE } from '../data/stations.js';
import { KNOWLEDGE } from '../data/knowledge.js';

/** אינדקס המדריך בכיס: כל המקטעים, מספר התחנות וההתקדמות שלי. */
export default function GuideIndex() {
  const { all } = useGuide(0);
  const total = ALL.reduce((a, s) => a + stationCount(s.n), 0);
  const visited = Object.values(all).reduce((a, v) => a + Object.keys(v.visited || {}).length, 0);
  return (
    <main className="guide-index">
      <header className="page-head">
        <p className="mono eyebrow">POCKET GUIDE · SELF-GUIDED</p>
        <h1>מדריך בכיס</h1>
        <p className="g-insight"><mark>{total} תחנות לאורך השביל, עם סיפור בכל אחת.</mark></p>
        <p className="lead">
          סיור עצמאי מהטלפון, בלי הורדה ובלי תשלום.
          <br />בכל תחנה: <b>סיפור</b> בקול של מדריך, <b>משימת התבוננות</b> בשטח, ו<b>ניקוד</b>. בסוף כל מקטע: <b>חידה</b> ותעודה.
          <br />עם מיקום פעיל, המדריך אומר כמה רחוק התחנה הבאה ובאיזה כיוון.
        </p>
        <div className="how">
          <div className="tone-problem"><b>הבעיה</b><p>מדריך מקצועי לא תמיד הולך איתך, ושלטים בשטח מעטים.</p></div>
          <div className="tone-solution"><b>הפתרון</b><p>תחנות על התוואי עצמו, עם סיפור, משימה ומיקום חי.</p></div>
          <div className="tone-insight"><b>התובנה</b><p>מי שמחפש פרט בשטח רואה יותר ממי שרק הולך.</p></div>
        </div>
        {visited > 0 && <p className="mono">הגעתי עד עכשיו ל-<b>{visited}</b> תחנות.</p>}
      </header>
      {REGIONS.map((r) => (
        <section key={r.id} className="gi-region frame" style={{ '--c': r.color }}>
          <h2 className="frame-h">{r.name} <small className="mono">מקטעים {r.from}–{r.to}</small></h2>
          <p className="gi-quote">"{KNOWLEDGE[r.id].quote}" <cite>{KNOWLEDGE[r.id].source}</cite></p>
          {SUBREGIONS.filter((sr) => sr.region === r.id).map((sr) => (
            <div key={sr.id}>
              <h3 className="sub-name">{sr.name}</h3>
              <div className="gi-grid">
                {ALL.filter((s) => s.sub.id === sr.id).map((s) => {
                  const mine = all[s.n];
                  const v = mine ? Object.keys(mine.visited || {}).length : 0;
                  const c = stationCount(s.n);
                  return (
                    <motion.div key={s.n} whileHover={{ y: -3 }}>
                      <Link to={`/s/${s.n}/guide`} className="gi-card">
                        <span className="sec-n mono">{s.n}</span>
                        <b>{s.from} – {s.to}</b>
                        <small>{GUIDE[s.n]?.stations.map((x) => x.name).join(' · ')}</small>
                        <span className="gi-meta mono">{c} תחנות{GUIDE[s.n]?.quiz ? ' · חידה' : ''} · {fmt(s.length, 1)} ק"מ · <span style={{ color: difficulty(s).color }}>{difficulty(s).name}</span></span>
                        <span className="gi-prog"><i style={{ width: `${c ? (v / c) * 100 : 0}%` }} /></span>
                        {v > 0 && <span className="mono small">{v} מתוך {c} תחנות · עד {maxPoints(s.n)} נקודות</span>}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
