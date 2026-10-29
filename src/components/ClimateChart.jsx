import { MONTHS_SHORT } from '../lib/data.js';

/** אקלים חודשי: עמודות גשם, וטווח בין ממוצע המינימום למקסימום היומי. ינואר מימין. */
export default function ClimateChart({ s }) {
  const c = s.climate;
  if (!c) return <p className="muted">אין נתוני אקלים למקטע הזה.</p>;
  const W = 360;
  const H = 150;
  const top = 14;
  const bot = 22;
  const tMin = Math.min(0, Math.floor(Math.min(...c.tmin) / 5) * 5);
  const tMax = Math.max(35, Math.ceil(Math.max(...c.tmax) / 5) * 5);
  const rMax = Math.max(60, ...c.rain);
  const cw = W / 12;
  const x = (i) => W - (i + 0.5) * cw;
  const y = (t) => top + (1 - (t - tMin) / (tMax - tMin)) * (H - top - bot);
  const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <figure className="climate">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="טמפרטורה וגשם לפי חודשים">
        {[0, 10, 20, 30].filter((t) => t >= tMin && t <= tMax).map((t) => (
          <g key={t}>
            <line x1="0" x2={W} y1={y(t)} y2={y(t)} className="pf-grid" />
            <text x="2" y={y(t) - 2} className="cl-t">{t}°</text>
          </g>
        ))}
        {c.rain.map((r, i) => (
          <rect key={i} x={x(i) - cw * 0.3} width={cw * 0.6} y={H - bot - (r / rMax) * (H - top - bot) * 0.6} height={(r / rMax) * (H - top - bot) * 0.6} className="cl-rain" rx="2" />
        ))}
        <path d={`${line(c.tmax)}${c.tmin.map((v, i) => `L${x(11 - i).toFixed(1)},${y(c.tmin[11 - i]).toFixed(1)}`).join('')}Z`} className="cl-band" />
        <path d={line(c.tmax)} className="cl-max" />
        <path d={line(c.tmin)} className="cl-min" />
        {c.tmax.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.6" className={v > 31 ? 'cl-dot hot' : 'cl-dot'} />)}
        {MONTHS_SHORT.map((m, i) => <text key={m} x={x(i)} y={H - 6} textAnchor="middle" className="cl-m">{m}</text>)}
      </svg>
      <figcaption className="cl-legend">
        <span><i className="cl-k max" />ממוצע החום ביום</span>
        <span><i className="cl-k min" />ממוצע הלילה</span>
        <span><i className="cl-k rain" />גשם בחודש (עד {Math.round(Math.max(...c.rain))} מ"מ)</span>
      </figcaption>
    </figure>
  );
}
