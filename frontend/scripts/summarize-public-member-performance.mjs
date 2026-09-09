// Summarize measured evidence. CDP transferred bytes include response overhead;
// decoded bytes count response body chunks, not decoded image pixel allocations.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const root=process.env.AUDIT_OUT||'/tmp/public-member-rca'
const results=[]
for(const file of readdirSync(root).filter(n=>n.match(/-(cold|warm)\.json$/))){
 const d=JSON.parse(readFileSync(root+'/'+file))
 if(!d.navigation?.[0])continue
 const nav=d.navigation[0]
 const kinds={}
 for(const r of d.requests){
  const kind=r.type==='Script'?'js':r.type==='Stylesheet'?'css':r.type==='Image'?'images':r.type==='Document'?'document':/\?_rsc=/.test(r.url)?'rsc':r.type==='Fetch'||r.type==='XHR'?'api':'other'
  kinds[kind]??={requests:0,transferred:0,decoded:0,cached:0}
  const a=kinds[kind];a.requests++;a.transferred+=r.transferred||0;a.decoded+=r.decoded||0
  if(r.servedFromCache||r.fromDiskCache)a.cached++
 }
 const visible=d.samples.find(s=>s.phase==='visible')
 const scroll=d.samples.find(s=>s.phase==='scroll-2')
 const last=d.samples.at(-1)
 const long=d.evidence.longTasks
 const traceFile=root+'/'+file.replace('.json','-trace.json.gz')
 const trace=JSON.parse(gunzipSync(readFileSync(traceFile))).traceEvents
 const main=trace.filter(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain').map(e=>e.pid+':'+e.tid)
 const totals={}
 for(const e of trace)if(e.ph==='X'&&e.dur&&main.includes(e.pid+':'+e.tid)){totals[e.name]=(totals[e.name]||0)+e.dur/1000}
 const commits=d.evidence.commits
 const initialCounts={},scrollCounts={}
 for(const c of commits){
  const target=c.at<=visible?.at?initialCounts:scrollCounts
  for(const [name,count] of Object.entries(c.names))target[name]=(target[name]||0)+count
 }
 results.push({
  id:d.id,label:d.label,route:d.route,cache:d.cache,iteration:d.iteration,cpuThrottle:d.cpuThrottle||1,slowNetwork:d.slowNetwork||false,
  failure:d.failure,crashes:d.crashes,hotReloadContamination:d.requests.some(r=>/hot-update/.test(r.url)),
  ttfb:nav.responseStart-nav.requestStart,dcl:nav.domContentLoadedEventEnd,load:nav.loadEventEnd,
  requests:d.requests.length,transferred:d.requests.reduce((n,r)=>n+(r.transferred||0),0),
  decoded:d.requests.reduce((n,r)=>n+(r.decoded||0),0),kinds,
  longest:Math.max(0,...long.map(t=>t.duration)),longTasks:long.length,tbt:long.reduce((n,t)=>n+Math.max(0,t.duration-50),0),
  longestAfterVisible:Math.max(0,...long.filter(t=>t.start>=visible?.at).map(t=>t.duration)),
  heapVisible:visible?.metrics.JSHeapUsedSize,heapEnd:last?.metrics.JSHeapUsedSize,nodesEnd:last?.dom.nodes,listenersEnd:last?.dom.jsEventListeners,
  domElements:visible?.domElements,emptyRootCommits:commits.filter(c=>c.count===1).length,nonemptyRootCommits:commits.filter(c=>c.count>1).length,
  commitsInitial:visible?.commits,commitsScroll:(scroll?.commits||0)-(visible?.commits||0),
  initialChangedInputs:initialCounts,afterVisibleChangedInputs:scrollCounts,
  scrollScriptMs:((scroll?.metrics.ScriptDuration||0)-(visible?.metrics.ScriptDuration||0))*1000,
  scrollLayoutMs:((scroll?.metrics.LayoutDuration||0)-(visible?.metrics.LayoutDuration||0))*1000,
  scrollStyleMs:((scroll?.metrics.RecalcStyleDuration||0)-(visible?.metrics.RecalcStyleDuration||0))*1000,
  // Performance duration counters span reloads in the same target. Only cold values
  // are initial-load durations; warm per-run attribution uses the separate trace.
  layoutInitialMs:d.cache==='cold'?visible?.metrics.LayoutDuration*1000:null,styleInitialMs:d.cache==='cold'?visible?.metrics.RecalcStyleDuration*1000:null,
  scriptInitialMs:d.cache==='cold'?visible?.metrics.ScriptDuration*1000:null,taskInitialMs:d.cache==='cold'?visible?.metrics.TaskDuration*1000:null,
  cumulativeDurationsMs:{script:visible?.metrics.ScriptDuration*1000,layout:visible?.metrics.LayoutDuration*1000,style:visible?.metrics.RecalcStyleDuration*1000,task:visible?.metrics.TaskDuration*1000},
  traceMainThreadTotals:totals,observers:last?.observers,raf:last?.raf,
  imageTransfers:d.requests.filter(r=>r.type==='Image').map(r=>({url:r.url,status:r.status,mime:r.mime,bytes:r.transferred,decoded:r.decoded,error:r.error,cached:!!(r.servedFromCache||r.fromDiskCache)}))
 })
}
writeFileSync(root+'/summary.json',JSON.stringify(results,null,2))
console.log('Summarized '+results.length+' runs.')
