import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { detectCandidates } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/cases.ts';
import { buildDerived, NO_FEEDS, EMPTY_COHORTS } from 'C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton/src/lib/derive.ts';
async function main(){
const t=(name:string,type:'buy'|'sell',filedAt='2026-09-20')=>({symbol:'FIX.JK',holderName:name,holderType:'insider',txnType:type,txnDate:'2026-09-20',filedAt,value:100,amount:1,price:100,pctBefore:null,pctAfter:null,clusterHint:null,sourceUrl:null});
const buys=[t('A','buy'),t('C','buy'),t('E','buy')];
const midpoint=detectCandidates('FIX.JK',{insider:[...buys,t('B','sell')],flow:[],price:[]});
const tail=detectCandidates('FIX.JK',{insider:[...buys,t('Z','sell')],flow:[],price:[]});
const snap={tickers:[{symbol:'FIX.JK',name:'fixture',subSector:null}],insider:[...buys,t('Z','sell','2026-10-02')],flow:[],price:[],broker:[],holders:[],indexes:{},manifest:{inputHash:'fixed-input',files:[],schemaVersion:2,engineVersion:'radarx-v2',asOf:'2026-10-01',generatedAt:'fixture'}};
const knowledge=buildDerived(snap as any,'2026-10-01',EMPTY_COHORTS,NO_FEEDS);
const dir='C:/Users/GEEKOM A8/AppData/Local/Temp/radarx-reaudit-data-20261008/store-fixture';await mkdir(path.join(dir,'data'),{recursive:true});
process.chdir(dir);
const {JsonStore}=await import('file:///C:/Users/GEEKOM%20A8/Documents/Apps/radar-x-hackaton/src/lib/db.ts');
const store=new JsonStore(); const dataPath=path.join(dir,'data','price_daily.json');
const rich={symbol:'FIX.JK',date:'2026-09-20',open:100,high:110,low:90,close:105,volume:12000,marketCap:1000000,observationKind:'ohlcv'};
await writeFile(dataPath,JSON.stringify([rich]));await store.upsertPriceDaily([{...rich,open:null,high:null,low:null,close:106,volume:null,marketCap:null,observationKind:'close-only'}] as any);
const preserved=JSON.parse(await readFile(dataPath,'utf8'))[0];
await writeFile(dataPath,'{broken');let corruptError=null;try{await store.upsertPriceDaily([rich] as any)}catch(e){corruptError=String(e)};
const corruptAfter=await readFile(dataPath,'utf8');
const result={clusterMidSell:{candidateCount:midpoint.length,candidates:midpoint},clusterTailSell:{candidateCount:tail.length,candidates:tail},knownBy:{includedTrades:knowledge.cases.flatMap(c=>c.insiderTrades.map(t=>({holder:t.holderName,filedAt:t.filedAt}))),score:knowledge.scores[0]},storeMerge:preserved,corruptRefused:corruptError,corruptBytesPreserved:corruptAfter==='{broken'};
await writeFile('C:/Users/GEEKOM A8/AppData/Local/Temp/radarx-reaudit-data-20261008/semantic-fixtures.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
