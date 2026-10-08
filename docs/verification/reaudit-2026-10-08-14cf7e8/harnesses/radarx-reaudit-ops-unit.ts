import { promises as fs } from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {parseArgs} from 'file:///C:/Users/GEEKOM%20A8/Documents/Apps/radar-x-hackaton/scripts/compute.ts';
async function main(){
  const results:any={dates:{}};
  for(const date of ['2026-02-31','2024-02-29','2026-04-31','today']){
    try{results.dates[date]={accepted:true,parsed:parseArgs(['--as-of',date])}}catch(e){results.dates[date]={accepted:false,error:String(e)}}
  }
  process.env.SECTORS_API_KEY='dummy-1';
  process.env.SECTORS_API_KEYS='dummy-2,dummy-3,dummy-4,dummy-5,dummy-6';
  process.env.SECTORS_CALL_BUDGET='7';
  const attempted:string[]=[];let signalPresent=false;
  globalThis.fetch=async(_url,init)=>{signalPresent=!!init?.signal;const key=String((init?.headers as any)?.Authorization);attempted.push(key);return new Response(key==='dummy-6'?'{}':'unauthorized',{status:key==='dummy-6'?200:401})};
  const {sectorsGet}=await import('file:///C:/Users/GEEKOM%20A8/Documents/Apps/radar-x-hackaton/src/lib/sectors.ts');
  const response=await sectorsGet('/dummy');
  await sectorsGet('/dummy');
  let budgetRejected=false;try{await sectorsGet('/dummy')}catch(e){budgetRejected=String(e).includes('budget 7 exceeded')}
  results.sectors={attempted,signalPresent,response,budgetRejected};
  const dir=await fs.mkdtemp(path.join(tmpdir(),'radarx-reaudit-store-'));process.chdir(dir);await fs.mkdir('data');
  const {JsonStore}=await import('file:///C:/Users/GEEKOM%20A8/Documents/Apps/radar-x-hackaton/src/lib/db.ts');
  const db=new JsonStore();await fs.writeFile('data/broker_rows.json','[]');
  const realRead=fs.readFile,realWrite=fs.writeFile,realRename=fs.rename;let reads=0,writes=0,renames=0;
  fs.readFile=(async(...args:any[])=>{reads++;return (realRead as any)(...args)}) as any;
  fs.writeFile=(async(...args:any[])=>{writes++;return (realWrite as any)(...args)}) as any;
  fs.rename=(async(...args:any[])=>{renames++;return (realRename as any)(...args)}) as any;
  await db.upsertBrokerRowsMulti(new Map(['A','B','C'].map(symbol=>[symbol,[{symbol,date:'2026-10-07',brokerCode:'XL',buyVal:1,sellVal:0,netVal:1,buyLot:1,sellLot:0,netLot:1,avgBuy:1,avgSell:null,foreignBuyVal:null,foreignSellVal:null}]])));
  results.storeBatch={reads,writes,renames};reads=0;writes=0;renames=0;
  for(const s of ['A','B','C'])await db.listBrokerRows(s);
  results.storeMissingLookup={reads,writes,renames};
  fs.readFile=realRead;fs.writeFile=realWrite;fs.rename=realRename;
  await fs.writeFile('data/flow_daily.json','[{broken]');let refused=false;
  try{await db.upsertFlowDaily([{symbol:'A',date:'2026-10-07',netForeignInflow:1,foreignBuyIdr:1,foreignSellIdr:0}])}catch(e){refused=String(e).includes('corrupt JSON')}
  results.coreCorrupt={refused,bytes:await fs.readFile('data/flow_daily.json','utf8')};
  await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({dir,...results},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
