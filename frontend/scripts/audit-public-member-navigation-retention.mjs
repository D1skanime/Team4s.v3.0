import { chromium } from 'playwright'
import fs from 'node:fs'
import {createGzip} from 'node:zlib'
import {once} from 'node:events'
const out='/tmp/public-member-rca',base=process.env.AUDIT_BASE||'http://127.0.0.1:3000'
const label=process.env.AUDIT_LABEL||'dev',mode=process.env.AUDIT_NAV_CONTROL||'member',cycles=Number(process.env.AUDIT_CYCLES||12)
const id='retention-'+label+'-'+mode
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const result={id,base,label,mode,samples:[],errors:[]}
async function heap(cdp,path){
 const file=fs.createWriteStream(path),zip=createGzip();zip.pipe(file)
 const handler=({chunk})=>zip.write(chunk);cdp.on('HeapProfiler.addHeapSnapshotChunk',handler)
 await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});cdp.off('HeapProfiler.addHeapSnapshotChunk',handler);zip.end();await once(file,'finish')
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable')
 page.on('pageerror',e=>result.errors.push(e.message))
 async function imageIntervention(){
  if(!process.env.AUDIT_IMAGE_INTERVENTION)return
  await page.evaluate(mode=>{for(const img of document.images){if(mode==='eager')img.loading='eager';else if(mode==='no-auto-sizes')img.sizes=img.sizes.replace(/^auto,?\s*/, '')}},process.env.AUDIT_IMAGE_INTERVENTION)
  await page.waitForTimeout(500)
 }
 async function sample(phase){
  await cdp.send('HeapProfiler.collectGarbage')
  const dom=await cdp.send('Memory.getDOMCounters'),m=await cdp.send('Performance.getMetrics')
  const state=await page.evaluate(()=>({url:location.pathname,elements:document.querySelectorAll('*').length,images:document.images.length,marks:performance.getEntriesByType('mark').length,measures:performance.getEntriesByType('measure').length,entries:performance.getEntries().length}))
  result.samples.push({phase,dom,metrics:Object.fromEntries(m.metrics.map(x=>[x.name,x.value])),...state})
 }
 await page.goto(base+'/fansubs/new-subs',{waitUntil:'load'});await page.mouse.move(720,450);await page.waitForTimeout(1500)
 const closeDrawer=async()=>{const backdrop=page.getByRole('button',{name:'Drawer schließen',exact:true});if(await backdrop.isVisible()){await backdrop.click({position:{x:1000,y:400}});await page.mouse.move(720,450)}}
 await closeDrawer();await imageIntervention();await sample('initial')
 await heap(cdp,out+'/'+id+'-before.heapsnapshot.gz')
 for(let i=0;i<cycles;i++){
  await imageIntervention()
  if(mode==='member'){
   await closeDrawer()
   const slug=i%2?'kara':'timer'
   await page.locator('a[href="/members/'+slug+'"]').first().click();await page.waitForURL('**/members/'+slug)
   await page.waitForTimeout(400);await imageIntervention()
   await page.locator('a[href="/fansubs/new-subs"]').first().click();await page.waitForURL('**/fansubs/new-subs')
  }else{
   const menu=page.getByRole('button',{name:'Menü öffnen',exact:true})
   if(await menu.getAttribute('aria-expanded')!=='true')await menu.click()
   await page.getByRole('link',{name:'Fansub-Gruppen',exact:true}).click();await page.waitForURL('**/fansubs')
   await page.waitForTimeout(400);await imageIntervention()
   await page.getByRole('link',{name:'New-Subs',exact:true}).click();await page.waitForURL('**/fansubs/new-subs')
  }
  await page.waitForTimeout(400);await imageIntervention();await sample('cycle-'+i)
 }
 await heap(cdp,out+'/'+id+'-after.heapsnapshot.gz')
 await page.waitForTimeout(5000);await sample('idle-5s')
 if(process.env.AUDIT_CLEAR_TIMINGS==='1'){
  await page.evaluate(()=>{performance.clearMarks();performance.clearMeasures();console.clear()})
  await sample('timings-console-cleared')
  await heap(cdp,out+'/'+id+'-cleared.heapsnapshot.gz')
 }
}catch(e){result.failure=e.stack||String(e)}
finally{await browser.close();fs.writeFileSync(out+'/'+id+'.json',JSON.stringify(result,null,2));console.log(id,JSON.stringify(result.samples.map(s=>({phase:s.phase,nodes:s.dom.nodes,elements:s.elements,listeners:s.dom.jsEventListeners,heap:s.metrics.JSHeapUsedSize,marks:s.marks,measures:s.measures}))),result.failure||'')}
