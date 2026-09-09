#!/usr/bin/env node
// Investigation harness; all application/database requests are read-only.
// Reuses the Playwright/CDP approach of collect-member-profile-evidence.mjs.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs'
import { gzipSync, createGzip } from 'node:zlib'
import { once } from 'node:events'

const out = process.env.AUDIT_OUT || '/tmp/public-member-rca'
const base = process.env.AUDIT_BASE || 'http://127.0.0.1:3000'
const label = process.env.AUDIT_LABEL || 'baseline'
const routes = (process.env.AUDIT_ROUTES || 'members/timer,members/kara,fansubs/new-subs').split(',')
const repeats = Number(process.env.AUDIT_REPEATS || 1)
const snapshots = process.env.AUDIT_HEAP === '1'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const delay = ms => new Promise(r => setTimeout(r, ms))
function instrument(skipReactHook = false) {
  const e = window.__rca = { longTasks: [], errors: [], observers: {}, raf: { scheduled:0, fired:0 }, events: {}, carouselEvents: {}, commits: [], mutations:0 }
  for (const name of ['ResizeObserver','IntersectionObserver']) {
    const Original = window[name]
    if (!Original) continue
    const stats = e.observers[name] = { created:0, callbacks:0, entries:0, observe:0, unobserve:0, disconnect:0 }
    window[name] = class extends Original {
      constructor(cb, options) { stats.created++; super((entries, observer) => { stats.callbacks++; stats.entries += entries.length; cb(entries, observer) }, options) }
      observe(...args) { stats.observe++; return super.observe(...args) }
      unobserve(...args) { stats.unobserve++; return super.unobserve(...args) }
      disconnect(...args) { stats.disconnect++; return super.disconnect(...args) }
    }
  }
  const raf = window.requestAnimationFrame
  window.requestAnimationFrame = cb => { e.raf.scheduled++; return raf.call(window,t=>{e.raf.fired++;cb(t)}) }
  for (const method of ['addEventListener','removeEventListener']) {
    const original = EventTarget.prototype[method]
    EventTarget.prototype[method] = function(type,...args) {
      const key = method+':'+type
      e.events[key]=(e.events[key]||0)+1
      if(this instanceof Element && this.hasAttribute('data-interaction-enabled')) { const k=key+':'+this.getAttribute('aria-label');e.carouselEvents[k]=(e.carouselEvents[k]||0)+1 }
      return original.call(this,type,...args)
    }
  }
  new PerformanceObserver(list => {
    e.longTasks.push(...list.getEntries().map(t=>({start:t.startTime,duration:t.duration,name:t.name})))
  }).observe({type:'longtask',buffered:true})
  addEventListener('error', err => e.errors.push({message:err.message,filename:err.filename,at:performance.now()}))
  new MutationObserver(m=>{e.mutations+=m.length}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style','class','data-interaction-enabled']})
  if (skipReactHook) return
  let rendererId=0
  const committed = new WeakMap()
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber:true, renderers:new Map(),
    inject(renderer) { const id=++rendererId; this.renderers.set(id,renderer);return id },
    onCommitFiberRoot(id,root) {
      const names={};let count=0,changed=0
      function visit(f) {
        if(!f)return;count++
        const t=f.elementType||f.type
        const name=typeof t==='function'?(t.displayName||t.name):null
        const prior=committed.get(f)|| (f.alternate&&committed.get(f.alternate))
        if(name&&(!prior||f.memoizedProps!==prior.props||f.memoizedState!==prior.state)){
          names[name]=(names[name]||0)+1;changed++
        }
        const inputs={props:f.memoizedProps,state:f.memoizedState}
        committed.set(f,inputs);if(f.alternate)committed.set(f.alternate,inputs)
        visit(f.child);visit(f.sibling)
      }
      visit(root.current)
      e.commits.push({at:performance.now(),count,changed,names})
    },
    onCommitFiberUnmount(){}, onPostCommitFiberRoot(){}
  }
}
async function heap(cdp,path) {
  const file=createWriteStream(path),zip=createGzip()
  zip.pipe(file)
  const onChunk=({chunk})=>zip.write(chunk)
  cdp.on('HeapProfiler.addHeapSnapshotChunk',onChunk)
  await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false})
  cdp.off('HeapProfiler.addHeapSnapshotChunk',onChunk)
  zip.end();await once(file,'finish')
}
async function measure(route, iteration, cache, page, cdp) {
  const id=[label,route.replaceAll('/','-'),iteration,cache].join('-')
  const requests=new Map(), consoleErrors=[], crashes=[], trace=[]
  let phase='navigation'
  const handlers={
    request: p=>requests.set(p.requestId,{id:p.requestId,url:p.request.url,method:p.request.method,start:p.timestamp,type:p.type,phase,initiator:p.initiator?.type}),
    response: p=>{const r=requests.get(p.requestId);if(r)Object.assign(r,{status:p.response.status,mime:p.response.mimeType,headers:p.response.headers,timing:p.response.timing,fromDiskCache:p.response.fromDiskCache,fromPrefetchCache:p.response.fromPrefetchCache,fromServiceWorker:p.response.fromServiceWorker})},
    data:p=>{const r=requests.get(p.requestId);if(r){r.decoded=(r.decoded||0)+p.dataLength}},
    finished:p=>{const r=requests.get(p.requestId);if(r)Object.assign(r,{end:p.timestamp,transferred:p.encodedDataLength})},
    failed:p=>{const r=requests.get(p.requestId);if(r)Object.assign(r,{end:p.timestamp,error:p.errorText})},
    cache:p=>{const r=requests.get(p.requestId);if(r)r.servedFromCache=true}
  }
  const events=['Network.requestWillBeSent','Network.responseReceived','Network.dataReceived','Network.loadingFinished','Network.loadingFailed','Network.requestServedFromCache']
  Object.values(handlers).forEach((h,i)=>cdp.on(events[i],h))
  const onConsole=m=>{if(m.type()==='error'||m.type()==='warning')consoleErrors.push({type:m.type(),text:m.text()})}
  const onError=e=>consoleErrors.push({type:'pageerror',text:e.stack||e.message})
  const onCrash=()=>crashes.push({phase,at:Date.now()})
  page.on('console',onConsole);page.on('pageerror',onError);page.on('crash',onCrash)
  await cdp.send('Performance.enable')
  const onTrace=({value})=>trace.push(...value)
  cdp.on('Tracing.dataCollected',onTrace)
  await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-v8.gc',transferMode:'ReportEvents'})
  await cdp.send('Profiler.enable');await cdp.send('Profiler.start')
  const samples=[]
  async function sample(name,gc=false) {
    phase=name
    if(gc)await cdp.send('HeapProfiler.collectGarbage')
    const metric=await cdp.send('Performance.getMetrics')
    const dom=await cdp.send('Memory.getDOMCounters')
    const state=await page.evaluate(()=>({
      at:performance.now(),heap:performance.memory?.usedJSHeapSize,domElements:document.querySelectorAll('*').length,
      height:document.documentElement.scrollHeight,carousels:document.querySelectorAll('[data-interaction-enabled]').length,
      observers:structuredClone(window.__rca?.observers||{}),raf:{...window.__rca?.raf},commits:window.__rca?.commits.length||0,
      mutations:window.__rca?.mutations||0
    }))
    samples.push({phase:name,gc,metrics:Object.fromEntries(metric.metrics.map(x=>[x.name,x.value])),dom,...state})
    await page.evaluate(n=>performance.mark('rca:'+n),name)
  }
  let failure
  try{
    if(cache==='cold')await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:90000})
    else await page.reload({waitUntil:'domcontentloaded',timeout:90000})
    await sample('domcontentloaded')
    await page.waitForLoadState('load',{timeout:90000})
    await delay(1800)
    await sample('visible')
    if(snapshots&&cache==='cold') {await sample('before-scroll-gc',true);await heap(cdp,out+'/'+id+'-before.heapsnapshot.gz')}
    for(let cycle=0;cycle<Number(process.env.AUDIT_CYCLES||3);cycle++){
      phase='scroll-'+cycle
      const height=await page.evaluate(()=>document.documentElement.scrollHeight)
      for(let y=0;y<height;y+=cycle===0?500:1500){await page.evaluate(y=>scrollTo(0,y),y);await delay(cycle===0?140:35)}
      for(let y=height;y>=0;y-=1500){await page.evaluate(y=>scrollTo(0,y),y);await delay(35)}
      await delay(300);await sample('scroll-'+cycle)
    }
    phase='carousel'
    const buttons=page.getByRole('button',{name:/Nächste (Rolle|Sammlung|Auszeichnung)/})
    for(let i=0;i<Math.min(await buttons.count(),8);i++){
      const b=buttons.nth(i);await b.scrollIntoViewIfNeeded({timeout:5000})
      if(await b.isEnabled())await b.click({timeout:5000})
      await delay(300)
    }
    await sample('carousel')
    await delay(1500);await sample('settled')
    await sample('after-scroll-gc',true)
    if(snapshots&&cache==='cold')await heap(cdp,out+'/'+id+'-after.heapsnapshot.gz')
    await page.screenshot({path:out+'/'+id+'.png',fullPage:false,timeout:15000})
  }catch(e){failure=e.stack||String(e)}
  const cpu=await cdp.send('Profiler.stop').catch(()=>null)
  writeFileSync(out+'/'+id+'-cpu.json.gz',gzipSync(JSON.stringify(cpu)))
  const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve))
  await cdp.send('Tracing.end');await done
  writeFileSync(out+'/'+id+'-trace.json.gz',gzipSync(JSON.stringify({traceEvents:trace})))
  let state={}
  try{state=await page.evaluate(()=>({
    navigation:performance.getEntriesByType('navigation').map(x=>x.toJSON()),
    resources:performance.getEntriesByType('resource').map(x=>x.toJSON()),
    evidence:window.__rca||{longTasks:[],commits:[]},
    images:[...document.images].map(i=>({alt:i.alt,src:i.getAttribute('src'),currentSrc:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,loading:i.loading,decoding:i.decoding,fetchPriority:i.fetchPriority,sizes:i.sizes,slot:i.closest('[data-badge-code]')?.getAttribute('data-badge-code'),earned:i.closest('[data-earned]')?.getAttribute('data-earned')})),
    preloads:[...document.querySelectorAll('link[rel=preload]')].map(e=>({href:e.href,as:e.as,imageSrcset:e.imageSrcset})),
    headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent)
  }))}catch(e){state.error=String(e)}
  const result={id,label,route,cache,iteration,browser:browser.version(),base,viewport:{width:1440,height:900},cpuThrottle:Number(process.env.AUDIT_CPU||1),slowNetwork:process.env.AUDIT_SLOW==='1',javaScriptEnabled:process.env.AUDIT_JS_OFF!=='1',failure,samples,requests:[...requests.values()],consoleErrors,crashes,...state}
  writeFileSync(out+'/'+id+'.json',JSON.stringify(result,null,2))
  console.log(JSON.stringify({id,failure,ttfb:state.navigation?.[0]?.responseStart,dcl:state.navigation?.[0]?.domContentLoadedEventEnd,load:state.navigation?.[0]?.loadEventEnd,requests:requests.size,bytes:[...requests.values()].reduce((n,r)=>n+(r.transferred||0),0),longest:Math.max(0,...(state.evidence?.longTasks||[]).map(t=>t.duration)),commits:state.evidence?.commits.length,heap:samples.at(-1)?.metrics.JSHeapUsedSize,errors:consoleErrors.length}))
  cdp.off('Tracing.dataCollected',onTrace)
  Object.values(handlers).forEach((h,i)=>cdp.off(events[i],h))
  page.off('console',onConsole);page.off('pageerror',onError);page.off('crash',onCrash)
}
try{
  for(let i=0;i<repeats;i++)for(const route of routes){
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',javaScriptEnabled:process.env.AUDIT_JS_OFF!=='1'})
    const page=await context.newPage();await page.addInitScript(instrument, process.env.AUDIT_REACT_HOOK === '0')
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable')
    if(process.env.AUDIT_CPU)await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.AUDIT_CPU)})
    if(process.env.AUDIT_SLOW==='1')await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular3g'})
    if(process.env.AUDIT_FAIL_BADGES==='1')await cdp.send('Network.setBlockedURLs',{urls:['*://*/_next/image?url=%2Fmember-achievement-badges*']})
    if(process.env.AUDIT_NO_IMAGES==='1')await cdp.send('Network.setBlockedURLs',{urls:['*://*/_next/image*','*.png*','*.webp*','*.avif*','*.jpg*','*.jpeg*','*.gif*','*.svg*']})
    await measure(route,i,'cold',page,cdp)
    if(process.env.AUDIT_WARM!=='0')await measure(route,i,'warm',page,cdp)
    await context.close()
  }
}finally{await browser.close()}
