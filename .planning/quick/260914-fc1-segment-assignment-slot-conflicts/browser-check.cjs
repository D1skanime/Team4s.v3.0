// Real workspace/component, isolated read and mutation responses. No live data writes.
const {chromium}=require('/app/node_modules/playwright')
const {expect}=require('/app/node_modules/playwright/test')
const fs=require('node:fs')
const origin='http://192.168.235.196:3000',out='/tmp/team4s-quick-260914-fc1'
const version={id:28,anime_id:1,episode_number:2,title:'Nice Coupling',release_version:'v1',media_provider:'',media_item_id:'',created_at:'2026-09-14T00:00:00Z',updated_at:'2026-09-14T00:00:00Z'}
const profile={member_id:77,has_member_profile:true,has_project_assignments:true,app_user_id:11,display_name:'Upload-Test',fansub_name:'Upload-Test',slug:'upload-test',account_display_name:'Upload-Test',account_status:'active',account_global_roles:['user'],memberships:[],historical_credits:[],recent_media:[],recent_contributions:[],capabilities:{can_view_own_profile:true,can_edit_own_profile:true},avatar:null}
const errorMessage='Für diese Release-Version ist bereits ein Segment desselben Typs zugewiesen. Bitte einen freien Bereich wählen.'
function segment(id,kind,title,episodes){return {id,theme_id:kind==='OP Kara'?7:8,anime_id:1,theme_title:title,theme_type_name:kind,fansub_group_id:1,version:'v1',start_episode:1,end_episode:4,start_time:'00:00:00',end_time:'00:01:20',source_jellyfin_item_id:null,source_type:'episode_jellyfin',source_ref:null,source_label:null,origin_release_version_id:null,created_at:'2026-09-14T00:00:00Z',is_shared:episodes.length>1,has_episode_override:false,assigned_release_version_ids:episodes.map(n=>26+n),assigned_episodes:episodes.map(n=>({release_version_id:26+n,episode_number:String(n),has_override:false})),render_status:'ready'}}
;(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[]
 try{for(const [width,height,session] of [[390,844,'access'],[768,1024,'access'],[1440,900,'access'],[390,844,'refresh-only'],[390,844,'expired-access']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width===390})
 const jwt=exp=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({exp,sub:'fixture-segment-manager'})).toString('base64url')+'.fixture'
 const access=jwt(Math.floor(Date.now()/1000)+3600)
 if(session==='access')await context.addCookies([{name:'team4s_access_token',value:access,url:origin}])
 else {await context.addCookies([{name:'team4s_refresh_token',value:'fixture-refresh',url:origin}]);if(session==='expired-access')await context.addCookies([{name:'team4s_access_token',value:jwt(Math.floor(Date.now()/1000)-120),url:origin}])}
 let items=[segment(11,'OP Kara','Vorhandenes Opening',[2]),segment(12,'ED Kara','Ending nur Folge vier',[4])];const writes=[],errors=[];let refreshes=0
 await context.route('**/*',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,method=req.method()
  if(path==='/api/auth/keycloak/token'){refreshes++;return route.fulfill({json:{access_token:access,id_token:access,refresh_token:'fixture-refreshed',expires_in:3600,refresh_expires_in:7200,token_type:'Bearer'}})}
  if(session==='expired-access'&&refreshes===0&&path.startsWith('/api/v1/'))return route.fulfill({status:401,json:{error:{code:'token_expired',message:'Token abgelaufen'}}})
  if(!['GET','HEAD','OPTIONS'].includes(method)){
   writes.push({path,method,body:req.postDataJSON()})
   if(path==='/api/v1/admin/anime/1/segments'&&method==='POST'){
    const input=req.postDataJSON()
    if(input.theme_id===7)return route.fulfill({status:409,json:{error:{code:'segment_assignment_conflict',message:errorMessage}}})
    const created=segment(13,'ED Kara','Neues Ending',[1,2,3]);items=[...items,created]
    return route.fulfill({status:201,json:{data:created,range_sync:{added:[27,28,29],removed:[],protected_by_override:[],skipped_conflicts:[{release_version_id:30,episode_number:'4',existing_segment_id:12}]}}})
   }
   if(path==='/api/v1/admin/anime/1/segments/13'&&method==='PATCH')return route.fulfill({status:409,json:{error:{code:'segment_assignment_conflict',message:errorMessage}}})
   return route.abort()
  }
  if(path.includes('/api/')||path.includes('/realms/')){
   let data
   if(path==='/api/v1/admin/episode-versions/28/editor-context')data={anime_title:'Buddy Complex',anime_folder_path:null,selected_groups:[{id:1,name:'New-Subs',slug:'new-subs',logo_url:null}],version}
   else if(path==='/api/v1/admin/release-versions/28/capabilities')data={can_view_media:true,can_upload_media:false,can_update_media:false,can_delete_media:false,can_edit_notes:false,can_manage_segments:true,can_edit_metadata:true}
   else if(path==='/api/v1/me')data={app_user_id:11,legacy_user_id:11,display_name:'Segment-Test',status:'active',global_roles:['user'],is_platform_admin:false,session_id:'fixture-session'}
   else if(path==='/api/v1/me/profile')data=profile
   else if(path==='/api/v1/me/projects/1')data={anime_id:1,fansub_group_id:1,release_versions:[{release_version_id:28,episode_number:'2',episode_title:'Nice Coupling'}]}
   else if(path==='/api/v1/admin/anime/1/segments')data=items
   else if(path==='/api/v1/admin/anime/1/themes')data=[{id:7,anime_id:1,theme_type_id:17,theme_type_name:'OP Kara',title:'Vorhandenes Opening'},{id:8,anime_id:1,theme_type_id:23,theme_type_name:'ED Kara',title:'Neues Ending'}]
   else if(path==='/api/v1/admin/theme-types')data=[{id:17,name:'OP Kara'},{id:23,name:'ED Kara'}]
   else if(path.includes('/segments/'))data=[]
   else if(path.endsWith('/anime/1/timeline'))data={anime_id:1,fansub_group_id:1,production_started_on:null,production_completed_on:null}
   else return route.fulfill({status:404,json:{message:'Isolated fixture'}})
   return route.fulfill({json:{data}})
  }
  return route.continue()
 })
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto(origin+'/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1',{waitUntil:'domcontentloaded',timeout:45000})
 await page.getByRole('tab',{name:'Segmente',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Aktive Segmente für Episode 2'})).toBeVisible()
 await expect(page.locator('td').filter({hasText:/^Vorhandenes Opening$/})).toBeVisible()
 await expect(page.locator('td').filter({hasText:/^Ending nur Folge vier$/})).toHaveCount(0)
 await page.getByRole('button',{name:'Segment hinzufügen',exact:true}).click()
 await page.getByLabel('Name (optional)',{exact:true}).fill('Vorhandenes Opening')
 await page.getByRole('button',{name:'Speichern',exact:true}).click()
 await expect(page.getByText(errorMessage,{exact:true}).last()).toBeVisible()
 await expect(page.getByLabel('Von',{exact:true})).toHaveValue('2')
 await page.screenshot({path:`${out}/${width}-${session}-conflict.png`,fullPage:true})
 expect(writes).toHaveLength(1)
 await page.getByLabel('Typ',{exact:true}).selectOption({label:'ED Kara'})
 await page.getByLabel('Name (optional)',{exact:true}).fill('Neues Ending')
 await page.getByLabel('Von',{exact:true}).fill('1');await page.getByLabel('Bis',{exact:true}).fill('4')
 await page.getByRole('button',{name:'Speichern',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('übersprungen: 4')
 await expect(page.locator('td').filter({hasText:/^Neues Ending$/})).toBeVisible()
 const row=page.locator('tr').filter({has:page.locator('td').filter({hasText:/^Neues Ending$/})})
 await expect(row).toContainText('1, 2, 3')
 await expect(page.locator('td').filter({hasText:/^Ending nur Folge vier$/})).toHaveCount(0)
 const geometry=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,tableWidth:document.querySelector('table').getBoundingClientRect().width,tableContainerWidth:document.querySelector('table').parentElement.clientWidth}))
 expect(geometry.documentWidth).toBeLessThanOrEqual(width)
 if(width===390)expect(geometry.tableWidth).toBeLessThanOrEqual(geometry.tableContainerWidth)
 await page.screenshot({path:`${out}/${width}-${session}-range.png`,fullPage:true})
 await row.getByRole('button',{name:'Bearbeiten',exact:true}).click()
 await expect(page.getByLabel('Von',{exact:true})).toHaveValue('1')
 await expect(page.getByLabel('Bis',{exact:true})).toHaveValue('3')
 await page.getByRole('button',{name:'Abbrechen',exact:true}).click()
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByRole('tab',{name:'Segmente',exact:true}).click()
 const reloadedRow=page.locator('tr').filter({has:page.locator('td').filter({hasText:/^Neues Ending$/})})
 await reloadedRow.getByRole('button',{name:'Bearbeiten',exact:true}).click()
 await expect(page.getByLabel('Von',{exact:true})).toHaveValue('1')
 await expect(page.getByLabel('Bis',{exact:true})).toHaveValue('3')
 await page.screenshot({path:`${out}/${width}-${session}-reopen.png`,fullPage:true})
 expect(writes).toHaveLength(2);expect(errors).toEqual([]);expect(refreshes).toBe(session==='access'?0:1)
 results.push({width,height,session,geometry,fixtureWrites:writes.length,liveWrites:0,refreshes,checks:['range-only not active','409 keeps editor and values','no follow-up write after409','OP and ED UI flow','partial sync notice','actual episodes shown','no root overflow','no page errors','reopen uses assigned bounds','reload uses assigned bounds without writes']})
 console.log(JSON.stringify({width,session,status:"pass",refreshes}));await context.close()
 }
 fs.writeFileSync(out+'/browser-results.json',JSON.stringify({cases:results.length,results,liveWrites:0},null,2));console.log(JSON.stringify({cases:results.length,liveWrites:0,out}))
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
