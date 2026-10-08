import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { computeExitWatch } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/exitwatch.ts';
import { computeScoresV2 } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/score.ts';
import { buildDerived, loadDerived, EMPTY_COHORTS, NO_FEEDS } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/derive.ts';
import { JsonStore } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/db.ts';
async function main(){
const fake=Array.from({length:5},(_,i)=>{const symbol=`F${i}.JK`;return {d:{symbol,insider:[],flow:[{symbol,date:'2026-10-01',netForeignInflow:100*(i+1),foreignBuyIdr:100*(i+1),foreignSellIdr:0}],price:[{symbol,date:'2026-10-01',open:null,high:null,low:null,close:100,volume:null,marketCap:null,observationKind:'close-only'}],broker:[{symbol,date:'2026-10-01',brokerCode:'I',netVal:100*(i+1)},{symbol,date:'2026-10-01',brokerCode:'R',netVal:-100*(i+1)}],holders:[],instBrokers:new Set(['I']),retailBrokers:new Set(['R']),marketCapFallback:10000},brokerTop:null,cohortTop:null,freeFloat:null,suspensions:[],corpActions:[]};});
const healthy=computeExitWatch(fake as any,'2026-10-01');
const futureSusp=computeExitWatch(fake.map((r,i)=>i===0?{...r,suspensions:[{symbol:r.d.symbol,suspension_date:'2026-10-08'}]}:r) as any,'2026-10-01');
const oldSusp=computeExitWatch(fake.map((r,i)=>i===0?{...r,suspensions:[{symbol:r.d.symbol,suspension_date:'2020-01-01'}]}:r) as any,'2026-10-01');
const staleHolders=computeScoresV2(fake.map((r,i)=>({...r.d,holders:[{symbol:r.d.symbol,month:'2025-01-31',changeInShareholders:i+1,foreign:{mutual_fund_f:1,financial_institutions_f:2,individual_f:1}},{symbol:r.d.symbol,month:'2026-09-30',changeInShareholders:null,foreign:{mutual_fund_f:2,financial_institutions_f:3,individual_f:2}}]})) as any,'2026-10-01');
const snap={tickers:fake.map(r=>({symbol:r.d.symbol,name:'fixture',subSector:null})),insider:[],flow:fake.flatMap(r=>r.d.flow),price:fake.flatMap(r=>r.d.price),broker:fake.flatMap(r=>r.d.broker),holders:[],indexes:{},manifest:{inputHash:'fixed-input',files:[],schemaVersion:2,engineVersion:'radarx-v2',asOf:'2026-10-01',generatedAt:'fixture'}};
const caps1=new Map(fake.map(r=>[r.d.symbol,10000]));const caps2=new Map(caps1);caps2.set('F0.JK',1);
const a=buildDerived(snap as any,'2026-10-01',EMPTY_COHORTS,NO_FEEDS,caps1);const b=buildDerived(snap as any,'2026-10-01',EMPTY_COHORTS,NO_FEEDS,caps2);
const holderInstit=fake.map((r,i)=>({...r.d,insider:[{symbol:r.d.symbol,holderName:'Mutual Fund',holderType:'institution',txnType:'sell',txnDate:'2026-09-25',filedAt:'2026-09-25',value:100*(i+1)}]}));
const institutionExit=computeExitWatch(fake.map((r,i)=>({...r,d:holderInstit[i]})) as any,'2026-10-01');
const dir='C:/Users/GEEKOM A8/AppData/Local/Temp/radarx-reaudit-data-20261008/interrupted-generation';await mkdir(dir,{recursive:true});
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
for(const file of ['scores.json','cases.json','exitwatch.json'])await writeFile(path.join(dir,file),'[]');
await writeFile(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:2,engineVersion:'radarx-v2',asOf:'2026-10-01',inputHash:'fixed-input',generatedAt:'fixture',limitations:[],files:['scores.json','cases.json','exitwatch.json'].map(f=>({path:f,sha256:hash('[]'),rows:0}))}));
await writeFile(path.join(dir,'scores.json'),JSON.stringify(a.scores));
let interruptedError=null;try{await loadDerived(dir)}catch(e){interruptedError=String(e)};
const result={healthy:{score:healthy[0].score,coverage:healthy[0].coverage,flags:healthy[0].flags},futureSusp:{score:futureSusp[0].score,coverage:futureSusp[0].coverage,flags:futureSusp[0].flags},oldSusp:{score:oldSusp[0].score,coverage:oldSusp[0].coverage,flags:oldSusp[0].flags},staleHolders:staleHolders[0].components.retailExodusZ,capHash:{beforeInput:a.manifest.inputHash,afterInput:b.manifest.inputHash,beforeFeeds:a.manifest.feedHashes,afterFeeds:b.manifest.feedHashes,beforeRaw:a.exitWatch[0].components[1].raw,afterRaw:b.exitWatch[0].components[1].raw},institutionExit:institutionExit[0].components.find(c=>c.key==='insiderExit'),interruptedError};
await writeFile('C:/Users/GEEKOM A8/AppData/Local/Temp/radarx-reaudit-data-20261008/failure-fixtures.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
