import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { wikiInfo, commonsSearch } from '../lib/wiki.js';

/** תמונה אמיתית מוויקיפדיה. כשאין, איור קווי גובה בצבע האזור, לא מסגרת ריקה. */
export default function Photo({ wiki, name, color, tall, withText = false }) {
  const [info, setInfo] = useState(undefined);
  useEffect(() => {
    let live = true;
    setInfo(undefined);
    wikiInfo(wiki).then((r) => live && setInfo(r));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wiki.join('|')]);
  const q = wiki[0].split(':')[1];

  return (
    <figure className={`photo ${tall ? 'photo-tall' : ''}`} style={{ '--c': color }}>
      <div className="photo-frame">
        {info?.src ? (
          <motion.img src={info.src} alt={info.title || name} loading="lazy" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }} />
        ) : (
          <svg className="photo-fallback" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M0 ${150 + i * 18} C 90 ${110 + i * 20}, 170 ${170 + i * 10}, 260 ${130 + i * 18} S 380 ${150 + i * 16}, 400 ${140 + i * 18} L400 240 L0 240Z`} opacity={0.12 + i * 0.12} />
            ))}
          </svg>
        )}
        {info === undefined && <span className="photo-loading" aria-hidden="true" />}
      </div>
      <figcaption>
        <span>{info?.title || q}</span>
        <span className="photo-links">
          {info && <a href={info.page} target="_blank" rel="noreferrer">ויקיפדיה</a>}
          <a href={commonsSearch(q)} target="_blank" rel="noreferrer">עוד תמונות</a>
        </span>
      </figcaption>
      {withText && info?.extract && <p className="photo-text">{info.extract}</p>}
    </figure>
  );
}
