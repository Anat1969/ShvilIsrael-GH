// זריחה ושקיעה לפי האלגוריתם של NOAA (Solar Calculator, משוואת הזמן ונטיית השמש),
// עם זווית 0.833 מעלות לשבירת האור ולרדיוס השמש. דיוק טיפוסי: דקה עד שתיים, בלי תיקון לתבליט.
const rad = Math.PI / 180;

export function sunTimes(date, lat, lon) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const jd = d.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad;
  let eqt = (L - ((ra + 360) % 360));
  if (eqt > 180) eqt -= 360;
  if (eqt < -180) eqt += 360;
  const eqMin = eqt * 4;
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
  const noonUTC = 720 - 4 * lon - eqMin; // דקות מחצות UTC
  const toDate = (min) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + min * 60000);
  return { rise: toDate(noonUTC - H * 4), set: toDate(noonUTC + H * 4), daylight: (H * 8) / 60 };
}

export const clock = (d) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
