import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ALL } from '../lib/data.js';
import { suitability } from '../lib/season.js';

// שכבות בלי מפתח API. לכל שכבת בסיס יש גיבוי שנכנס אוטומטית אחרי כמה כשלונות (לקח מהאפליקציה הקודמת: CARTO נשבר בלי מפתח).
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const BASES = {
  map: { name: 'מפה', tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', fallback: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, attribution: '© OpenStreetMap', grey: true, maxzoom: 19 },
  sat: { name: 'לוויין', tiles: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, fallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© Esri, Maxar, Earthstar Geographics', maxzoom: 18 },
};
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

function featureCollection(trail, month, colorBy) {
  return {
    type: 'FeatureCollection',
    features: trail.sections.map((t) => {
      const s = ALL[t.n - 1];
      const color = colorBy === 'season' ? suitability(s, month).color : s.color;
      return { type: 'Feature', properties: { n: t.n, color, name: `${s.n}. ${s.from} – ${s.to}` }, geometry: { type: 'LineString', coordinates: t.geom } };
    }),
  };
}

function ends(trail) {
  return {
    type: 'FeatureCollection',
    features: trail.sections.map((t) => ({ type: 'Feature', properties: { n: t.n }, geometry: { type: 'Point', coordinates: [t.geom[0][0], t.geom[0][1]] } })),
  };
}

const dist = (a, b) => {
  const R = 6371;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const dl = la2 - la1;
  const dn = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const bearing = (a, b) => {
  const y = Math.sin(((b[0] - a[0]) * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180);
  const x = Math.cos((a[1] * Math.PI) / 180) * Math.sin((b[1] * Math.PI) / 180) - Math.sin((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.cos(((b[0] - a[0]) * Math.PI) / 180);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

/** נקודה על קו לפי מרחק מתחילתו (ק"מ). */
export function pointAt(coords, km) {
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = dist(coords[i - 1], coords[i]);
    if (acc + d >= km) {
      const t = d ? (km - acc) / d : 0;
      return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
    }
    acc += d;
  }
  return coords[coords.length - 1];
}

const TrailMap = forwardRef(function TrailMap({ trail, focus, month, colorBy = 'region', marker, onSelect, base = 'map', terrain = false, className = '', onFly, reverse = false }, ref) {
  const box = useRef(null);
  const map = useRef(null);
  const [ready, setReady] = useState(false);
  const fly = useRef(null);
  const flyToken = useRef(null);
  const props = useRef({});
  props.current = { onSelect, onFly };

  // יצירת המפה
  useEffect(() => {
    const b = BASES[base];
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: [b.tiles], tileSize: 256, attribution: b.attribution, maxzoom: b.maxzoom },
          dem: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'גבהים: AWS Terrain Tiles' },
          shade: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 13 },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#e9e8e4' } },
          { id: 'base', type: 'raster', source: 'base', paint: b.grey ? { 'raster-saturation': -1, 'raster-contrast': -0.08, 'raster-brightness-min': 0.12 } : {} },
          { id: 'hillshade', type: 'hillshade', source: 'shade', paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#3b3f45', 'hillshade-highlight-color': '#ffffff' } },
        ],
      },
      bounds: [[34.25, 29.45], [35.95, 33.35]],
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
      dragRotate: true,
      cooperativeGestures: false,
      maxPitch: 75,
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    m.scrollZoom.disable();
    m.on('click', () => m.scrollZoom.enable());
    let ok = 0;
    let fail = 0;
    let swapped = false;
    m.on('sourcedata', (e) => { if (e.sourceId === 'base' && e.tile) ok += 1; });
    m.on('error', (e) => {
      if (e.sourceId !== 'base' || swapped) return;
      fail += 1;
      if (ok === 0 && fail >= 3) {
        swapped = true;
        m.getSource('base')?.setTiles([BASES[m.__base || base].fallback]);
      }
    });
    m.on('load', () => {
      m.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('ends', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('marker', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'trail-case', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 9], 'line-opacity': 0.9 } });
      m.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 12, 5.5] } });
      m.addLayer({ id: 'trail-hit', type: 'line', source: 'trail', paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 } });
      m.addLayer({ id: 'ends', type: 'circle', source: 'ends', minzoom: 7.5, paint: { 'circle-radius': 4, 'circle-color': '#ffffff', 'circle-stroke-color': '#1f2328', 'circle-stroke-width': 1.5 } });
      m.addLayer({ id: 'marker-halo', type: 'circle', source: 'marker', paint: { 'circle-radius': 14, 'circle-color': '#1f2328', 'circle-opacity': 0.18 } });
      m.addLayer({ id: 'marker', type: 'circle', source: 'marker', paint: { 'circle-radius': 6.5, 'circle-color': '#f08a24', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
      const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 10 });
      m.on('mousemove', 'trail-hit', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        tip.setLngLat(e.lngLat).setText(e.features[0].properties.name).addTo(m);
      });
      m.on('mouseleave', 'trail-hit', () => { m.getCanvas().style.cursor = ''; tip.remove(); });
      m.on('click', 'trail-hit', (e) => props.current.onSelect?.(e.features[0].properties.n));
      setReady(true);
      box.current.dataset.ready = '1';
    });
    m.__base = base;
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => { ro.disconnect(); cancelAnimationFrame(fly.current); m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // נתוני התוואי וצבעים
  useEffect(() => {
    const m = map.current;
    if (!ready || !trail) return;
    const fc = featureCollection(trail, month, colorBy);
    m.getSource('trail').setData(fc);
    box.current.dataset.features = fc.features.length;
    box.current.dataset.colors = [...new Set(fc.features.map((f) => f.properties.color))].join(' ');
    m.getSource('ends').setData(ends(trail));
  }, [ready, trail, month, colorBy]);

  // מיקוד במקטע
  useEffect(() => {
    const m = map.current;
    if (!ready || !trail) return;
    m.setPaintProperty('trail', 'line-opacity', focus ? ['case', ['==', ['get', 'n'], focus], 1, 0.35] : 1);
    m.setPaintProperty('trail-case', 'line-opacity', focus ? ['case', ['==', ['get', 'n'], focus], 0.95, 0.25] : 0.9);
    const t = focus && trail.sections.find((x) => x.n === focus);
    if (t) m.fitBounds([[t.bbox[0], t.bbox[1]], [t.bbox[2], t.bbox[3]]], { padding: 50, duration: 1200, maxZoom: 13.5, pitch: terrain ? 55 : 0 });
    else m.fitBounds([[34.25, 29.45], [35.95, 33.35]], { padding: 30, duration: 1200, pitch: terrain ? 45 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, trail, focus]);

  // בסיס
  useEffect(() => {
    const m = map.current;
    if (!ready || m.__base === base) return;
    m.__base = base;
    m.getSource('base').setTiles([BASES[base].tiles]);
    m.setPaintProperty('base', 'raster-saturation', BASES[base].grey ? -1 : 0);
    m.setPaintProperty('base', 'raster-brightness-min', BASES[base].grey ? 0.12 : 0);
  }, [ready, base]);

  // תלת־ממד (בהפעלה הראשונה בלי תלת־ממד לא נוגעים במצלמה, כדי לא לבטל את המיקוד)
  const was3d = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!ready || (!terrain && !was3d.current)) return;
    was3d.current = terrain;
    if (terrain) {
      m.setTerrain({ source: 'dem', exaggeration: 1.4 });
      m.easeTo({ pitch: 58, duration: 900 });
    } else {
      m.setTerrain(null);
      m.easeTo({ pitch: 0, bearing: 0, duration: 900 });
    }
  }, [ready, terrain]);

  // סמן מהפרופיל
  useEffect(() => {
    const m = map.current;
    if (!ready) return;
    m.getSource('marker').setData({ type: 'FeatureCollection', features: marker ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: marker } }] : [] });
  }, [ready, marker]);

  useImperativeHandle(ref, () => ({
    /** טיסה לאורך מקטע. מחזירה פונקציית עצירה. */
    fly(n) {
      const m = map.current;
      const t = trail?.sections.find((x) => x.n === n);
      if (!m || !t) return () => {};
      cancelAnimationFrame(fly.current);
      // אסימון לכל טיסה: לולאה ישנה או מאזין ישן לא יכולים להמשיך או לעצור טיסה חדשה
      const token = {};
      flyToken.current = token;
      const coords = reverse ? [...t.geom].reverse() : t.geom;
      const total = t.length;
      const ms = Math.min(42000, Math.max(14000, total * 1300));
      let t0 = null;
      let brg = m.getBearing();
      const stop = () => {
        if (flyToken.current !== token) return;
        flyToken.current = null;
        cancelAnimationFrame(fly.current);
        m.off('mousedown', stop);
        m.off('touchstart', stop);
        props.current.onFly?.(null);
      };
      const step = (now) => {
        if (flyToken.current !== token) return;
        if (t0 == null) t0 = now;
        const p = Math.min(1, (now - t0) / ms);
        const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const km = eased * total;
        const here = pointAt(coords, km);
        const ahead = pointAt(coords, Math.min(total, km + 0.6));
        const target = here[0] === ahead[0] && here[1] === ahead[1] ? brg : bearing(here, ahead);
        const diff = ((target - brg + 540) % 360) - 180;
        brg += diff * 0.06;
        m.jumpTo({ center: here, bearing: brg, pitch: 62, zoom: 13.6 });
        if (box.current) box.current.dataset.flyKm = km.toFixed(2);
        props.current.onFly?.(reverse ? total - km : km, here);
        if (p < 1) fly.current = requestAnimationFrame(step);
        else stop();
      };
      m.setTerrain({ source: 'dem', exaggeration: 1.4 });
      fly.current = requestAnimationFrame(step);
      m.on('mousedown', stop);
      m.on('touchstart', stop);
      return stop;
    },
    stop() { flyToken.current = null; cancelAnimationFrame(fly.current); },
    get map() { return map.current; },
  }));

  return <div ref={box} className={`tmap ${className}`} role="region" aria-label="מפת שביל ישראל" />;
});

export default TrailMap;
