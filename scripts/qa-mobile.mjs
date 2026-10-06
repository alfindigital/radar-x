// Mobile QA sweep at 360px viewport. Requires a dev server on BASE.
// Usage: node scripts/qa-mobile.mjs [baseUrl]
// Writes screenshots + report.json to docs/verification/mobile-qa-360/.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3210';
const OUT = 'docs/verification/mobile-qa-360';
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  ['home', '/'],
  ['radar-v2', '/?v=radar'],
  ['suppressed', '/?scope=suppressed'],
  ['broker', '/broker'],
  ['broker-inst', '/broker?cohort=institutional'],
  ['broker-detail', '/broker/XL'],
  ['dossier', '/saham/ADRO'],
  ['kasus', '/kasus'],
  ['asing', '/asing'],
  ['rotasi', '/rotasi'],
  ['metodologi', '/metodologi'],
];

const report = [];
const extraLinks = { kasusDetail: null, rotasiSub: null, orang: null };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });

let errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

async function visit(name, route, { midShot = false } = {}) {
  errors = [];
  const t0 = Date.now();
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1600); // let charts/layout settle
    const res = await page.evaluate(() => {
      const de = document.documentElement;
      const vw = window.innerWidth;
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const out = r.right > vw + 1 || r.left < -1;
        if (!out) continue;
        const p = el.parentElement;
        const pr = p ? p.getBoundingClientRect() : null;
        const pOut = pr && (pr.right > vw + 1 || pr.left < -1);
        if (!pOut && offenders.length < 8) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 90),
            text: (el.textContent || '').trim().slice(0, 50),
            w: Math.round(r.width), r: Math.round(r.right), l: Math.round(r.left),
          });
        }
      }
      return {
        title: document.title,
        scrollW: de.scrollWidth, clientW: de.clientWidth, overflowX: de.scrollWidth - de.clientWidth,
        pageH: de.scrollHeight, offenders,
      };
    });
    await page.screenshot({ path: `${OUT}/${name}-top.png` });
    if (midShot && res.pageH > 1600) {
      await page.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.45)));
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${name}-mid.png` });
    }
    report.push({ route, name, ms: Date.now() - t0, ...res, consoleErrors: errors });
    if (name === 'kasus' && !extraLinks.kasusDetail) {
      extraLinks.kasusDetail = await page.$eval('a[href^="/kasus/"]', (a) => a.getAttribute('href')).catch(() => null);
    }
    if (name === 'rotasi' && !extraLinks.rotasiSub) {
      extraLinks.rotasiSub = await page.$eval('a[href^="/rotasi/"]', (a) => a.getAttribute('href')).catch(() => null);
    }
    if (name === 'dossier' && !extraLinks.orang) {
      extraLinks.orang = await page.$eval('a[href^="/orang/"]', (a) => a.getAttribute('href')).catch(() => null);
    }
  } catch (e) {
    report.push({ route, name, error: String(e).slice(0, 300), consoleErrors: errors });
  }
}

for (const [name, route] of routes) {
  await visit(name, route, { midShot: ['home', 'dossier', 'broker', 'suppressed'].includes(name) });
}
if (extraLinks.kasusDetail) await visit('kasus-detail', extraLinks.kasusDetail);
if (extraLinks.rotasiSub) await visit('rotasi-sub', extraLinks.rotasiSub);
if (extraLinks.orang) await visit('orang', extraLinks.orang);

await browser.close();
const failures = [];
for (const r of report) {
  if (r.error) failures.push(`${r.route}: ${r.error}`);
  else if (r.overflowX > 0) failures.push(`${r.route}: horizontal overflow +${r.overflowX}px`);
  if (r.consoleErrors?.length) failures.push(`${r.route}: ${r.consoleErrors.length} console error(s)`);
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ report, failures }, null, 2));
for (const r of report) {
  const flag = r.error ? 'ERR' : r.overflowX > 0 ? `OVERFLOW+${r.overflowX}px` : 'ok';
  console.log(`${flag.padEnd(14)} ${r.route}  (${r.ms}ms, h=${r.pageH ?? '?'}${r.consoleErrors?.length ? ', consoleErr=' + r.consoleErrors.length : ''})`);
  for (const o of r.offenders ?? []) console.log(`   -> <${o.tag}> .${o.cls} | w=${o.w} right=${o.r} | "${o.text}"`);
  for (const c of r.consoleErrors ?? []) console.log(`   warn: ${c}`);
}
console.log('discovered:', JSON.stringify(extraLinks));
if (failures.length) {
  console.error(`QA FAILED — ${failures.length} failure(s):`);
  for (const f of failures) console.error('  -', f);
  process.exitCode = 1;
}
