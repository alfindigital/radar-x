// Redesign QA: desktop dark/light + mobile 360 screenshots. Requires dev server on BASE.
// Usage: node scripts/qa-redesign.mjs [baseUrl]
// Writes screenshots to docs/verification/redesign-terminal/.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3210';
const OUT = 'docs/verification/redesign-terminal';
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  ['home', '/'],
  ['suppressed', '/?scope=suppressed'],
  ['radar-v2', '/?v=radar'],
  ['broker', '/broker'],
  ['broker-inst', '/broker?cohort=institutional'],
  ['broker-detail', '/broker/XL'],
  ['dossier', '/saham/ADRO'],
  ['dossier-exit', '/saham/PNLF'],
  ['kasus', '/kasus'],
  ['asing', '/asing'],
  ['rotasi', '/rotasi'],
  ['metodologi', '/metodologi'],
];

const browser = await chromium.launch();
const report = [];

for (const [theme, width] of [['dark', 1440], ['light', 1440], ['dark-mobile', 360]]) {
  const t = theme === 'dark-mobile' ? 'dark' : theme;
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width > 400 ? 1.5 : 2, colorScheme: t });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.addInitScript((tt) => { try { localStorage.setItem('radarx-theme', tt); } catch {} }, t);

  for (const [name, route] of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(1400);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const off = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 4) {
            const inScroll = el.closest('.overflow-x-auto, [data-scroll]');
            if (!inScroll) off.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} right=${Math.round(r.right)}`);
          }
        }
        return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, off: off.slice(0, 6) };
      });
      await page.screenshot({ path: `${OUT}/${theme}-${name}.png`, fullPage: false });
      report.push({ theme, name, route, overflow, errors: [...errors] });
      errors.length = 0;
      console.log(`${theme}/${name} ${overflow.scrollW > overflow.clientW ? 'OVERFLOW ' + overflow.scrollW : 'ok'} ${errors.length ? 'ERR:' + errors.join(';') : ''} ${overflow.off.length ? 'CLIP:' + overflow.off.join(' | ') : ''}`);
    } catch (e) {
      report.push({ theme, name, route, error: String(e).slice(0, 160) });
      console.log(`${theme}/${name} FAIL ${e.message.slice(0, 80)}`);
    }
  }
  await page.close();
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log('done ->', OUT);
