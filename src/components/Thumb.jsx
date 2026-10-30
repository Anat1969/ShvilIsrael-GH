import { useEffect, useState } from 'react';
import { wikiInfo } from '../lib/wiki.js';

/** תמונה ממוזערת מוויקיפדיה, עם קישור לערך. בלי תמונה: משטח בצבע המשפחה, לא מסגרת ריקה. */
export default function Thumb({ title, color = '#4f6d8a', size = 64 }) {
  const [info, setInfo] = useState(undefined);
  useEffect(() => {
    let live = true;
    if (!title) { setInfo(null); return undefined; }
    wikiInfo([`he:${title}`]).then((r) => live && setInfo(r));
    return () => { live = false; };
  }, [title]);
  const style = { width: size, height: size, '--k': color };
  if (info?.src) {
    return (
      <a className="thumb" style={style} href={info.page} target="_blank" rel="noreferrer" title={`${info.title}, ויקיפדיה`}>
        <img src={info.src} alt={info.title} loading="lazy" />
      </a>
    );
  }
  return <span className={`thumb thumb-empty ${info === undefined ? 'loading' : ''}`} style={style} aria-hidden="true" />;
}
