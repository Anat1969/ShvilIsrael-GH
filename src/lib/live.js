// נתונים חיים: תחזית (Open-Meteo, מודל ברירת המחדל לישראל) ותצפיות טבע אחרונות (iNaturalist).
const memo = new Map();
const once = (key, fn) => {
  if (!memo.has(key)) memo.set(key, fn().catch(() => { memo.delete(key); return null; }));
  return memo.get(key);
};

export function forecast([lat, lon], elevation) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${elevation != null ? `&elevation=${elevation}` : ''}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=4&timezone=Asia%2FJerusalem`;
  return once(url, async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const d = (await r.json()).daily;
    return d.time.map((t, i) => ({
      date: new Date(`${t}T12:00:00`),
      tmax: d.temperature_2m_max[i],
      tmin: d.temperature_2m_min[i],
      rain: d.precipitation_probability_max[i],
      wind: d.wind_speed_10m_max[i],
    }));
  });
}

/** תצפיות מאומתות או ממתינות ב-45 הימים האחרונים בתוך תיבת המקטע (מורחבת מעט), עם תמונה. */
export function recentNature(bbox, kind = 'Plantae') {
  const [w, s, e, n] = bbox;
  const pad = 0.04;
  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const url = `https://api.inaturalist.org/v1/observations?iconic_taxa=${kind}&swlat=${s - pad}&swlng=${w - pad}&nelat=${n + pad}&nelng=${e + pad}&d1=${since}&photos=true&quality_grade=research,needs_id&per_page=24&order_by=observed_on&locale=he`;
  return once(url, async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    return {
      total: d.total_results,
      items: d.results.filter((o) => o.taxon && o.photos?.length).map((o) => ({
        id: o.id,
        name: o.taxon.preferred_common_name || o.taxon.name,
        sci: o.taxon.name,
        photo: o.photos[0].url.replace('square', 'small'),
        date: o.observed_on,
        grade: o.quality_grade,
        url: `https://www.inaturalist.org/observations/${o.id}`,
      })),
    };
  });
}
