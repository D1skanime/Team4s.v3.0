import { chromium } from 'playwright'
import fs from 'node:fs'
import {gzipSync} from 'node:zlib'
const root='/tmp/public-member-rca',results=[]
for(const route of ['members/timer','members/kara','fansubs/new-subs']){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
 const item={route,dumps:[],allocators:[]},events=[]
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const cdp=await page.context().newCDPSession(page)
  cdp.on('Tracing.dataCollected',e=>events.push(...e.value))
  await cdp.send('Tracing.start',{traceConfig:{includedCategories:['disabled-by-default-memory-infra'],memoryDumpConfig:{}},transferMode:'ReportEvents'})
  await page.goto('http://127.0.0.1:3000/'+route,{waitUntil:'load'});await page.waitForTimeout(1800)
  item.dumps.push({phase:'initial',...await cdp.send('Tracing.requestMemoryDump',{deterministic:true,levelOfDetail:'detailed'})})
  for(let cycle=0;cycle<10;cycle++){
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(120)
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120)
  }
  await page.waitForTimeout(700)
  item.dumps.push({phase:'after-scroll',...await cdp.send('Tracing.requestMemoryDump',{deterministic:true,levelOfDetail:'detailed'})})
  const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete
  for(const e of events){
   const allocators=e.args?.dumps?.allocators
   if(!allocators)continue
   for(const [name,v] of Object.entries(allocators))if(/skia|image|discardable|gpu|v8|blink_gc/.test(name)){
    const attrs={}
    for(const [k,a] of Object.entries(v.attrs||{}))attrs[k]={...a,numeric:a.type==='scalar'?parseInt(a.value,16):undefined}
    item.allocators.push({dumpId:e.id,pid:e.pid,name,attrs})
   }
  }
  fs.writeFileSync(root+'/native-'+route.replaceAll('/','-')+'-trace.json.gz',gzipSync(JSON.stringify({traceEvents:events})))
 }catch(e){item.error=e.stack||String(e)}
 finally{await browser.close();results.push(item);console.log(route,JSON.stringify(item.dumps),'allocatorEntries',item.allocators.length,'error',item.error)}
}
fs.writeFileSync(root+'/native-memory.json',JSON.stringify(results,null,2))
