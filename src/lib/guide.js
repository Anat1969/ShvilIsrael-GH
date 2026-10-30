import { useCallback, useEffect, useState } from 'react';
import { GUIDE } from '../data/stations.js';
import placed from '../data/generated/stations.json';
import { pointAt } from '../components/TrailMap.jsx';

// מדריך בכיס: תחנות, ניקוד ומיקום. הכול בדפדפן, בלי שרת ובלי תשלום.
export const POINTS = { visit: 10, gps: 10, look: 5, quiz: 20 };
export const ARRIVE_M = 150;

/** התחנות של מקטע בסדר ההליכה, עם מיקום על התוואי. */
export function stationsFor(n, trailSection, reverse = false) {
  const g = GUIDE[n];
  if (!g || !trailSection) return [];
  const pos = placed.sections[n] || [];
  const L = trailSection.length;
  const list = g.stations.map((s, i) => {
    const p = pos.find((x) => x.i === i) || {};
    let km = p.km;
    if (s.at === 'end') km = L;
    else if (s.at === 'start') km = 0;
    else if (km == null && typeof s.at === 'number') km = s.at;
    return { ...s, i, km, lat: p.lat, lon: p.lon, off: p.off };
  });
  // תחנה בלי מיקום: באמצע בין השכנות שלה
  list.forEach((s, i) => {
    if (s.km != null) return;
    const prev = list.slice(0, i).reverse().find((x) => x.km != null)?.km ?? 0;
    const next = list.slice(i + 1).find((x) => x.km != null)?.km ?? L;
    s.km = (prev + next) / 2;
    s.approx = true;
  });
  list.forEach((s) => {
    if (s.lat == null) {
      const [lon, lat] = pointAt(trailSection.geom, Math.min(L, s.km));
      s.lat = lat;
      s.lon = lon;
      s.approx = true;
    }
  });
  const sorted = list.sort((a, b) => a.km - b.km);
  return (reverse ? sorted.map((s) => ({ ...s, km: L - s.km })).reverse() : sorted).map((s, k) => ({ ...s, k: k + 1 }));
}

export const quizFor = (n) => GUIDE[n]?.quiz || null;
export const stationCount = (n) => GUIDE[n]?.stations.length || 0;
export const maxPoints = (n) => stationCount(n) * (POINTS.visit + POINTS.gps + POINTS.look) + (quizFor(n) ? POINTS.quiz : 0);

const KEY = 'shvil-guide';
const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};

/** התקדמות במדריך: נשמרת אוטומטית בדפדפן. */
export function useGuide(n) {
  const [all, setAll] = useState(read);
  useEffect(() => {
    const sync = () => setAll(read());
    window.addEventListener('guide-change', sync);
    return () => window.removeEventListener('guide-change', sync);
  }, []);
  const mine = all[n] || { visited: {}, look: {}, quiz: null };
  const update = useCallback((fn) => {
    const cur = read();
    const next = { ...cur, [n]: fn(cur[n] || { visited: {}, look: {}, quiz: null }) };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* מצב פרטי */ }
    window.dispatchEvent(new Event('guide-change'));
  }, [n]);
  const points = Object.values(mine.visited).reduce((a, v) => a + POINTS.visit + (v === 'gps' ? POINTS.gps : 0), 0)
    + Object.keys(mine.look).length * POINTS.look + (mine.quiz?.correct ? POINTS.quiz : 0);
  return { state: mine, update, points, all };
}

export function guideTotals(all) {
  return Object.entries(all).map(([n, v]) => ({ n: Number(n), visited: Object.keys(v.visited || {}).length }));
}

// מרחק וכיוון
export function meters(a, b) {
  const R = 6371000;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((((b[1] - a[1]) * Math.PI) / 180) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const DIRS = ['צפון', 'צפון־מזרח', 'מזרח', 'דרום־מזרח', 'דרום', 'דרום־מערב', 'מערב', 'צפון־מערב'];
export function direction(a, b) {
  const y = Math.sin(((b[1] - a[1]) * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180);
  const x = Math.cos((a[0] * Math.PI) / 180) * Math.sin((b[0] * Math.PI) / 180) - Math.sin((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.cos(((b[1] - a[1]) * Math.PI) / 180);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
}

/** מיקום חי מה-GPS של הטלפון. מופעל רק בלחיצה, כדי לא לבקש הרשאה בלי סיבה. */
export function usePosition() {
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState('off'); // off | wait | on | denied | none
  const [watch, setWatch] = useState(null);
  const start = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('none'); return; }
    setStatus('wait');
    const id = navigator.geolocation.watchPosition(
      (p) => { setPos({ at: [p.coords.latitude, p.coords.longitude], acc: p.coords.accuracy }); setStatus('on'); },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
    );
    setWatch(id);
  }, []);
  const stop = useCallback(() => {
    if (watch != null) navigator.geolocation.clearWatch(watch);
    setWatch(null);
    setStatus('off');
    setPos(null);
  }, [watch]);
  useEffect(() => () => { if (watch != null) navigator.geolocation.clearWatch(watch); }, [watch]);
  return { pos, status, start, stop };
}

/** הקראה בעברית בקול של הדפדפן (Web Speech API). בלי הקלטות ובלי שרת. */
export function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.rate = 0.95;
  const he = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('he'));
  if (he) u.voice = he;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
