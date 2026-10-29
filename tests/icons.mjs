// מייצר את אייקוני ה-PNG מתוך public/icon.svg.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const b = await chromium.launch();
for (const s of [192, 512]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(`<style>*{margin:0}svg{width:${s}px;height:${s}px;display:block}</style>${svg.replace('rx="14"', 'rx="0"')}`);
  await p.screenshot({ path: `public/icon-${s}.png` });
}
await b.close();
