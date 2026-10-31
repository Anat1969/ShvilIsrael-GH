"""
בונה את קובצי הנתונים של האפליקציה מהמקורות האמיתיים. הרצה: python3 scripts/build_data.py [שלבים]
שלבים: trail climate nature photos (ברירת מחדל: כולם). תוצרי ביניים נשמרים ב-scripts/.cache.

מקורות:
  trail   - רלציית OSM 282071 "שביל ישראל" (תוואי מסומן), גבהים מאריחי Terrarium של AWS (SRTM ועוד, ~30 מ').
  climate - Open-Meteo Historical API (ERA5), 2019 עד 2023, נקודת אמצע של כל מקטע.
  nature  - iNaturalist: היסטוגרמה חודשית של תצפיות מאומתות (research grade) בישראל, לפי מין ולפי רצועת רוחב.
  photos  - ויקיפדיה העברית: תמונה ופסקת פתיחה לכל מקטע.
"""
import io, json, math, os, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.cache')
OUT = os.path.join(ROOT, 'public', 'data')
GEN = os.path.join(ROOT, 'src', 'data', 'generated')
for d in (CACHE, OUT, GEN):
    os.makedirs(d, exist_ok=True)
UA = {'User-Agent': 'ShvilIsrael-app/1.0 (github.com/Anat1969/ShvilIsrael-GH)'}


def get(url, binary=False, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                b = r.read()
                return b if binary else json.loads(b)
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            print('    retry', e)
            time.sleep(15 * (i + 1))


def cached(name, fn):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        return json.load(open(p))
    v = fn()
    json.dump(v, open(p, 'w'))
    return v


def sections_meta():
    """קורא את מספרי המקטעים, האורכים והשמות מתוך src/data/sections.js."""
    src = open(os.path.join(ROOT, 'src', 'data', 'sections.js'), encoding='utf8').read()
    rows = re.findall(r"s\((\d+), '([^']+)', '([^']+)', ([\d.]+), '[^']+', '(\w+)', (null|\[[^\]]*\]), (\[[^\]]*\])", src)
    return [{'n': int(a), 'from': b, 'to': c, 'km': float(d), 'season': e, 'wiki': json.loads(g.replace("'", '"'))} for a, b, c, d, e, f, g in rows]


def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


# ---------------------------------------------------------------- trail
# נקודות עיגון ידועות לסוף מקטע (lat, lon). השאר מחולקים לפי האורך הרשמי בין העוגנים.
ANCHORS = {
    1: (33.2486, 35.6941), 2: (33.2410, 35.5750), 3: (33.0985, 35.5480), 8: (32.8386, 35.5000),
    9: (32.7240, 35.5617), 12: (32.7570, 35.2190), 13: (32.7428, 35.0786), 15: (32.6436, 34.9928),
    16: (32.5300, 34.9310), 17: (32.3780, 34.8660), 18: (32.2480, 34.8400), 20: (32.1050, 34.9300),
    22: (31.8380, 34.9790), 23: (31.7860, 35.1240), 24: (31.7290, 35.0730), 25: (31.6930, 34.9640),
    26: (31.6110, 34.8960), 28: (31.4220, 34.8270), 29: (31.3240, 34.9380), 30: (31.3470, 35.1070),
    31: (31.2570, 35.2120), 33: (31.3150, 35.3540), 34: (31.2000, 35.3620), 42: (30.6100, 34.8020),
    45: (30.6150, 35.1900), 49: (30.0430, 35.0350), 50: (29.9080, 35.0350), 53: (29.7130, 34.9810),
}


def osm_line():
    p = os.path.join(CACHE, 'osm-282071.xml')
    if not os.path.exists(p):
        open(p, 'wb').write(get('https://www.openstreetmap.org/api/0.6/relation/282071/full', binary=True))
    root = ET.parse(p).getroot()
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    ways = {w.get('id'): [nd.get('ref') for nd in w.iter('nd')] for w in root.iter('way')}
    rel = [r for r in root.iter('relation') if r.get('id') == '282071'][0]
    members = [m.get('ref') for m in rel.iter('member') if m.get('type') == 'way']
    line = []
    for i, wid in enumerate(members):
        ids = ways[wid]
        if not line:
            nxt = ways[members[1]]
            line = ids[::-1] if ids[0] in (nxt[0], nxt[-1]) else list(ids)
            continue
        last = nodes[line[-1]]
        d0, d1 = hav(last, nodes[ids[0]]), hav(last, nodes[ids[-1]])
        if min(d0, d1) > 50:  # בסוף הרלציה יש וריאנטים חלופיים שאינם ברצף
            print(f'  stop at member {i}: jump {min(d0, d1):.0f} km')
            break
        if d1 < d0:
            ids = ids[::-1]
        line += ids[1:] if ids[0] == line[-1] else ids
    pts = [nodes[i] for i in line]
    return [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]


def resample(pts, step=0.1):
    """נקודה כל step ק"מ לאורך הקו."""
    out = [pts[0]]
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        d = hav(a, b)
        while acc + d >= step:
            t = (step - acc) / d
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            d = hav(a, b)
            out.append(a)
            acc = 0.0
        acc += d
    out.append(pts[-1])
    return out


TILE_Z = 12


def terrarium(points):
    from PIL import Image
    tiles = {}

    def tile(x, y):
        k = (x, y)
        if k not in tiles:
            p = os.path.join(CACHE, f'terr-{TILE_Z}-{x}-{y}.png')
            if not os.path.exists(p):
                open(p, 'wb').write(get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{TILE_Z}/{x}/{y}.png', binary=True))
            tiles[k] = Image.open(p).convert('RGB')
        return tiles[k]

    n = 2 ** TILE_Z
    out = []
    for lat, lon in points:
        fx = (lon + 180) / 360 * n
        fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        x, y = int(fx), int(fy)
        px, py = min(255, int((fx - x) * 256)), min(255, int((fy - y) * 256))
        r, g, b = tile(x, y).getpixel((px, py))
        out.append(r * 256 + g + b / 256 - 32768)
    return out


def smooth(v, w=5):
    h = w // 2
    return [sorted(v[max(0, i - h): i + h + 1])[len(v[max(0, i - h): i + h + 1]) // 2] for i in range(len(v))]


def dp(points, tol):
    """פישוט Douglas-Peucker (במעלות)."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        s, e = stack.pop()
        a, b = points[s], points[e]
        dx, dy = b[1] - a[1], b[0] - a[0]
        L = dx * dx + dy * dy
        best, bi = 0, -1
        for i in range(s + 1, e):
            p = points[i]
            if L == 0:
                d = math.hypot(p[1] - a[1], p[0] - a[0])
            else:
                t = max(0, min(1, ((p[1] - a[1]) * dx + (p[0] - a[0]) * dy) / L))
                d = math.hypot(p[1] - a[1] - t * dx, p[0] - a[0] - t * dy)
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack += [(s, bi), (bi, e)]
    return [p for p, k in zip(points, keep) if k]


def tobler_hours(km, ele):
    """זמן הליכה לפי פונקציית ההליכה של טובלר (1993), על שביל, בקטעים של 100 מ'."""
    h = 0.0
    for i in range(1, len(km)):
        dx = (km[i] - km[i - 1]) * 1000
        if dx <= 0:
            continue
        v = 6 * math.exp(-3.5 * abs((ele[i] - ele[i - 1]) / dx + 0.05))
        h += (dx / 1000) / v
    return h


def build_trail():
    meta = sections_meta()
    print('trail: OSM')
    line = osm_line()
    pts = resample(line, 0.1)
    total = (len(pts) - 1) * 0.1
    print(f'  {len(line)} nodes, {total:.1f} km, {len(pts)} samples')
    print('  elevation (terrarium z12)')
    ele_raw = terrarium(pts)
    ele = smooth(ele_raw, 7)
    km = [i * 0.1 for i in range(len(pts))]

    # גבולות מקטעים: לפי האורך הרשמי, מתוקן לנקודות עיגון.
    off_total = sum(m['km'] for m in meta)
    cum = [0]
    for m in meta:
        cum.append(cum[-1] + m['km'])
    est = [c / off_total * total for c in cum]
    idx = {0: 0, len(meta): len(pts) - 1}
    for n, (la, lo) in ANCHORS.items():
        e = int(est[n] / 0.1)
        lo_i, hi_i = max(0, e - 300), min(len(pts) - 1, e + 300)
        best = min(range(lo_i, hi_i), key=lambda i: hav(pts[i], (la, lo)))
        dist = hav(pts[best], (la, lo))
        if dist < 2.5:
            idx[n] = best
        else:
            print(f'  anchor {n} not near trail ({dist:.1f} km), skipped')
    known = sorted(idx)
    for n in range(1, len(meta)):
        if n in idx:
            continue
        a = max(k for k in known if k < n)
        b = min(k for k in known if k > n)
        t = (cum[n] - cum[a]) / (cum[b] - cum[a])
        idx[n] = int(round(idx[a] + (idx[b] - idx[a]) * t))
    bounds = [idx[i] for i in range(len(meta) + 1)]
    assert all(b2 > b1 for b1, b2 in zip(bounds, bounds[1:])), bounds

    sections = []
    for i, m in enumerate(meta):
        a, b = bounds[i], bounds[i + 1]
        seg_pts, seg_e, seg_km = pts[a:b + 1], ele[a:b + 1], km[a:b + 1]
        up = sum(max(0, seg_e[j] - seg_e[j - 1]) for j in range(1, len(seg_e)))
        down = sum(max(0, seg_e[j - 1] - seg_e[j]) for j in range(1, len(seg_e)))
        length = seg_km[-1] - seg_km[0]
        geom = dp(line_slice(line, seg_pts[0], seg_pts[-1]), 0.00012)
        mid = seg_pts[len(seg_pts) // 2]
        lats = [p[0] for p in seg_pts]
        lons = [p[1] for p in seg_pts]
        sections.append({
            'n': m['n'],
            'startKm': round(seg_km[0], 1),
            'length': round(length, 1),
            'up': int(up), 'down': int(down),
            'max': int(max(seg_e)), 'min': int(min(seg_e)),
            'tobler': round(tobler_hours(seg_km, seg_e), 1),
            'naismith': round(length / 5 + up / 600, 1),
            'mid': [round(mid[0], 5), round(mid[1], 5)],
            'start': [round(seg_pts[0][0], 5), round(seg_pts[0][1], 5)],
            'end': [round(seg_pts[-1][0], 5), round(seg_pts[-1][1], 5)],
            'bbox': [round(min(lons), 4), round(min(lats), 4), round(max(lons), 4), round(max(lats), 4)],
            'geom': [[round(p[1], 5), round(p[0], 5)] for p in geom],
            'profile': [[round(seg_km[j] - seg_km[0], 2), int(seg_e[j])] for j in range(0, len(seg_e), 2)] + ([[round(length, 2), int(seg_e[-1])]] if (len(seg_e) - 1) % 2 else []),
        })
        print(f"  #{m['n']:>2} {length:5.1f} km (official {m['km']}) up {int(up)} down {int(down)} {min(seg_e):.0f}..{max(seg_e):.0f}")
    overview = [[round(km[j], 1), int(ele[j])] for j in range(0, len(ele), 5)]
    json.dump({'source': 'OSM relation 282071, AWS Terrarium DEM', 'built': time.strftime('%Y-%m-%d'),
               'totalKm': round(total, 1), 'sections': sections}, open(os.path.join(OUT, 'trail.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    summary = [{k: v for k, v in s.items() if k not in ('geom', 'profile')} for s in sections]
    json.dump({'totalKm': round(total, 1), 'sections': summary, 'overview': overview},
              open(os.path.join(GEN, 'stats.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('  wrote trail.json + stats.json')


def line_slice(line, a, b):
    """הקטע של הקו המקורי (המפורט) בין שתי נקודות דגימה."""
    def nearest(p, start=0):
        return min(range(start, len(line)), key=lambda i: (line[i][0] - p[0]) ** 2 + (line[i][1] - p[1]) ** 2)
    i = nearest(a)
    j = nearest(b, i)
    return [a] + line[i + 1:j] + [b] if j > i else [a, b]


# ---------------------------------------------------------------- climate
def profile_mid_ele(n):
    t = json.load(open(os.path.join(OUT, 'trail.json')))
    pr = next(s for s in t['sections'] if s['n'] == n)['profile']
    return pr[len(pr) // 2][1]


def build_climate():
    stats = json.load(open(os.path.join(GEN, 'stats.json')))
    out = {}
    for s in stats['sections']:
        la, lo = s['mid']
        ele = profile_mid_ele(s['n'])
        url = ('https://archive-api.open-meteo.com/v1/archive?latitude=%s&longitude=%s&elevation=%s'
               '&start_date=2021-01-01&end_date=2023-12-31'
               '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%%2FJerusalem' % (la, lo, ele))
        d = cached(f"era5-{s['n']}.json", lambda: (time.sleep(20), get(url, tries=8))[1])['daily']
        tmax, tmin, rain, rdays, cnt = [0.0] * 12, [0.0] * 12, [0.0] * 12, [0] * 12, [0] * 12
        for t, a, b, p in zip(d['time'], d['temperature_2m_max'], d['temperature_2m_min'], d['precipitation_sum']):
            m = int(t[5:7]) - 1
            if a is None:
                continue
            tmax[m] += a; tmin[m] += b; rain[m] += p or 0; rdays[m] += 1 if (p or 0) >= 1 else 0; cnt[m] += 1
        years = 3
        out[s['n']] = {
            'tmax': [round(tmax[m] / cnt[m], 1) for m in range(12)],
            'tmin': [round(tmin[m] / cnt[m], 1) for m in range(12)],
            'rain': [round(rain[m] / years) for m in range(12)],
            'rainDays': [round(rdays[m] / years, 1) for m in range(12)],
        }
        print(f"  climate #{s['n']}: Jul tmax {out[s['n']]['tmax'][6]}  Jan rain {out[s['n']]['rain'][0]}")
    json.dump({'source': 'ERA5 via Open-Meteo Historical API, 2021-2023, section midpoint, elevation-adjusted', 'sections': out},
              open(os.path.join(GEN, 'climate.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


def build_climate_power():
    """גיבוי כש-Open-Meteo חסום: NASA POWER (MERRA-2), יומי 2015 עד 2024, רזולוציה 0.5 על 0.625 מעלות.
    הטמפרטורה מתוקנת לגובה המקטע לפי 6.5 מעלות לק"מ, ביחס לגובה התא של POWER."""
    import collections
    stats = json.load(open(os.path.join(GEN, 'stats.json')))
    out = {}
    for s in stats['sections']:
        la, lo = s['mid']
        ele = profile_mid_ele(s['n'])
        url = ('https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=RE'
               f'&longitude={lo}&latitude={la}&start=20150101&end=20241231&format=JSON')
        d = cached(f"power-{s['n']}.json", lambda: (time.sleep(1), get(url))[1])
        cell = d['geometry']['coordinates'][2]
        corr = -6.5 * (ele - cell) / 1000
        P = d['properties']['parameter']
        agg = collections.defaultdict(lambda: collections.defaultdict(list))
        for key in ('T2M_MAX', 'T2M_MIN', 'PRECTOTCORR'):
            for day, v in P[key].items():
                if v != -999:
                    agg[key][int(day[4:6]) - 1].append(v)
        years = 10
        out[s['n']] = {
            'tmax': [round(sum(agg['T2M_MAX'][m]) / len(agg['T2M_MAX'][m]) + corr, 1) for m in range(12)],
            'tmin': [round(sum(agg['T2M_MIN'][m]) / len(agg['T2M_MIN'][m]) + corr, 1) for m in range(12)],
            'rain': [round(sum(agg['PRECTOTCORR'][m]) / years) for m in range(12)],
            'rainDays': [round(sum(1 for v in agg['PRECTOTCORR'][m] if v >= 1) / years, 1) for m in range(12)],
        }
        print(f"  power #{s['n']}: cell {cell:.0f}m trail {ele}m corr {corr:+.1f}  Jan {out[s['n']]['tmax'][0]} Jul {out[s['n']]['tmax'][6]} rain/yr {sum(out[s['n']]['rain'])}")
    json.dump({'source': 'NASA POWER (MERRA-2), daily 2015-2024, ~50 km grid, temperature adjusted to trail elevation (6.5°C/km)',
               'resolutionKm': 50, 'sections': out},
              open(os.path.join(GEN, 'climate.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- nature
SPECIES = [
    # (שם עברי, שם מדעי, סוג, הסבר קצר)
    ('חצב מצוי', 'Drimia maritima', 'bloom', 'פריחתו בסוף הקיץ מבשרת את הסתיו, עוד לפני הגשם הראשון.', 1159146),  # בישראל מזוהה לרוב כקומפלקס
    ('חלמונית גדולה', 'Sternbergia clusiana', 'bloom', 'מבשרי הגשם: פרח צהוב גדול שעולה ישר מהאדמה בסתיו.'),
    ('סתוונית היורה', 'Colchicum stevenii', 'bloom', 'פורחת עם הגשמים הראשונים, ורודה ונמוכה.'),
    ('נרקיס מצוי', 'Narcissus tazetta', 'bloom', 'פריחת חורף ריחנית באדמות לחות ובשולי ביצות.'),
    ('רקפת מצויה', 'Cyclamen persicum', 'bloom', 'בין סלעים ובצל החורש, מהחורף עד האביב.'),
    ('כלנית מצויה', 'Anemone coronaria', 'bloom', 'הפרח הלאומי. אדום, לבן או סגול, בשיא בחורף.'),
    ('שקד מצוי', 'Prunus dulcis', 'bloom', 'פריחה לבנה על ענפים חשופים, סימן לסוף החורף.'),
    ('נורית אסיה', 'Ranunculus asiaticus', 'bloom', 'כתמי אדום וצהוב בבתות ובשולי החורש.'),
    ('תורמוס ההרים', 'Lupinus pilosus', 'bloom', 'מרבדים כחולים במדרונות בהירים בסוף החורף.'),
    ('אירוס הארגמן', 'Iris atropurpurea', 'bloom', 'אירוס נדיר של מישור החוף, בשמורות נתניה והשרון.'),
    ('אירוס נצרתי', 'Iris bismarckiana', 'bloom', 'אירוס גדול של הגליל התחתון, במרץ.'),
    ('אירוס שחום', 'Iris atrofusca', 'bloom', 'אירוס כהה בספר המדבר, סביב ערד, באמצע מרץ.'),
    ('צבעוני ההרים', 'Tulipa agenensis', 'bloom', 'צבעוני אדום בשדות ובבתות, בסוף החורף.'),
    ('כליל החורש', 'Cercis siliquastrum', 'bloom', 'עץ שמכסה את עצמו בוורוד באביב, לפני העלים.'),
    ('פרג אגסי', 'Papaver umbonatum', 'bloom', 'אדום עז בשדות ובשולי דרכים באביב.'),
    ('עגור אפור', 'Grus grus', 'migration', 'עשרות אלפים חורפים בעמק החולה. נשמעים לפני שנראים.'),
    ('חסידה לבנה', 'Ciconia ciconia', 'migration', 'נודדת בלהקות ענק מעל עמק הירדן, באביב ובסתיו.'),
    ('שקנאי מצוי', 'Pelecanus onocrotalus', 'migration', 'להקות לבנות עוצרות בבריכות הדגים בסתיו.'),
    ('עקב חורף', 'Buteo buteo', 'migration', 'עקב הערבות: מאות אלפים חוצים את אילת באביב.'),
    ('דיה שחורה', 'Milvus migrans', 'migration', 'מהעופות הדורסים הנודדים הנפוצים מעל הערבה.'),
    ('שרקרק מצוי', 'Merops apiaster', 'migration', 'צבעוני וקולני, מגיע באביב לקנן בגדות עפר.'),
    ('יעל נובי', 'Capra nubiana', 'wildlife', 'חיים במצוקי המדבר, מעין גדי ועד הרי אילת.'),
]
BANDS = {'north': (32.45, 33.5), 'center': (31.35, 32.45), 'south': (29.4, 31.35)}


def inat(path):
    time.sleep(1.1)
    return get('https://api.inaturalist.org/v1/' + path)


def build_nature():
    out = []
    for he, sci, kind, note, *fixed in SPECIES:
        key = sci.replace(' ', '_') + (f'_{fixed[0]}' if fixed else '')
        if fixed:
            tid = fixed[0]
        else:
            tx = cached(f'inat-taxon-{key}.json', lambda: inat('taxa?rank=species&per_page=5&q=' + urllib.parse.quote(sci)))
            tid = next((t for t in tx['results'] if t['name'] == sci), tx['results'][0])['id']
        months = {}
        for band, (a, b) in [('all', (None, None))] + list(BANDS.items()):
            q = f'observations/histogram?taxon_id={tid}&place_id=6815&interval=month_of_year&quality_grade=research'
            if a:
                q += f'&swlat={a}&nelat={b}&swlng=34.2&nelng=35.95'
            h = cached(f'inat-hist-{key}-{band}.json', lambda: inat(q))
            mo = h['results']['month_of_year']
            months[band] = [mo.get(str(m), 0) for m in range(1, 13)]
        ph = cached(f'inat-photo-{key}.json', lambda: inat(
            f'observations?taxon_id={tid}&place_id=6815&quality_grade=research&photo_license=cc-by,cc-by-sa,cc0&per_page=5&order_by=votes&photos=true'))
        photo = None
        for o in ph['results']:
            for p in o.get('photos', []):
                if p.get('license_code') in ('cc-by', 'cc-by-sa', 'cc0'):
                    photo = {'src': p['url'].replace('square', 'medium'), 'by': p.get('attribution', ''), 'page': f"https://www.inaturalist.org/observations/{o['id']}"}
                    break
            if photo:
                break
        out.append({'he': he, 'sci': sci, 'kind': kind, 'note': note, 'taxon': tid, 'months': months, 'photo': photo})
        print(f"  {he}: {sum(months['all'])} obs, peak month {months['all'].index(max(months['all'])) + 1}")
    json.dump({'source': 'iNaturalist research-grade observations in Israel (place 6815)', 'built': time.strftime('%Y-%m-%d'), 'species': out},
              open(os.path.join(GEN, 'nature.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- photos
def wiki(entry):
    lang, title = entry.split(':', 1)
    url = (f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|extracts'
           f'&piprop=thumbnail&pithumbsize=960&exintro=1&explaintext=1&exsentences=2&titles=' + urllib.parse.quote(title))
    d = cached('wiki-' + re.sub(r'\W', '_', entry) + '.json', lambda: (time.sleep(0.3), get(url))[1])
    page = next(iter(d.get('query', {}).get('pages', {}).values()), {})
    if 'missing' in page:
        return None
    return {
        'title': page.get('title'),
        'src': page.get('thumbnail', {}).get('source'),
        'extract': re.sub(r'\s+', ' ', page.get('extract', '')).strip(),
        'page': f"https://{lang}.wikipedia.org/wiki/" + urllib.parse.quote(page.get('title', title).replace(' ', '_')),
    }


def wiki_batch(entries):
    """עד 20 ערכים בבקשה אחת (מגבלת extracts), כדי לא להיחסם בקצב."""
    todo = [e for e in entries if not os.path.exists(os.path.join(CACHE, 'wiki-' + re.sub(r'\W', '_', e) + '.json'))]
    for i in range(0, len(todo), 20):
        chunk = todo[i:i + 20]
        titles = '|'.join(e.split(':', 1)[1] for e in chunk)
        url = ('https://he.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|extracts'
               '&piprop=thumbnail&pithumbsize=960&pilimit=20&exintro=1&explaintext=1&exsentences=2&exlimit=20&titles=' + urllib.parse.quote(titles))
        time.sleep(3)
        d = get(url, tries=8)
        q = d.get('query', {})
        alias = {x['from']: x['to'] for x in q.get('normalized', []) + q.get('redirects', [])}
        pages = {p['title']: p for p in q.get('pages', {}).values()}
        for e in chunk:
            t = e.split(':', 1)[1]
            t2 = alias.get(t, t)
            t2 = alias.get(t2, t2)
            page = pages.get(t2, {'missing': ''})
            json.dump({'query': {'pages': {'1': page}}}, open(os.path.join(CACHE, 'wiki-' + re.sub(r'\W', '_', e) + '.json'), 'w'))


def build_photos():
    out = {}
    meta = sections_meta()
    wiki_batch([e for m in meta for e in m['wiki']])
    for m in meta:
        items = [w for w in (wiki(e) for e in m['wiki']) if w]
        out[m['n']] = items
        print(f"  #{m['n']}: " + ', '.join(f"{w['title']}{' [img]' if w['src'] else ''}" for w in items))
    json.dump({'source': 'Hebrew Wikipedia (CC BY-SA)', 'sections': out},
              open(os.path.join(GEN, 'wiki.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- stations
def build_stations():
    """מיקום תחנות המדריך בכיס: חיפוש ב-Nominatim (OpenStreetMap) בתוך תיבת המקטע, וחיתוך לתוואי."""
    src = open(os.path.join(ROOT, 'src', 'data', 'stations.js'), encoding='utf8').read()
    trail = json.load(open(os.path.join(OUT, 'trail.json')))
    out = {}
    # פירוק פשוט של הקובץ: מספר מקטע, ואז שמות התחנות ושדות q
    blocks = re.split(r'\n  (\d+): \{', src)[1:]
    for num, body in zip(blocks[0::2], blocks[1::2]):
        n = int(num)
        sec = trail['sections'][n - 1]
        line = [(c[1], c[0]) for c in sec['geom']]
        w, s_, e, nn = sec['bbox']
        res = []
        for i, m in enumerate(re.finditer(r"st\('((?:[^'\\]|\\.)*)',.*?\)(?:,\n|\n)", body, re.S)):
            name = m.group(1).replace("\\'", "'")
            qm = re.search(r"q: '((?:[^'\\]|\\.)*)'", m.group(0))
            q = (qm.group(1) if qm else name).replace("\\'", "'")
            hit = None
            for bounded in (1, 0):
                url = ('https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=il&accept-language=he'
                       f'&viewbox={w - 0.06},{nn + 0.06},{e + 0.06},{s_ - 0.06}&bounded={bounded}&q=' + urllib.parse.quote(q))
                d = cached('nom-' + re.sub(r'\W', '_', f'{n}-{q}-{bounded}') + '.json', lambda: (time.sleep(1.1), get(url))[1])
                for c in d:
                    pt = (float(c['lat']), float(c['lon']))
                    dist = min(hav(pt, p) for p in line)
                    if dist < 4 and (hit is None or dist < hit[1]):
                        hit = (pt, dist)
                if hit:
                    break
            if hit:
                pt, dist = hit
                j = min(range(len(line)), key=lambda k: hav(pt, line[k]))
                km = sum(hav(line[k], line[k + 1]) for k in range(j))
                res.append({'i': i, 'lat': round(pt[0], 5), 'lon': round(pt[1], 5), 'km': round(km, 2), 'off': round(dist, 2)})
            else:
                res.append({'i': i, 'lat': None, 'lon': None, 'km': None, 'off': None})
            print(f"  #{n} {name}: {'%.2f km off, at %.1f' % (hit[1], res[-1]['km']) if hit else 'not found'}")
        out[n] = res
    json.dump({'source': 'OpenStreetMap via Nominatim, snapped to the trail', 'sections': out},
              open(os.path.join(GEN, 'stations.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- facts
def build_facts():
    """סימני שטח מהמדריכים של החברה להגנת הטבע: תחבורה ציבורית, נקודות מים, לינה וצל.
    לכל סימן נשמר המשפט המקורי מהמדריך, כדי שהממשק יציג את המקור לצד הסימן."""
    def clean(x):
        return re.sub(r'[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F\u200d\u2B50\u2B55]', '', x).strip()
    src = open(os.path.join(ROOT, 'src', 'data', 'sections.js'), encoding='utf8').read()
    urls = dict((int(a), b) for a, b in re.findall(r"s\((\d+), '[^']+', '[^']+', [\d.]+, '([^']+)'", src))
    out = {}
    for n in range(1, 57):
        p = os.path.join(CACHE, 'teva', f'{n}.txt')
        if not os.path.exists(p):
            raw = get('https://www.teva.org.il/israel-national-trail/' + urls[n], binary=True).decode('utf8', 'ignore')
            raw = re.sub(r'<script.*?</script>|<style.*?</style>', '', raw, flags=re.S)
            import html as H
            open(p, 'w').write(H.unescape(re.sub(r'<[^>]+>', '\n', raw)))
            time.sleep(1)
        L = [clean(l) for l in open(p).read().split('\n')]
        L = [l for l in L if l]
        i0 = L.index('סגור את החיפוש') if 'סגור את החיפוש' in L else 0
        i1 = next((k for k, l in enumerate(L) if l.startswith(('עוד סיפורים מהטבע', 'רוצים לשמור', 'רוצות לשמור'))), len(L))
        L = L[i0:i1]
        T = '\n'.join(L)
        # תחבורה ציבורית: השורה שאחרי הכותרת
        bus_txt = ''
        for i, l in enumerate(L):
            if 'נגישות לתחבורה ציבורית' in l:
                rest = l.split('ציבורית', 1)[1].strip(' .:')
                nxt = L[i + 1] if i + 1 < len(L) else ''
                bus_txt = rest if len(rest) > 8 else nxt
                if l.startswith('אין') or rest.startswith('אין'):
                    bus_txt = l
                break
        if bus_txt.startswith(('לרכישת', 'מפת', 'מידע')):
            bus_txt = ''
        bus = None if not bus_txt else (False if re.match(r'^(אין|לא נגיש|לנקודת ההתחלה לא ניתן)', bus_txt) and 'מגיעים' not in bus_txt else True)
        # מים: אזכורים של ברז, מילוי מים או מי שתייה (בלי "ברזל")
        water = []
        for m in re.finditer(r'[^.\n]{0,90}(?:ברז(?!ל)|ברזי(?!ל)|מילוי מים|למלא מים|מי שתייה|מקור מים לשתייה|נקודות מילוי והצטיידות במים)[^.\n]{0,90}', T):
            sent = m.group(0).strip(' :')
            if 'לא לשתות' in sent:
                continue
            water.append(sent)
        no_water = any('אין מקור מים' in w or 'אין ברז' in w for w in water)
        # לינה
        rec = ''
        for i, l in enumerate(L):
            if l.startswith('המלצת לינה'):
                rec = L[i + 1] if i + 1 < len(L) else ''
                break
        nights = re.findall(r'[^.\n]{0,60}חניון (?:ה)?לילה[^.\n]{0,60}', T)
        # צל: אזכורים של צל מול חשיפה לשמש
        shade_hits = len(re.findall(r'מוצל|בצל |בצל העצים|בצל החורש|צל העצים|בין עצים|חורש|יער', T))
        exposed = re.search(r'[^.\n]{0,40}(?:חשוף (?:ברובו )?לשמש|חשופה לשמש|חשופים לשמש|ללא צל|בלי צל|אין צל)[^.\n]{0,40}', T)
        exposed_n = len(re.findall(r'חשוף (?:ברובו )?לשמש|חשופה לשמש|חשופים לשמש|ללא צל|בלי צל|אין צל', T))
        strong_exp = re.search(r'(?:השביל|המסלול|המקטע)[^.\n]{0,25}חשוף', T)
        strong_shade = re.search(r'רובו[^.\n]{0,20}בצל|מוצל ברובו', T)
        if strong_exp and not strong_shade:
            shade = 'exposed'
        elif strong_shade or (shade_hits >= 6 and shade_hits > 3 * exposed_n):
            shade = 'shade'
        elif (exposed and shade_hits < 6) or (n >= 31 and shade_hits < 3):
            shade = 'exposed'
        else:
            shade = 'partial'
        if strong_exp and not strong_shade:
            exposed = exposed or strong_exp
        shade_q = exposed.group(0).strip() if shade == 'exposed' and exposed else next(iter(re.findall(r'[^.\n]{0,60}(?:מוצל|בצל )[^.\n]{0,60}', T)), '')
        out[n] = {
            'bus': bus, 'busText': bus_txt[:180],
            'water': len(water), 'waterText': water[0][:180] if water else '', 'noWater': no_water,
            'lodge': rec[:120], 'nightCamps': len(nights), 'nightText': nights[0].strip()[:160] if nights else '',
            'shade': shade, 'shadeText': shade_q[:160],
        }
        f = out[n]
        print(f"  #{n}: bus {f['bus']} water {f['water']}{' (none)' if f['noWater'] else ''} camps {f['nightCamps']} shade {f['shade']}")
    json.dump({'source': 'המדריכים של החברה להגנת הטבע לכל מקטע (teva.org.il)', 'sections': out},
              open(os.path.join(GEN, 'facts.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    steps = sys.argv[1:] or ['trail', 'climate', 'nature', 'photos']
    for st in steps:
        print('==', st)
        {'trail': build_trail, 'climate': build_climate, 'power': build_climate_power, 'nature': build_nature, 'photos': build_photos, 'stations': build_stations, 'facts': build_facts}[st]()
