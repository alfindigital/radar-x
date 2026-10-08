import {chromium} from 'file:///C:/Users/GEEKOM%20A8/Documents/Apps/radar-x-hackaton/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const outdir='C:/Users/GEEKOM A8/AppData/Local/Temp/radarx-reaudit-ui-20261008';
const axe=fs.readFileSync('C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/node_modules/axe-core/axe.min.js','utf8');
const browser=await chromium.launch({headless:true});
const result={base:'http://localhost:3100',probes:[]};
const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'dark'});
const page=await context.newPage(); const errors=[];
page.on('pageerror',e=>errors.push(e.message));
for(const route of ['/','/?scope=suppressed','/?scope=flagged','/?v=radar','/stock/ADRO','/stock/ABBA','/stock/ZZZZNOTKNOWN','/broker','/methodology']) {
 const response=await page.goto(result.base+route,{waitUntil:'networkidle'});
 const item={route,status:response.status(),url:page.url(),errors:[...errors],headings:await page.locator('h1,h2').allTextContents()}; errors.length=0;
 item.geometry=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,dom:document.querySelectorAll('*').length,clipped:[...document.querySelectorAll('.table-sticky')].map(e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,table:e.querySelector('table')?.getBoundingClientRect().width}))}));
 if(route.includes('stock')) {
  item.stats=await page.locator('.grid.gap-4').allTextContents();
  item.personLinks=await page.locator('a[href^="/person/"]').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),name:e.innerText})));
  item.shareholderChart=await page.evaluate(()=>{const label=[...document.querySelectorAll('span')].find(e=>e.textContent==='Δ reported shareholder count');if(!label)return null;return [...label.parentElement.nextElementSibling.children].map(e=>({title:e.getAttribute('title'),bar:[...e.children].map(c=>({height:c.getBoundingClientRect().height,bottom:getComputedStyle(c).bottom,top:getComputedStyle(c).top}))}));});
  item.duplicateMinus=/[−-][−-]\d/.test(await page.locator('main').innerText());
 }
 if(route==='/'||route==='/?scope=suppressed'||route==='/?scope=flagged') { item.pagination=await page.locator('nav[aria-label="Board pages"]').allTextContents();item.rows=await page.locator('tbody tr').count();item.next=await page.locator('nav[aria-label="Board pages"] a').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),text:e.textContent}))); }
 if(route==='/?v=radar') item.sparks=await page.locator('tbody tr').evaluateAll(es=>es.map(e=>({symbol:e.querySelector('a')?.textContent,spark:!!e.querySelector('svg'),missing:e.children[2]?.textContent})));
 result.probes.push(item);
}
for(const width of [360,390,768,820,1024,1280]) {
 await page.setViewportSize({width,height:900}); await page.goto(result.base+'/',{waitUntil:'networkidle'});
 result.probes.push({width,controls:await page.locator('header button,input,nav a,.tab,nav[aria-label="Board pages"] a').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{let r=e.getBoundingClientRect();return {text:e.getAttribute('aria-label')||e.innerText||e.getAttribute('placeholder'),tag:e.tagName,width:r.width,height:r.height,x:r.x,right:r.right}})),geometry:await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('.table-sticky')].map(e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,table:e.querySelector('table')?.getBoundingClientRect().width}))}))});
}
await page.setViewportSize({width:1440,height:900});
for(const theme of ['light','dark'])for(const route of ['/','/stock/ADRO','/stock/ABBA']){
 await page.goto(result.base+route,{waitUntil:'networkidle'});await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);await page.evaluate(axe);
 let scan=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
 result.probes.push({axe:theme,route,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html}))}))});
}
const denied=await browser.newContext({viewport:{width:1440,height:900}});await denied.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=function(){throw new DOMException('denied','SecurityError')};});
const deniedPage=await denied.newPage();const storageErrors=[];deniedPage.on('pageerror',e=>storageErrors.push(e.message));await deniedPage.goto(result.base+'/',{waitUntil:'networkidle'});const themeButton=deniedPage.getByRole('button',{name:/Theme:/});
const states=[];for(let i=0;i<4;i++){states.push({label:await themeButton.getAttribute('aria-label'),theme:await deniedPage.locator('html').getAttribute('data-theme')});await themeButton.click();}
result.probes.push({blockedStorage:{errors:storageErrors,states,heading:await deniedPage.locator('h1').innerText()}});
await page.goto(result.base+'/?scope=flagged',{waitUntil:'networkidle'});const next=page.locator('nav[aria-label="Board pages"] a').filter({hasText:'Next'});if(await next.count()){const first=await page.locator('tbody tr').first().innerText();await next.click();await page.waitForLoadState('networkidle');result.probes.push({pageNext:{first,final:await page.locator('tbody tr').first().innerText(),url:page.url(),pagination:await page.locator('nav[aria-label="Board pages"]').innerText()}});await page.goBack({waitUntil:'networkidle'});result.probes.push({pageBack:{url:page.url(),first:await page.locator('tbody tr').first().innerText()}});}
fs.writeFileSync(outdir+'/ui-crosscheck.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));await browser.close();
