// One-off: list overflowing elements at 360px for specific routes.
import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'https://radarx.web.id';
const routes = ['/stock/ADRO', '/stock/PNLF', '/broker', '/broker?cohort=institutional'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, colorScheme: 'dark' });
await page.addInitScript(() => { try { localStorage.setItem('radarx-theme', 'dark'); } catch {} });

for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1600);
  const out = await page.evaluate(() => {
    const de = document.documentElement;
    const list = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 && r.width > 4) {
        const cls = String(el.className).slice(0, 90);
        const txt = (el.textContent || '').trim().slice(0, 60);
        const sc = el.closest('.overflow-x-auto, [data-scroll]');
      // Walk ancestors: does any clip/hide horizontal overflow?
      let clipped = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') { clipped = true; break; }
      }
      if (clipped) continue; // only document-inflating offenders remain
      list.push({
        tag: el.tagName.toLowerCase(), cls, txt,
        right: Math.round(r.right), w: Math.round(r.width),
        scrollParent: sc ? `scrolls=${sc.scrollWidth > sc.clientWidth + 1}` : 'none',
        parentCls: String(el.parentElement?.className ?? '').slice(0, 80),
      });
      }
    }
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, list: list.slice(0, 25) };
  });
  console.log(`\n=== ${route} — scrollW=${out.scrollW} clientW=${out.clientW}`);
  for (const o of out.list) console.log(`  <${o.tag}> .${o.cls}\n    right=${o.right} w=${o.w} parent=.${o.parentCls} sp=${o.scrollParent}\n    "${o.txt}"`);
}
await browser.close();
