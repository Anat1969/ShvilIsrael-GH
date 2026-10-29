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


# ---------------------------------------------------------------- nature
SPECIES = [
    # (שם עברי, שם מדעי, סוג, הסבר קצר)
    ('חצב מצוי', 'Drimia maritima', 'bloom', 'פריחתו בסוף הקיץ מבשרת את הסתיו, עוד לפני הגשם הראשון.'),
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
    ('דבוראי מצוי', 'Merops apiaster', 'migration', 'צבעוני וקולני, מגיע באביב לקנן בגדות עפר.'),
    ('יעל נובי', 'Capra nubiana', 'wildlife', 'חיים במצוקי המדבר, מעין גדי ועד הרי אילת.'),
]
BANDS = {'north': (32.45, 33.5), 'center': (31.35, 32.45), 'south': (29.4, 31.35)}


def inat(path):
    time.sleep(1.1)
    return get('https://api.inaturalist.org/v1/' + path)


def build_nature():
    out = []
    for he, sci, kind, note in SPECIES:
        key = sci.replace(' ', '_')
        tx = cached(f'inat-taxon-{key}.json', lambda: inat('taxa?rank=species&per_page=5&q=' + urllib.parse.quote(sci)))
        taxon = next((t for t in tx['results'] if t['name'] == sci), tx['results'][0])
        tid = taxon['id']
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


def build_photos():
    out = {}
    for m in sections_meta():
        items = [w for w in (wiki(e) for e in m['wiki']) if w]
        out[m['n']] = items
        print(f"  #{m['n']}: " + ', '.join(f"{w['title']}{' [img]' if w['src'] else ''}" for w in items))
    json.dump({'source': 'Hebrew Wikipedia (CC BY-SA)', 'sections': out},
              open(os.path.join(GEN, 'wiki.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    steps = sys.argv[1:] or ['trail', 'climate', 'nature', 'photos']
    for st in steps:
        print('==', st)
        {'trail': build_trail, 'climate': build_climate, 'nature': build_nature, 'photos': build_photos}[st]()
