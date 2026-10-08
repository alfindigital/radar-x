const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'radarx-reaudit-qa-negative-'));const repo='C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton';
const logs=[];
async function run(name,geometry){
 let source=fs.readFileSync(path.join(repo,'scripts',name),'utf8').replace(/import.*?from.*?;\s*/g,'');
 const proc={argv:['node',name,'http://fixture.invalid'],exitCode:0};
 const dummy={on(){},addInitScript:async()=>{},goto:async()=>({status:()=>200}),waitForTimeout:async()=>{},evaluate:async(fn)=>String(fn).includes('document.body')?500:geometry,screenshot:async()=>{},close:async()=>{},$eval:async()=>null};
 const chromium={launch:async()=>({newPage:async()=>dummy,close:async()=>{}})};
 const safeFs={mkdirSync(){},writeFileSync(file,payload){fs.writeFileSync(path.join(root,name+'.json'),payload)}};
 const quiet={log(){},error(){}};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction('chromium','fs','process','console',source)(chromium,safeFs,proc,quiet);
 logs.push({name,exit:proc.exitCode,geometry,result:JSON.parse(fs.readFileSync(path.join(root,name+'.json'),'utf8'))});
}
(async()=>{
 await run('qa-redesign.mjs',{scrollW:360,clientW:360,off:['button.clip right=410']});
 await run('qa-mobile.mjs',{title:'Internal app error',scrollW:360,clientW:360,overflowX:0,pageH:800,offenders:[{tag:'a',r:410,l:0,w:100,text:'clip'}]});
 fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(logs,null,2));console.log(JSON.stringify({root,results:logs.map(x=>({name:x.name,exit:x.exit,views:x.result.report.length,failures:x.result.failures}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
