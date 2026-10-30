// בדיקת קצה לקצה מול vite preview. כל קריאה חיצונית מוחלפת במוק.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { readFileSync, mkdirSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = 'http://localhost:4173';
const SHOTS = process.env.SHOTS || 'test-results';
mkdirSync(SHOTS, { recursive: true });
const png = readFileSync('public/icon-512.png');
const menu = readFileSync('tests/ai-menu.fixture.js');
const nature = JSON.parse(readFileSync('src/data/generated/nature.json', 'utf8'));
const trail = JSON.parse(readFileSync('public/data/trail.json', 'utf8'));

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };

// יחידה: זריחה ושקיעה בירושלים ב-21 ביוני 2026 (לפי טבלאות: 05:33 ו-19:48 בשעון קיץ)
const { sunTimes, clock } = await import('../src/lib/sun.js');
const sj = sunTimes(new Date(2026, 5, 21), 31.778, 35.235);
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
ok(Math.abs(toMin(clock(sj.rise)) - toMin('05:33')) <= 3, `sunrise Jerusalem ${clock(sj.rise)} ~ 05:33`);
ok(Math.abs(toMin(clock(sj.set)) - toMin('19:48')) <= 3, `sunset Jerusalem ${clock(sj.set)} ~ 19:48`);
ok(trail.sections.length === 56 && Math.abs(trail.totalKm - 1082) < 30, `trail data: 56 sections, ${trail.totalKm} km`);
ok(trail.sections.every((s, i) => i === 0 || Math.abs(s.startKm - (trail.sections[i - 1].startKm + trail.sections[i - 1].length)) < 0.3), 'sections are contiguous');

const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
await new Promise((res) => server.stdout.on('data', (d) => String(d).includes('4173') && res()));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const calls = { meteo: 0, inat: 0, wiki: 0 };
async function mockAll(ctx) {
  await ctx.route(/wikipedia\.org/, (r) => {
    calls.wiki++;
    const t = decodeURIComponent(new URL(r.request().url()).searchParams.get('titles') || '');
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ query: { pages: { 1: { title: t, extract: `${t} הוא מקום בשביל.`, thumbnail: { source: 'https://img.test/a.png' } } } } }) });
  });
  await ctx.route(/api\.open-meteo\.com/, (r) => {
    calls.meteo++;
    const t = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ daily: { time: t, temperature_2m_max: [24, 26, 33, 22], temperature_2m_min: [14, 15, 18, 12], precipitation_probability_max: [0, 10, 0, 60], wind_speed_10m_max: [12, 18, 9, 25] } }) });
  });
  await ctx.route(/api\.inaturalist\.org/, (r) => {
    calls.inat++;
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ total_results: 3, results: [1, 2, 3].map((i) => ({ id: i, observed_on: '2026-10-20', quality_grade: 'research', taxon: { name: 'Sternbergia clusiana', preferred_common_name: 'חלמונית גדולה' }, photos: [{ url: 'https://img.test/square.jpg' }] })) }) });
  });
  await ctx.route(/img\.test|inaturalist-open-data|static\.inaturalist|openstreetmap|arcgisonline|elevation-tiles-prod/, (r) => r.fulfill({ contentType: 'image/png', body: png }));
  await ctx.route(/appofapp-gh\.vercel\.app\/ai-menu\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: menu }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
}

const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(`${page.url()} ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_FAILED|WebGL|GPU stall/.test(m.text())) errors.push(`${page.url()} ${m.text()}`); });
};
const mapReady = (page, sel = '.tmap') => page.waitForSelector(`${sel}[data-features="56"]`, { timeout: 20000 });

// מחשב
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'he-IL' });
await mockAll(ctx);
const page = await ctx.newPage();
watch(page);
await page.goto(`${ROOT}/?m=1`);
await mapReady(page);
ok(await page.locator('ai-menu .logo').isVisible().catch(() => false), 'A&I logo button in the top bar');
ok(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar');
ok(await page.locator('.atlas canvas.maplibregl-canvas').count() === 1, 'home map renders (WebGL canvas)');
ok(await page.locator('.atlas .legend').isVisible(), 'home map has a legend');
ok((await page.locator('.sec-list .sec-row').count()) === 56 && (await page.locator('.sub-name').count()) === 11, 'a row for every section, grouped under 11 named subregions');
const janColors = await page.locator('.tmap').getAttribute('data-colors');
const janText = await page.locator('.tally-text').textContent();
await page.locator('.months button', { hasText: 'יולי' }).click();
await page.waitForTimeout(300);
ok(new URL(page.url()).searchParams.get('m') === '7', 'month choice is kept in the URL');
ok((await page.locator('.tally-text').textContent()) !== janText || (await page.locator('.tmap').getAttribute('data-colors')) !== janColors, 'month changes the traffic light');
await page.locator('.hero .seg button', { hasText: 'אזורים' }).click();
await page.waitForTimeout(300);
ok((await page.locator('.tmap').getAttribute('data-colors')).split(' ').length === 5, 'region mode colors the trail by 5 regions');
await page.screenshot({ path: `${SHOTS}/home-desktop.png` });
// פרופיל הארץ: מעבר ולחיצה פותחים מקטע
const prof = page.locator('.overview .profile svg');
await prof.scrollIntoViewIfNeeded();
const box = await prof.boundingBox();
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.waitForTimeout(200);
ok(await page.locator('.overview-head b').count() === 1, 'hovering the national profile names the section');
await page.mouse.click(box.x + box.width * 0.003, box.y + box.height * 0.5);
await page.waitForTimeout(400);
ok(new URL(page.url()).searchParams.get('s') === '56' && /אילת/.test(await page.locator('.focus h2').textContent()), 'clicking the left end of the profile focuses the Eilat section');
await page.locator('.focus a.btn').click();
await page.waitForURL(/\/s\/56/);
ok(true, 'focus panel opens the section page');

// כל המקטעים
for (const n of Array.from({ length: 56 }, (_, i) => i + 1)) {
  await page.goto(`${ROOT}/s/${n}`);
  await page.waitForSelector('.tile');
  const h1 = await page.locator('h1').textContent();
  ok((await page.locator('.tile').count()) === 7 && h1.includes(String(n)), `section ${n}: header and 7 metric tiles`);
  const href = await page.locator('a.btn', { hasText: 'המדריך הרשמי' }).getAttribute('href');
  if (!/^https:\/\/www\.teva\.org\.il\/israel-national-trail\/(id-)\d+$/.test(href)) ok(false, `section ${n}: official link ${href}`);
}
await page.goto(`${ROOT}/s/6`);
await mapReady(page, '.s-map .tmap');
await page.waitForSelector('.s-map .profile svg > path', { state: 'attached' });
ok(await page.locator('.fc li').count() === 4, 'forecast shows 4 days');
ok((await page.locator('.kind-col').count()) >= 3, 'section shows living, plants and land phenomena');
ok((await page.locator('.strip-big .strip-months span').count()) === 12, 'year strip names every month');
await page.locator('.strip-big .strip i').nth(6).click();
ok(/יולי/.test(await page.locator('.s-grid .verdict-why').textContent()), 'clicking a month explains that month');
ok(await page.locator('.fc li.hot').count() === 1, 'hot day (33) flagged in red');
ok(await page.locator('.obs .ob').count() === 3, 'recent nature observations shown');
await page.locator('.card-head .seg button', { hasText: 'ציפורים' }).click();
await page.waitForTimeout(300);
ok(calls.inat >= 2, 'bird tab queries iNaturalist again');
await page.locator('.fly').click();
await page.waitForTimeout(1500);
const fk = Number(await page.locator('.s-map .tmap').getAttribute('data-fly-km'));
ok(fk > 0 && (await page.locator('.fly').textContent()) === 'עצירת הטיסה', `flyover moves along the section (${fk} km)`);
await page.screenshot({ path: `${SHOTS}/flyover.png` });
// לחיצה ישירה: ב-WebGL תוכנתי עם תבליט, הלחיצה הרגילה של Playwright מחכה שניות ליציבות
await page.evaluate(() => document.querySelector('.fly').click());
await page.waitForTimeout(300);
const fk2 = await page.locator('.s-map .tmap').getAttribute('data-fly-km');
await page.waitForTimeout(500);
const fk3 = await page.locator('.s-map .tmap').getAttribute('data-fly-km');
const flyText = await page.locator('.fly').textContent();
ok(flyText === 'טיסה לאורך המקטע' && fk2 === fk3, `flyover stops (${flyText}, ${fk2} -> ${fk3})`);
await page.locator('.s-head .seg button', { hasText: 'מדרום לצפון' }).click();
await page.waitForTimeout(300);
ok(new URL(page.url()).searchParams.get('dir') === 'sn' && (await page.locator('h1').textContent()).includes('הר מירון – ברעם'), 'south-to-north flips the section');
await page.locator('.check').click();
ok((await page.evaluate(() => localStorage.getItem('shvil-walked'))) === '[6]', 'walked mark saved locally');
await page.reload();
ok(await page.locator('.check.on').count() === 1, 'walked mark survives reload');
await page.locator('.pn-next').click();
await page.waitForURL(/\/s\/7/);
ok(true, 'next section link');
await page.screenshot({ path: `${SHOTS}/section-desktop.png` });

// עונות
await page.goto(`${ROOT}/seasons`);
ok((await page.locator('.mx-cell').count()) === 56 * 12, 'season matrix: 56 x 12 cells');
ok((await page.locator('.mx-group').count()) === 5 && (await page.locator('.mx-sub').count()) === 11, 'matrix rows are grouped and named (5 regions, 11 subregions)');
ok((await page.locator('.yc-group').count()) >= 5, 'year calendar: living, plants, land, sky and geology groups');
ok((await page.locator('.moon').count()) >= 24, 'year calendar shows new and full moons');
ok((await page.locator('.scale-legend').count()) >= 2, 'graded scale legend shown');
await page.locator('.mx-cell').nth(5 * 12 + 2).hover();
ok(/מקטע 6 · מרץ/.test(await page.locator('.mx-detail').textContent()), 'hovering a cell explains it');
await page.locator('.mx-cell').nth(33 * 12 + 6).hover();
ok((await page.locator('.mx-detail .factors tbody tr').count()) >= 4, 'cell detail breaks the score into factors');
ok(/בעיקר בגלל/.test(await page.locator('.mx-detail .verdict-why').textContent()) && /חום/.test(await page.locator('.mx-detail .verdict-why').textContent()), 'a July Dead Sea cell names heat as the main reason');
ok(/קושי/.test(await page.locator('.mx-detail .diff').textContent()), 'difficulty shown separately');
ok((await page.locator('.sp').count()) === nature.species.length, `all ${nature.species.length} species in the phenology section`);
ok((await page.locator('.curves path').count()) >= nature.species.length, 'every species has curves');
await page.goto(`${ROOT}/seasons#Anemone-coronaria`);
await page.waitForTimeout(900);
ok(await page.locator('#Anemone-coronaria').evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }), 'species deep link scrolls to the anemone');
await page.screenshot({ path: `${SHOTS}/seasons-desktop.png` });

// תכנון
await page.goto(`${ROOT}/plan?mode=km&dir=ns&start=2026-02-01&km=20&rest=6&from=1&to=56`);
await page.waitForSelector('.sort-table tbody tr');
const days20 = await page.locator('.big-num b').first().textContent();
ok(Number(days20) >= 60 && Number(days20) <= 70, `full trail at 20 km/day with rest days: ${days20} days`);
ok(await page.locator('tr.rest').count() >= 8, 'rest days inserted');
await page.locator('input[type=range]').first().fill('30');
await page.waitForTimeout(300);
ok(Number(await page.locator('.big-num b').first().textContent()) < Number(days20), 'faster pace = fewer days');
ok(new URL(page.url()).searchParams.get('km') === '30', 'plan is kept in the URL');
await page.locator('.plan-controls select').first().selectOption('37');
await page.waitForTimeout(300);
ok(/^37,/.test((await page.locator('.sort-table tbody tr td').nth(2).locator('small').textContent()).replace(/\D+/, '').trim()) || (await page.locator('.sort-table tbody tr').first().textContent()).includes('37'), 'starting section changes the first day');
await page.locator('.sort-table th button', { hasText: 'שעות' }).click();
ok((await page.locator('.sort-table tbody tr').first().textContent()).includes('יום מנוחה'), 'sorting by hours puts rest days first');
await page.locator('.sort-table th button', { hasText: 'שעות' }).click();
ok((await page.locator('th[aria-sort="descending"]').count()) === 1, 'sort direction is marked');
await page.locator('button.link', { hasText: 'לבחור את הטוב' }).click();
await page.waitForTimeout(300);
ok(new URL(page.url()).searchParams.get('start') !== null, 'best start date can be applied');
await page.screenshot({ path: `${SHOTS}/plan-desktop.png` });
await page.goto(`${ROOT}/plan`);
await page.waitForTimeout(300);
ok(new URL(page.url()).searchParams.get('from') === '37', 'plan restored from local storage');

// מקטע ליום (ברירת מחדל) ולוח המסע
await page.goto(`${ROOT}/plan?dir=ns&start=2026-02-01&rest=0&from=1&to=56`);
await page.waitForSelector('.cal-day.walk');
ok(Number(await page.locator('.big-num b').first().textContent()) === 56, 'section-per-day by default: 56 days for 56 sections');
ok((await page.locator('.cal-day.walk').count()) === 56, 'calendar shows every walking day');
ok((await page.locator('.cal-month').count()) >= 2, 'calendar spans the months of the trip');
ok(/מק' 1/.test(await page.locator('.cal-day.walk').first().textContent()), 'first calendar day is section 1');

// מדריך בכיס
const { GUIDE } = await import('../src/data/stations.js');
await page.goto(`${ROOT}/guide`);
ok((await page.locator('.gi-card').count()) === 56, 'pocket guide index lists all 56 sections');
await page.goto(`${ROOT}/s/6/guide`);
await mapReady(page, '.g-map .tmap');
const nSt = GUIDE[6].stations.length;
ok((await page.locator('.station-card').count()) === nSt, `section 6 guide: ${nSt} stations`);
await page.waitForSelector(`.g-map .tmap[data-points="${nSt}"]`);
ok(true, 'stations are pinned on the map');
ok((await page.locator('.g-know blockquote cite a').getAttribute('href')).includes('sefaria'), 'region quote links to its source');
ok((await page.locator('.haiku span').count()) === 3, 'region haiku has three lines');
const pts = async () => Number(await page.locator('.score-num b').textContent());
await page.locator('.station-card').first().locator('button', { hasText: 'סימון: הגעתי' }).click();
ok((await pts()) === 10, 'marking arrival scores 10');
await page.locator('.station-card').first().locator('button', { hasText: 'סימון: עשיתי את המשימה' }).click();
ok((await pts()) === 15, 'observation task scores 5');
await page.locator('.quiz-opts button').first().click();
ok((await pts()) === 35 && (await page.locator('.quiz .tone-solution').count()) === 1, 'right quiz answer scores 20 and is confirmed');
ok(await page.locator('.quiz-opts button').first().isDisabled(), 'quiz can be answered once');
await page.reload();
await page.waitForSelector('.score-num b');
ok((await pts()) === 35, 'guide progress survives reload');
ok((await page.locator('.btn').first().evaluate((el) => getComputedStyle(el).borderRadius)) === '0px', 'buttons are square');
// מיקום חי: ליד תחנה => הגעה אוטומטית
const gctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, geolocation: { latitude: 32.9754, longitude: 35.4284 }, permissions: ['geolocation'] });
await mockAll(gctx);
const gp = await gctx.newPage();
watch(gp);
await gp.goto(`${ROOT}/s/6/guide`);
await gp.waitForSelector('.station-card');
await gp.locator('button', { hasText: 'הפעלת מיקום' }).click();
await gp.waitForSelector('.gps-dist', { timeout: 10000 });
await gp.waitForTimeout(500);
ok(/אושר במיקום/.test(await gp.locator('.station-card', { hasText: 'עין זבד' }).textContent()), 'GPS within 150 m of a station marks it as reached');
ok(/בכיוון/.test(await gp.locator('.gps-dist').textContent()), 'GPS panel gives distance and direction to the next station');
await gctx.close();

// ניווט
await page.goto(ROOT);
for (const [label, path] of [['מדריך', '/guide'], ['עונות', '/seasons'], ['תכנון', '/plan'], ['השביל', '/']]) {
  await page.locator('.nav a', { hasText: label }).click();
  await page.waitForTimeout(300);
  ok(new URL(page.url()).pathname === path, `nav: ${label}`);
}
await page.goto(`${ROOT}/s/20`);
await page.locator('.brand').click();
await page.waitForTimeout(300);
ok(new URL(page.url()).pathname === '/', 'app name links home');

// התקנה
const cdp = await ctx.newCDPSession(page);
await page.goto(ROOT);
await page.waitForTimeout(1500);
const inst = await cdp.send('Page.getInstallabilityErrors');
ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`);

// נייד
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mockAll(m);
const mp = await m.newPage();
watch(mp);
for (const path of ['/', '/seasons', '/plan', '/guide', '/s/6/guide', '/s/1', '/s/33', '/s/56']) {
  await mp.goto(ROOT + path);
  await mp.waitForTimeout(900);
  const w = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(w[0] <= w[1], `mobile ${path}: no horizontal scroll (${w[0]}/${w[1]})`);
  ok(await mp.locator('ai-menu .logo').isVisible().catch(() => false), `mobile ${path}: logo visible`);
}
await mp.goto(ROOT);
await mapReady(mp);
await mp.screenshot({ path: `${SHOTS}/home-mobile.png` });
await mp.goto(`${ROOT}/s/43`);
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${SHOTS}/section-mobile.png`, fullPage: true });

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);
await browser.close();
server.kill();
console.log(fails ? `\n${fails} FAILED` : '\nALL GREEN');
process.exit(fails ? 1 : 0);
