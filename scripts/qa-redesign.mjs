// Redesign QA: desktop dark/light + mobile 360 screenshots. Requires dev server on BASE.
// Usage: node scripts/qa-redesign.mjs [baseUrl]
// Writes screenshots to docs/verification/redesign-terminal/.
// Gate: nonzero exit on route failure, HTTP error, console/page error, or overflow.
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
  ['dossier', '/stock/ADRO'],
  ['dossier-exit', '/stock/PNLF'],
  ['cases', '/cases'],
  ['foreign', '/foreign'],
  ['rotation', '/rotation'],
  ['methodology', '/methodology'],
];

const browser = await chromium.launch();
const report = [];
const failures = [];

for (const [theme, width] of [['dark', 1440], ['light', 1440], ['dark-mobile', 360]]) {
  const t = theme === 'dark-mobile' ? 'dark' : theme;
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width > 400 ? 1.5 : 2, colorScheme: t });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.addInitScript((tt) => { try { localStorage.setItem('radarx-theme', tt); } catch {} }, t);

  for (const [name, route] of routes) {
    const id = `${theme}/${name}`;
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
      const status = resp ? resp.status() : 0;
      if (status !== 200) failures.push(`${id}: HTTP ${status || 'no response'}`);
      // A page that rendered must expose real content, not an error shell —
      // the app's own shells (error.tsx/not-found.tsx) are caught by copy.
      const probe = await page.evaluate(() => {
        const text = document.body?.innerText ?? '';
        return {
          bodyLen: text.length,
          shell: /not be found|application error|internal server error|failed to render|nothing on the tape|no instrument at this route|feed interrupted/i.test(text),
          landmark: Boolean(document.querySelector('main')),
        };
      });
      if (status === 200 && probe.bodyLen < 200) failures.push(`${id}: empty body (${probe.bodyLen} chars)`);
      if (probe.shell) failures.push(`${id}: error-shell content rendered`);
      if (status === 200 && !probe.landmark) failures.push(`${id}: no <main> landmark — layout did not render`);
      await page.waitForTimeout(1400);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const off = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 4) {
            // Only an ancestor that actually scrolls may legitimately clip —
            // a closest() hit on a container with nothing to scroll is a defect.
            const scroller = el.closest('.overflow-x-auto, [data-scroll]');
            const scrolls = scroller && scroller.scrollWidth > scroller.clientWidth + 1;
            if (!scrolls) off.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} right=${Math.round(r.right)}`);
          }
        }
        return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, off: off.slice(0, 6) };
      });
      if (overflow.scrollW > overflow.clientW) failures.push(`${id}: horizontal overflow ${overflow.scrollW}px`);
      if (overflow.off.length) failures.push(`${id}: clipped by non-scrolling container — ${overflow.off.join(' | ')}`);
      if (errors.length) failures.push(`${id}: console errors — ${errors.join('; ')}`);
      await page.screenshot({ path: `${OUT}/${theme}-${name}.png`, fullPage: false });
      report.push({ theme, name, route, status, overflow, errors: [...errors] });
      console.log(`${id} ${overflow.scrollW > overflow.clientW ? 'OVERFLOW ' + overflow.scrollW : 'ok'} ${errors.length ? 'ERR:' + errors.join(';') : ''} ${overflow.off.length ? 'CLIP:' + overflow.off.join(' | ') : ''}`);
    } catch (e) {
      failures.push(`${id}: ${String(e).slice(0, 160)}`);
      report.push({ theme, name, route, error: String(e).slice(0, 160) });
      console.log(`${id} FAIL ${e.message.slice(0, 80)}`);
    }
    errors.length = 0;
  }
  await page.close();
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ report, failures }, null, 2));
await browser.close();
if (failures.length) {
  console.error(`QA FAILED — ${failures.length} failure(s):`);
  for (const f of failures) console.error('  -', f);
  process.exitCode = 1;
} else {
  console.log('done ->', OUT);
}
