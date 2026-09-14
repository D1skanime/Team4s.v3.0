// Canonical repo: docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-dzk-release-category-upload/browser-check.cjs
// Real page with isolated API fixtures; upload/PATCH handled in-memory, other writes aborted. No backend writes.
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const fs = require('node:fs')
const origin='http://192.168.235.196:3000'
const out='/tmp/team4s-quick-260914-dzk'
const categories=[['screenshot','Screenshot'],['typesetting_karaoke','Typesetting / Karaoke'],['fun_outtake','Fun / Outtake'],['other','Sonstiges']]
const version={id:28,anime_id:1,episode_number:2,title:'Nice Coupling',release_version:'v1',media_provider:'',media_item_id:'',created_at:'2026-09-14T00:00:00Z',updated_at:'2026-09-14T00:00:00Z'}
const profile={member_id:77,has_member_profile:true,has_project_assignments:true,app_user_id:11,display_name:'Upload-Test',fansub_name:'Upload-Test',slug:'upload-test',account_display_name:'Upload-Test',account_status:'active',account_global_roles:['user'],memberships:[],historical_credits:[],recent_media:[],recent_contributions:[],capabilities:{can_view_own_profile:true,can_edit_own_profile:true},avatar:null}
const sharp=require('/app/node_modules/sharp')
;(async()=>{
 fs.mkdirSync(out,{recursive:true})
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const results=[]
 try {
 for(const [width,height] of [[390,844],[768,1024],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:width===390})
  const token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture'
  await context.addCookies([{name:'team4s_access_token',value:token,url:origin}])
  let uploads=0, failedOnce=false, unexpectedWrites=0;const patches=[],errors=[]
  const item=(id,title=null)=>({id,release_version_id:28,media_asset_id:id+100,category:'screenshot',title,caption:null,sort_order:id,is_preview_candidate:id===90,visibility:'intern',review_status:'in_pruefung',review_state:'pending',can_update:true,can_delete:false,thumbnail_url:'/fixture-image.png',original_url:'/fixture-image.png',created_at:'2026-09-14T00:00:00Z',source_revision:1,uploaded_by_user_id:11,deleted_at:null})
  let items=[item(90,'Bisherige Vorschau')]
  const picture=await sharp({create:{width:480,height:300,channels:3,background:'#6283ba'}}).png().toBuffer()
  await context.route('**/*',async route=>{
   const request=route.request(), path=new URL(request.url()).pathname, method=request.method()
   if(path==='/fixture-image.png')return route.fulfill({contentType:'image/png',body:picture})
   if(path==='/api/v1/admin/release-versions/28/media'&&method==='POST') {
    uploads++
    const body=request.postDataBuffer().toString('latin1')
    expect((body.match(/name="files\[\]"/g)||[]).length).toBe(3)
    items.push(item(101),item(102),item(103))
    return route.fulfill({json:{results:[101,102,103].map((id,i)=>({client_file_name:`bild-${i+1}.png`,status:'ready',release_version_media_id:id,media_asset_id:id+100,source_revision:1}))}})
   }
   const match=path.match(/\/release-versions\/28\/media\/(\d+)$/)
   if(match&&method==='PATCH') {
    const id=Number(match[1]),patch=request.postDataJSON();patches.push({id,patch})
    if(id===103&&!failedOnce){failedOnce=true;return route.fulfill({status:500,json:{error:{message:'Metadaten-Testfehler'}}})}
    if(patch.is_preview_candidate===true)items=items.map(i=>({...i,is_preview_candidate:false}))
    items=items.map(i=>i.id===id?{...i,...patch,source_revision:i.source_revision+1}:i)
    return route.fulfill({json:items.find(i=>i.id===id)})
   }
   if(!['GET','HEAD','OPTIONS'].includes(method)){unexpectedWrites++;return route.abort()}
   if(path.includes('/api/')||path.includes('/realms/')) {
    if(path==='/api/v1/admin/episode-versions/28/editor-context') return route.fulfill({json:{data:{anime_title:'Buddy Complex',anime_folder_path:null,selected_groups:[{id:1,name:'New-Subs',slug:'new-subs',logo_url:null}],version}}})
    if(path==='/api/v1/admin/release-versions/28/capabilities') return route.fulfill({json:{data:{can_view_media:true,can_upload_media:true,can_update_media:true,can_delete_media:false,can_delete_own_media:true,can_edit_notes:false,can_manage_segments:false,can_edit_metadata:true}}})
    if(path==='/api/v1/admin/release-versions/28/media') return route.fulfill({json:{data:items}})
    if(path==='/api/v1/me/profile') return route.fulfill({json:{data:profile}})
    if(path==='/api/v1/me/projects/1') return route.fulfill({json:{data:{anime_id:1,fansub_group_id:1,release_versions:[{release_version_id:28,episode_number:'2',episode_title:'Nice Coupling'}]}}})
    if(path.endsWith('/anime/1/timeline'))return route.fulfill({json:{data:{anime_id:1,fansub_group_id:1,production_started_on:null,production_completed_on:null}}})
    return route.fulfill({status:404,json:{message:'Isolated fixture'}})
   }
   return route.continue()
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  const url=origin+'/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1'
  await page.goto(url,{waitUntil:'domcontentloaded'})
  await page.getByRole('tab',{name:'Bilder & Medien'}).click()
  const trigger=page.getByRole('group',{name:'Medienkategorie'}).getByRole('button',{name:'Screenshot 1',exact:true})
  if(width===390)await trigger.tap();else if(width===768){await trigger.focus();await trigger.press('Enter')}else await trigger.click()
  const dialog=page.getByRole('dialog',{name:'Medien hochladen'})
  const files=[1,2,3].map(n=>({name:`bild-${n}.png`,mimeType:'image/png',buffer:picture}))
  await dialog.getByLabel('Dateien',{exact:true}).setInputFiles(files)
  await expect(dialog.getByRole('img',{name:/^Vorschau bild-/})).toHaveCount(3)
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await expect(dialog.getByRole('radio',{name:'Keine neue Vorschau'})).toBeChecked()
  for(const n of [1,2,3]) {
   const row=dialog.getByRole('region',{name:`bild-${n}.png`,exact:true})
   await row.getByLabel('Titel',{exact:true}).fill(`Bildtitel ${n}`)
   await row.getByLabel('Beschreibung',{exact:true}).fill(`Eigene Beschreibung für Bild ${n}.`)
  }
  const second=dialog.getByRole('region',{name:'bild-2.png',exact:true})
  await second.getByRole('radio',{name:'Als Vorschau verwenden'}).check()
  await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(1)
  await second.getByRole('button',{name:'Aus Auswahl entfernen'}).click()
  await expect(dialog.getByRole('radio',{name:'Keine neue Vorschau'})).toBeChecked()
  await expect(dialog.getByRole('region',{name:'bild-1.png',exact:true}).getByLabel('Titel',{exact:true})).toHaveValue('Bildtitel 1')
  await dialog.getByLabel('Dateien',{exact:true}).setInputFiles(files[1])
  await second.getByLabel('Titel',{exact:true}).fill('Bildtitel 2')
  await second.getByLabel('Beschreibung',{exact:true}).fill('Eigene Beschreibung für Bild 2.')
  await second.getByRole('radio',{name:'Als Vorschau verwenden'}).check()
  await dialog.getByRole('region',{name:'bild-1.png',exact:true}).scrollIntoViewIfNeeded()
  const geometry=await dialog.evaluate(el=>({viewport:innerWidth,root:document.documentElement.scrollWidth,dialog:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,rows:[...el.querySelectorAll('section[aria-labelledby]')].map(row=>{const image=row.querySelector('img').getBoundingClientRect(),input=row.querySelector('input:not([type=radio])').getBoundingClientRect();return {imageX:image.x,imageY:image.y,inputX:input.x,inputY:input.y,inputRight:input.right}})}))
  expect(geometry.root).toBeLessThanOrEqual(width);expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
  await page.screenshot({path:`${out}/${width}-upload-drafts.png`})
  // Selection order is now 1, 3, 2. Backend fixture returns IDs in input order.
  await dialog.getByRole('button',{name:'Upload starten'}).click()
  const failedRow=dialog.getByRole('region',{name:'bild-2.png',exact:true})
  await expect(failedRow.getByText('Metadaten-Testfehler',{exact:true})).toBeVisible()
  await expect(dialog.getByRole('button',{name:'Upload starten'})).toBeDisabled()
  expect(items.find(i=>i.id===90).is_preview_candidate).toBe(true)
  expect(items.filter(i=>i.is_preview_candidate)).toHaveLength(1)
  await page.screenshot({path:`${out}/${width}-upload-retry.png`})
  await failedRow.getByRole('button',{name:'Erneut versuchen'}).click()
  await expect(failedRow.getByRole('button',{name:'Erneut versuchen'})).toHaveCount(0)
  expect(uploads).toBe(1);expect(patches).toHaveLength(4)
  expect(patches.map(p=>[p.id,p.patch.title])).toEqual([[101,'Bildtitel 1'],[102,'Bildtitel 3'],[103,'Bildtitel 2'],[103,'Bildtitel 2']])
  expect(patches.filter(p=>p.patch.is_preview_candidate===true).map(p=>p.id)).toEqual([103,103])
  expect(items.filter(i=>i.is_preview_candidate).map(i=>i.id)).toEqual([103])
  await dialog.getByRole('button',{name:'Abbrechen'}).click()
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('tab',{name:'Bilder & Medien'}).click()
  await page.getByRole('button',{name:'Bildtitel 1 bearbeiten',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Medium bearbeiten'})
  await expect(editor.getByLabel('Titel',{exact:true})).toHaveValue('Bildtitel 1')
  await expect(editor.getByLabel('Beschreibung',{exact:true})).toHaveValue('Eigene Beschreibung für Bild 1.')
  await editor.getByLabel('Titel',{exact:true}).fill('Nachbearbeiteter Titel')
  await editor.getByRole('button',{name:'Speichern',exact:true}).click()
  await expect(page.getByRole('button',{name:'Nachbearbeiteter Titel bearbeiten',exact:true})).toBeVisible()
  expect(items.find(i=>i.id===101).caption).toBe('Eigene Beschreibung für Bild 1.')
  expect(unexpectedWrites).toBe(0);expect(errors).toEqual([])
  results.push({width,height,geometry,uploads,patches,unexpectedWrites,errors,pass:true})
  await context.close()
 }
 fs.writeFileSync(out+'/browser-results.json',JSON.stringify({results,liveWrites:0},null,2))
 console.log(JSON.stringify({cases:results.length,out,liveWrites:0}))
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
