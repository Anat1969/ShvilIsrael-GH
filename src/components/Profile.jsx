import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fmt } from '../lib/data.js';

/**
 * פרופיל גובה. data: [[ק"מ, גובה]]. bands: קטעים צבועים [{from, to, color, n}].
 * הציר האופקי זורם מימין לשמאל: תחילת המקטע (או החרמון) מימין, כמו כיוון הקריאה.
 */
export default function Profile({ data, bands = [], marker, onHover, onPick, height = 180, labels = [], unit = 'ק"מ', className = '', ltr = false }) {
  const W = 1000;
  const H = height;
  const pad = { t: 14, b: 22, l: 6, r: 6 };
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const { minE, maxE, maxK, x, y, path, area } = useMemo(() => {
    const ks = data.map((d) => d[0]);
    const es = data.map((d) => d[1]);
    let minE = Math.min(...es);
    let maxE = Math.max(...es);
    const span = Math.max(80, maxE - minE);
    minE = Math.floor((minE - span * 0.08) / 50) * 50;
    maxE = Math.ceil((maxE + span * 0.08) / 50) * 50;
    const maxK = ks[ks.length - 1] || 1;
    const x = (k) => (ltr ? pad.l + (k / maxK) * (W - pad.l - pad.r) : W - pad.r - (k / maxK) * (W - pad.l - pad.r));
    const y = (e) => pad.t + (1 - (e - minE) / (maxE - minE)) * (H - pad.t - pad.b);
    const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d[0]).toFixed(1)},${y(d[1]).toFixed(1)}`).join('');
    const area = `${path}L${x(maxK).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`;
    return { minE, maxE, maxK, x, y, path, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, H, ltr]);

  const kmAt = (clientX) => {
    const r = box.current.getBoundingClientRect();
    const fx = (clientX - r.left) / r.width;
    const k = ltr ? fx * maxK : (1 - fx) * maxK;
    return Math.max(0, Math.min(maxK, k));
  };
  const eleAt = (k) => {
    let lo = 0;
    let hi = data.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (data[mid][0] < k) lo = mid; else hi = mid;
    }
    return data[lo][1];
  };
  const move = (e) => {
    const k = kmAt(e.touches ? e.touches[0].clientX : e.clientX);
    setHover(k);
    onHover?.(k);
  };
  const leave = () => { setHover(null); onHover?.(null); };
  const shown = hover ?? marker;
  const ticks = [];
  const stepE = maxE - minE > 1200 ? 500 : maxE - minE > 500 ? 200 : 100;
  for (let e = Math.ceil(minE / stepE) * stepE; e <= maxE; e += stepE) ticks.push(e);
  const id = useMemo(() => `pg${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className={`profile ${className}`}>
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={move}
        onMouseLeave={leave}
        onTouchStart={move}
        onTouchMove={move}
        onTouchEnd={leave}
        onClick={(e) => onPick?.(kmAt(e.clientX))}
        role="img"
        aria-label="פרופיל גובה"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f2328" stopOpacity="0.22" />
            <stop offset="1" stopColor="#1f2328" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`${id}c`}><path d={area} /></clipPath>
        </defs>
        {ticks.map((e) => (
          <line key={e} x1="0" x2={W} y1={y(e)} y2={y(e)} className={e === 0 ? 'pf-sea' : 'pf-grid'} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <g clipPath={`url(#${id}c)`}>
          {bands.map((b) => (
            <rect key={b.n ?? b.from} x={Math.min(x(b.from), x(b.to))} width={Math.abs(x(b.to) - x(b.from))} y="0" height={H} fill={b.color} opacity={b.dim ? 0.12 : 0.55} />
          ))}
        </g>
        <clipPath id={`${id}r`}>
          <motion.rect y="0" height={H} initial={{ width: 0, x: ltr ? 0 : W }} animate={{ width: W, x: 0 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
        </clipPath>
        <path d={path} fill="none" stroke="#1f2328" strokeWidth="1.6" vectorEffect="non-scaling-stroke" clipPath={`url(#${id}r)`} />
        {shown != null && (
          <g>
            <line x1={x(shown)} x2={x(shown)} y1="0" y2={H - pad.b} className="pf-cursor" vectorEffect="non-scaling-stroke" />
            <circle cx={x(shown)} cy={y(eleAt(shown))} r="4" className="pf-dot" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      <div className="pf-axis mono" aria-hidden="true">
        {ticks.map((e) => (
          <span key={e} style={{ top: `${(y(e) / H) * 100}%` }}>{e === 0 ? 'פני הים' : `${fmt(e)} מ'`}</span>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="pf-labels" aria-hidden="true">
          {labels.map((l) => (
            <span key={l.text} className="mono" style={{ [ltr ? 'left' : 'right']: `${(l.at / maxK) * 100}%` }}>{l.text}</span>
          ))}
        </div>
      )}
      {shown != null && (
        <div className="pf-read mono" style={{ [ltr ? 'left' : 'right']: `${(shown / maxK) * 100}%` }}>
          {fmt(shown, 1)} {unit} · {fmt(eleAt(shown))} מ'
        </div>
      )}
    </div>
  );
}
