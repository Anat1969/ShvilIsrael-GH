import { useCallback, useEffect, useState } from 'react';

const KEY = 'shvil-walked';
const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};

/** מקטעים שסומנו "הלכתי", נשמרים בדפדפן בלבד. */
export function useWalked() {
  const [ids, setIds] = useState(read);
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener('walked-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('walked-change', sync); window.removeEventListener('storage', sync); };
  }, []);
  const toggle = useCallback((n) => {
    const cur = read();
    const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* מצב פרטי */ }
    window.dispatchEvent(new Event('walked-change'));
  }, []);
  return { walked: new Set(ids), toggle };
}

export function clearWalked() {
  try { localStorage.removeItem(KEY); } catch { /* מצב פרטי */ }
  window.dispatchEvent(new Event('walked-change'));
}
