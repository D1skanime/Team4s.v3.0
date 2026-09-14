// Run in the existing frontend container; no production process, .next, env file or backend is changed.
// docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-dzk-release-media-per-file-metadata/browser-public-check.cjs
// SSR/RSC fetches use an isolated read-only API server. Browser API reads use the same fixtures.
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const sharp = require('/app/node_modules/sharp')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const out='/tmp/team4s-quick-260914-dzk-public'
const work=fs.mkdtempSync('/tmp/team4s-quick-260914-dzk-public-next-')
const marker=path.join(work,'.quick-owned')
const routePath='/fansubs/new-subs/fansubprojekt/buddy-complex/releases/28'
const items=[
 {id:101,title:'Beschilderung im Hangar',caption:'Die Beschriftung wurde einzeln gesetzt. Umlaute und Zeilenabstände bleiben im fertigen Bild lesbar.',category:'screenshot'},
 {id:102,title:'Liedzeile im Ending',caption:'Eigener Text zum zweiten Bild; dieser bleibt von seinem Titel getrennt.',category:'typesetting_karaoke'},
 {id:103,title:null,caption:'Beschreibung ohne separaten Titel',category:'other'},
].map(item=>({...item,thumbnail_url:`/api/v1/media/files/fixture-${item.id}.png`,original_url:`/api/v1/media/files/fixture-${item.id}.png`,author_name:'Fixture-Member',is_preview_candidate:item.id===101}))
const detail={release_version_id:28,episode_number:'02',episode_title:'Nice Coupling',title:'Nice Coupling',version:'v1',groups:[{id:1,slug:'new-subs',name:'New-Subs',logo_url:null}],release_date:'2026-09-14',duration_seconds:1440,resolution:'1920x1080',container:'MKV',video_codec:'H.264',audio_codec:'AAC',audio_language:'Japanisch',subtitle_tracks:[],subtitle_type:'Softsub',preview_image:items[0],image_category_totals:{screenshot:1,typesetting_karaoke:1,fun_outtake:0,other:1},segments:[],previous:null,next:null,images_count:3,notes_count:0,contributors_count:0,contributors:[],images:items,notes:[]}
const reads=[];let writes=0;let apiServer,next,browser,log='';const results=[]
function responseFor(url,method) {
 const u=new URL(url,'http://fixture');reads.push({path:u.pathname,method})
 if(!['GET','HEAD','OPTIONS'].includes(method)){writes++;return {status:405,json:{error:'Fixture is read-only'}}}
 if(u.pathname==='/api/v1/fansub-slugs/new-subs/projects/buddy-complex/resolve') return {json:{data:{group_id:1,anime_id:1,anime_slug:'buddy-complex',projects:[]}}}
 if(u.pathname==='/api/v1/anime/1/group/1/releases/28') return {json:detail}
 if(u.pathname==='/api/v1/anime/1') return {json:{data:{id:1,title:'Buddy Complex',type:'TV',status:'completed',genre:[],genres:[]}}}
 if(u.pathname==='/api/v1/anime/1/group/1') return {json:{data:{id:1,anime_id:1,fansub_id:1,fansub:detail.groups[0],stats:{}}}}
 if(u.pathname==='/api/v1/anime/1/backdrops') return {json:{data:{anime_id:1,backdrops:[],logo_url:null,banner_url:null}}}
 if(u.pathname==='/api/v1/fansub-group-roles') return {json:{data:[]}}
 return {status:404,json:{error:'No fixture for '+u.pathname}}
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
;(async()=>{
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(marker,'260914-dzk')
 // Small code/config copy, dependencies and immutable frontend assets shared read-only.
 fs.cpSync('/app/src',path.join(work,'src'),{recursive:true})
 for(const f of ['package.json','tsconfig.json','next-env.d.ts','next.config.mjs','postcss.config.mjs','postcss.config.js']) if(fs.existsSync('/app/'+f)) fs.copyFileSync('/app/'+f,path.join(work,f))
 fs.symlinkSync('/app/node_modules',path.join(work,'node_modules'),'dir')
 fs.symlinkSync('/app/public',path.join(work,'public'),'dir')
 const png=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#263d63"/><path d="M0 400L260 160 490 380 680 190 960 390V540H0Z" fill="#59879e"/><rect x="180" y="190" width="600" height="105" rx="12" fill="#f5f6f8"/><text x="480" y="257" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#263d63">RELEASE-MEDIEN TESTBILD</text></svg>')).png().toBuffer()
 apiServer=http.createServer((req,res)=>{
  const data=responseFor(req.url,req.method)
  res.writeHead(data.status||200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data.json))
 })
 await new Promise(resolve=>apiServer.listen(0,'127.0.0.1',resolve))
 const apiOrigin='http://127.0.0.1:'+apiServer.address().port
 const port=33187,origin='http://127.0.0.1:'+port
 // Environment copied selectively: no host-local .env or credential-dependent public requests.
 const env={...process.env,NODE_ENV:'development',API_INTERNAL_URL:apiOrigin,NEXT_PUBLIC_API_URL:'',NEXT_PUBLIC_AUTH_BYPASS_LOCAL:'false',NEXT_PUBLIC_RUNTIME_PROFILE:'test',NEXT_TELEMETRY_DISABLED:'1'}
 next=spawn(process.execPath,['/app/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:work,env,stdio:['ignore','pipe','pipe']})
 next.stdout.on('data',d=>log+=d);next.stderr.on('data',d=>log+=d)
 for(let i=0;i<120;i++){if(log.includes('Ready in'))break;if(next.exitCode!=null)throw new Error('Next exited: '+log);await sleep(250)}
 if(!log.includes('Ready in'))throw new Error('Next not ready: '+log)
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const [width,height] of [[390,844],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:width===390})
  const errors=[]
  await context.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url())
   if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes++;return route.abort()}
   if(u.pathname.startsWith('/api/v1/media/files/fixture-')) return route.fulfill({contentType:'image/png',body:png})
   if(u.pathname.startsWith('/api/')||u.pathname.includes('/realms/')) {
    const data=responseFor(request.url(),request.method());return route.fulfill({status:data.status||200,json:data.json})
   }
   if(u.origin!==origin)return route.abort()
   return route.continue()
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  const navigation=await page.goto(origin+routePath,{waitUntil:'domcontentloaded',timeout:90000})
  expect(navigation.status()).toBe(200)
  const gallery=page.locator('#galerie');await expect(gallery).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
  if(width===390)await expect(gallery.getByRole('button',{name:'Weitere 1 Bilder anzeigen',exact:true})).toBeVisible()
  await gallery.scrollIntoViewIfNeeded()
  const first=gallery.getByRole('button',{name:items[0].title+' öffnen',exact:true})
  await expect(gallery.getByText(items[0].title,{exact:true})).toBeVisible()
  await expect(gallery.getByText(items[0].caption,{exact:true})).toBeVisible()
  await expect(gallery.locator('strong',{hasText:items[0].title})).toBeVisible()
  const before=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
  expect(before.documentWidth).toBeLessThanOrEqual(width)
  await expect.poll(()=>gallery.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
  await page.screenshot({path:`${out}/${width}-public-gallery.png`})
  const readCount=reads.length
  if(width===390)await first.tap();else{await first.focus();await first.press('Enter')}
  let dialog=page.getByRole('dialog',{name:items[0].title,exact:true});await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading',{name:items[0].title,exact:true})).toBeVisible()
  await expect(dialog.getByText(items[0].caption,{exact:true})).toBeVisible()
  const fullImage=dialog.getByRole('img',{name:items[0].title,exact:true})
  await expect(fullImage).toBeVisible()
  await expect.poll(()=>fullImage.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
  await page.screenshot({path:`${out}/${width}-public-viewer.png`})
  await dialog.getByRole('button',{name:'Nächstes Bild',exact:true}).click()
  dialog=page.getByRole('dialog',{name:items[1].title,exact:true});await expect(dialog).toBeVisible()
  await expect(dialog.getByText(items[1].caption,{exact:true})).toBeVisible()
  await page.keyboard.press('ArrowRight')
  dialog=page.getByRole('dialog',{name:'Sonstiges',exact:true});await expect(dialog).toBeVisible()
  await expect(dialog.getByText(items[2].caption,{exact:true})).toBeVisible()
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(first).toBeFocused()
  const after=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
  expect(after.documentWidth).toBeLessThanOrEqual(width)
  expect(reads.length).toBe(readCount)
  expect(errors).toEqual([])
  results.push({width,height,route:routePath,httpStatus:navigation.status(),input:width===390?'touch':'keyboard',titleAndDescriptionSeparate:true,threeItemsNavigable:true,untitledFallback:'Sonstiges',focusRestored:true,newApiReadsDuringViewer:reads.length-readCount,geometry:{before,after},pageErrors:errors,status:'pass'})
  await context.close()
 }
 expect(writes).toBe(0)
 fs.writeFileSync(out+'/browser-public-results.json',JSON.stringify({cases:results.length,writes,apiIsolation:'SSR fixture API_INTERNAL_URL and browser interception; no backend forwarding',results,reads},null,2))
 console.log(JSON.stringify({cases:results.length,writes,out,results}))
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(browser)await browser.close()
 if(next){next.kill('SIGTERM');await sleep(1500);if(next.exitCode===null)next.kill('SIGKILL')}
 if(apiServer)await new Promise(resolve=>apiServer.close(resolve))
 fs.writeFileSync(out+'/public-next.log',log)
 if(fs.existsSync(marker)&&fs.readFileSync(marker,'utf8')==='260914-dzk'&&fs.realpathSync(work).startsWith('/tmp/team4s-quick-260914-dzk-public-next-'))fs.rmSync(work,{recursive:true,force:true})
})
