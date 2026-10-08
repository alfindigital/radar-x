// Find data-tip/data-ftip hosts whose ::after tooltip could overflow right edge.
import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'https://radarx.web.id';
const routes = ['/stock/ADRO', '/stock/PNLF', '/stock/LUCY', '/stock/SMLE'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, colorScheme: 'dark' });

for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const hosts = [];
    for (const el of document.querySelectorAll('[data-tip], [data-ftip]')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el, '::after');
      const tipLen = (el.getAttribute('data-tip') || el.getAttribute('data-ftip') || '').length;
      const estW = Math.min(tipLen * 6.5 + 16, 260); // rough: ~6.5px/char mono 11px + padding
      // left-anchored tooltip starts at host left; right-anchored (.tip-r) ends at host right
      const rightAnchored = el.classList.contains('tip-r') || el.closest('.tip-r');
      const projectedRight = rightAnchored ? r.right : r.left + estW;
      if (projectedRight > 356 && r.top > 0) {
        hosts.push({
          cls: String(el.className).slice(0, 60), tag: el.tagName.toLowerCase(),
          hostL: Math.round(r.left), hostR: Math.round(r.right), estW: Math.round(estW),
          projR: Math.round(projectedRight), tipR: !!rightAnchored,
          tip: (el.getAttribute('data-tip') || el.getAttribute('data-ftip') || '').slice(0, 80),
          fontFamily: cs.fontFamily?.slice(0, 40), pos: cs.position,
        });
      }
    }
    return hosts;
  });
  console.log(`\n=== ${route} — ${out.length} suspect tooltips`);
  for (const h of out.slice(0, 15)) console.log(`  <${h.tag}> .${h.cls} hostL=${h.hostL} hostR=${h.hostR} estW=${h.estW} projR=${h.projR} tipR=${h.tipR}\n    "${h.tip}"`);
}
await browser.close();
