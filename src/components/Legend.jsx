import { REGIONS } from '../lib/data.js';
import { LEVELS } from '../lib/season.js';
import { BASES } from './TrailMap.jsx';

/** מקרא המפה, כולל בחירת בסיס ותלת־ממד. */
export default function Legend({ colorBy, base, setBase, terrain, setTerrain, monthName }) {
  return (
    <details className="legend" open={typeof window === 'undefined' || window.innerWidth > 900}>
      <summary className="mono">מקרא</summary>
      {colorBy === 'season' ? (
        <>
          <p className="legend-head">התאמה לטיול ב{monthName}</p>
          <ul className="legend-list">
            {Object.entries(LEVELS).map(([k, l]) => (
              <li key={k}><i className="sw-line" style={{ background: l.color }} />{l.name}</li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="legend-list">
          {REGIONS.map((r) => (
            <li key={r.id}><i className="sw-line" style={{ background: r.color }} />{r.name}</li>
          ))}
        </ul>
      )}
      <ul className="legend-list">
        <li><i className="sw-dot" />תחילת מקטע</li>
      </ul>
      <p className="legend-note">התוואי מתוך OpenStreetMap, לפי הסימון בשטח. לפני יציאה: לבדוק עדכונים באתר החברה להגנת הטבע.</p>
      <div className="seg" role="group" aria-label="סוג מפה">
        {Object.entries(BASES).map(([k, b]) => (
          <button key={k} className={base === k ? 'on' : ''} aria-pressed={base === k} onClick={() => setBase(k)}>{b.name}</button>
        ))}
        <button className={terrain ? 'on' : ''} aria-pressed={terrain} onClick={() => setTerrain(!terrain)} title="תבליט אמיתי מנתוני גובה, עם הטיה של המצלמה">תלת־ממד</button>
      </div>
    </details>
  );
}
