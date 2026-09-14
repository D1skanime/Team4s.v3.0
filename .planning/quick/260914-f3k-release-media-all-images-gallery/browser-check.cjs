// Canonical repo: docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-f3k-release-category-upload/browser-check.cjs
// The real page and media component use isolated API fixtures. Every write is aborted.
const { chromium } = require('/app/node_modules/playwright')
const { expect } = require('/app/node_modules/playwright/test')
const fs = require('node:fs')
const sharp = require('/app/node_modules/sharp')
const origin='http://192.168.235.196:3000'
const out='/tmp/team4s-quick-260914-f3k'
const categories=[['screenshot','Screenshot'],['typesetting_karaoke','Typesetting / Karaoke'],['fun_outtake','Fun / Outtake'],['other','Sonstiges']]
const version={id:28,anime_id:1,episode_number:2,title:'Nice Coupling',release_version:'v1',media_provider:'',media_item_id:'',created_at:'2026-09-14T00:00:00Z',updated_at:'2026-09-14T00:00:00Z'}
const profile={member_id:77,has_member_profile:true,has_project_assignments:true,app_user_id:11,display_name:'Upload-Test',fansub_name:'Upload-Test',slug:'upload-test',account_display_name:'Upload-Test',account_status:'active',account_global_roles:['user'],memberships:[],historical_credits:[],recent_media:[],recent_contributions:[],capabilities:{can_view_own_profile:true,can_edit_own_profile:true},avatar:null}
;(async()=>{
 fs.mkdirSync(out,{recursive:true})
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const pictures=await Promise.all(['#688baf','#70a58d','#ac86a5','#ac9b66'].map((color,i)=>sharp(Buffer.from(`<svg width="480" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="300" fill="${color}"/><circle cx="370" cy="80" r="40" fill="#ffffff" opacity="0.3"/><text x="35" y="235" font-size="70" fill="#ffffff">Bild ${i+1}</text></svg>`)).png().toBuffer()))
 const results=[];let writes=0
 try {
  for(const [width,height] of [[390,844],[768,1024],[1440,900]]) {
   for(const mode of ['empty','populated','readonly']) {
    const canUpload=mode!=='readonly'
    const context=await browser.newContext({viewport:{width,height},hasTouch:width===390})
    const token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture'
    await context.addCookies([{name:'team4s_access_token',value:token,url:origin}])
    let mediaReads=0;const errors=[]
    const capabilities={can_view_media:true,can_upload_media:canUpload,can_update_media:canUpload,can_delete_media:false,can_delete_own_media:canUpload,can_edit_notes:false,can_manage_segments:false,can_edit_metadata:true}
    const items=mode==='empty'?[]:[['screenshot','Bild eins'],['screenshot','Bild zwei'],['screenshot','Bild drei'],['typesetting_karaoke','Karaoke']].map(([category,label],index)=>({id:101+index,release_version_id:28,media_asset_id:201+index,category,caption:label+' Beispiel',sort_order:index,is_preview_candidate:index===3,visibility:'intern',review_status:'freigegeben',review_state:'confirmed',can_update:canUpload,can_delete:false,thumbnail_url:mode==='readonly'?null:`/fixture-image-${index}.png`,original_url:mode==='readonly'?null:`/fixture-image-${index}.png`,created_at:'2026-09-14T00:00:00Z',uploaded_by_user_id:11}))
    await context.route('**/*',async route=>{
     const request=route.request();const path=new URL(request.url()).pathname
     if(/^\/fixture-image-[0-3]\.png$/.test(path))return route.fulfill({contentType:'image/png',body:pictures[Number(path.match(/[0-3]/)[0])]})
     if(!['GET','HEAD','OPTIONS'].includes(request.method())) {writes++;return route.abort()}
     if(path.includes('/api/')||path.includes('/realms/')) {
      if(path==='/api/v1/admin/episode-versions/28/editor-context') return route.fulfill({json:{data:{anime_title:'Buddy Complex',anime_folder_path:null,selected_groups:[{id:1,name:'New-Subs',slug:'new-subs',logo_url:null}],version}}})
      if(path==='/api/v1/admin/release-versions/28/capabilities') return route.fulfill({json:{data:capabilities}})
      if(path==='/api/v1/admin/release-versions/28/media') {mediaReads++;return route.fulfill({json:{data:items}})}
      if(path==='/api/v1/me/profile') return route.fulfill({json:{data:profile}})
      if(path==='/api/v1/me/projects/1') return route.fulfill({json:{data:{anime_id:1,fansub_group_id:1,release_versions:[{release_version_id:28,episode_number:'2',episode_title:'Nice Coupling'}]}}})
      if(path.endsWith('/anime/1/timeline')) return route.fulfill({json:{data:{anime_id:1,fansub_group_id:1,production_started_on:null,production_completed_on:null}}})
      return route.fulfill({status:404,json:{message:'Isolated fixture'}})
     }
     return route.continue()
    })
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message))
    await page.goto(origin+'/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1',{waitUntil:'domcontentloaded',timeout:30000})
    await page.getByRole('tab',{name:'Bilder & Medien'}).click()
    const group=page.getByRole('group',{name:'Medienkategorie'})
    await expect(group).toBeVisible()
    const first=group.getByRole('button',{name:'Screenshot '+items.filter(i=>i.category==='screenshot').length,exact:true})
    if(canUpload) await expect(first).toHaveAttribute('aria-haspopup','dialog')
    else {await expect(first).toBeDisabled();await expect(page.getByText('Du darfst Medien dieser Release-Version ansehen, aber nicht hochladen.')).toBeVisible()}
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button',{name:/^(Hochladen|Jetzt hochladen)$/})).toHaveCount(0)
    await expect(page.getByText('Noch keine Medien',{exact:true})).toHaveCount(0)
    if(mode==='empty') await expect(page.getByText('Aktive Kategorie')).toHaveCount(0)
    await expect(page.getByText('Aktive Kategorie')).toHaveCount(0)
    const assertGallery=async()=>{
     if(items.length)await expect(page.getByRole('heading',{name:'Vorhandene Medien · 4'})).toBeVisible()
     for(const item of items){const opener=page.getByRole('button',{name:item.caption+' '+(canUpload?'bearbeiten':'ansehen')+(item.is_preview_candidate?', aktuelles Vorschaubild':''),exact:true});await expect(opener).toBeVisible();await expect(opener.getByText(categories.find(c=>c[0]===item.category)[1],{exact:true})).toBeVisible()}
    }
    await assertGallery()
    if(mode==='populated'){await page.getByRole('heading',{name:'Vorhandene Medien · 4'}).scrollIntoViewIfNeeded();await page.locator('img[src^="/fixture-image-"]').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode()))});await page.screenshot({path:`${out}/${width}-all-images.png`,fullPage:true})}
    const readsBefore=mediaReads
    for(const [category,label] of categories) {
     const trigger=group.getByRole('button',{name:label+' '+items.filter(i=>i.category===category).length,exact:true})
     await expect(trigger).not.toHaveAttribute('aria-pressed')
     if(canUpload){
      if(width===390) await trigger.tap()
      else if(width===768) {await trigger.focus();await trigger.press('Enter')}
      else await trigger.click()
     } else await expect(trigger).toBeDisabled()
     if(canUpload) {
      const dialog=page.getByRole('dialog',{name:'Medien hochladen'})
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Kategorie: '+label,{exact:true})).toBeVisible()
      await expect(dialog.getByRole('button',{name:'Upload starten'})).toBeDisabled()
      if(mode==='empty'&&label==='Screenshot') await page.screenshot({path:`${out}/${width}-dialog.png`})
      await dialog.getByRole('button',{name:'Abbrechen'}).click()
      await expect(dialog).toHaveCount(0)
      await trigger.click()
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button',{name:'Schließen',exact:true}).click()
     } else await expect(page.getByRole('dialog')).toHaveCount(0)
     await assertGallery()
     const geometry=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
     expect(geometry.documentWidth).toBeLessThanOrEqual(width)
     results.push({width,height,mode,category:label,input:width===390?'touch':width===768?'keyboard':'mouse',geometry,status:'pass'})
    }
    for(const item of items){
     await page.getByRole('button',{name:item.caption+' '+(canUpload?'bearbeiten':'ansehen')+(item.is_preview_candidate?', aktuelles Vorschaubild':''),exact:true}).click()
     const detail=page.getByRole('dialog',{name:canUpload?'Medium bearbeiten':'Medium ansehen'});await expect(detail).toBeVisible();await detail.getByRole('button',{name:'Schließen',exact:true}).click()
    }
    expect(mediaReads).toBe(readsBefore)
    expect(errors).toEqual([])
    await context.close()
   }
  }
  expect(writes).toBe(0)
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify({cases:results.length,writes,extraMediaReadsOnCategoryChange:0,results},null,2))
  console.log(JSON.stringify({cases:results.length,writes,out}))
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
