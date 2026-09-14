
const {chromium}=require('/app/node_modules/playwright');
const {expect}=require('/app/node_modules/playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true}); const results=[]; const images={};
 try{
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1024}});
  await page.goto('http://192.168.235.196:3000/members/qc',{waitUntil:'domcontentloaded',timeout:15000});
  const group=page.locator('[data-badge-group="roles"]');
  const region=page.getByRole('region',{name:'Rollenfortschritt-Karussell'});
  await group.scrollIntoViewIfNeeded(); await expect(region).toHaveAttribute('data-interaction-enabled','true');
  const measure=()=>page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height};};
   const role=document.querySelector('[data-role-card-state="active"]');
   const anime=document.querySelector('[data-anime-project-stage]');
   const contribution=document.querySelector('[aria-label="Beiträge-Karussell"] [data-focal-carousel-item][aria-current="true"] section');
   const art=el=>el.querySelector('[data-achievement-size="hero"]');
   return {viewport:innerWidth,rootWidth:document.documentElement.scrollWidth,role:rect(role),anime:rect(anime),contribution:rect(contribution),roleArt:rect(art(role)),animeArt:rect(art(anime)),contributionArt:rect(art(contribution)),columns:getComputedStyle(role).gridTemplateColumns};
  });
  const m=await measure(); if(m.rootWidth>width || Math.abs(m.role.x-m.anime.x)>1 || Math.abs(m.role.width-m.anime.width)>1 || Math.abs(m.roleArt.x-m.animeArt.x)>1)throw Error(JSON.stringify(m));
  images[`roles-${width}.png`]=(await group.screenshot({timeout:5000})).toString('base64');
  await page.getByRole('button',{name:'Nächste Rolle',exact:true}).click();
  await expect(region.locator('[data-focal-carousel-item][aria-current="true"]')).toHaveAttribute('aria-label','Rolle 2 von 3');
  await expect(region).toHaveAttribute('data-navigation-state','settled');
  await region.press('End'); await expect(region.locator('[aria-current="true"][data-focal-carousel-item]')).toHaveAttribute('aria-label','Rolle 3 von 3');
  await region.press('Home'); await expect(region.locator('[aria-current="true"][data-focal-carousel-item]')).toHaveAttribute('aria-label','Rolle 1 von 3');
  await page.getByRole('button',{name:'Alle Auszeichnungen in Fansubrollen anzeigen'}).click();
  await expect(page.getByRole('button',{name:'Weniger anzeigen',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Weniger anzeigen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Alle Auszeichnungen in Fansubrollen anzeigen'})).toBeFocused();
  const contributions=page.getByRole('region',{name:'Beiträge-Karussell'});
  await contributions.scrollIntoViewIfNeeded(); await expect(contributions).toHaveAttribute('data-interaction-enabled','true');
  await page.getByRole('button',{name:'Nächste Sammlung',exact:true}).click();
  await expect(contributions.locator('[data-focal-carousel-item][aria-current="true"]')).toHaveAttribute('aria-label','Sammlung 2 von 3');
  await page.getByRole('button',{name:'Vorherige Sammlung',exact:true}).click();
  await expect(contributions).toHaveAttribute('data-navigation-state','settled');
  results.push({...m,navigation:'arrows, Home/End, expand/collapse and focus restoration passed; contribution next/previous passed'});
  if(width===1440){
   for(const size of [390,561,562,563,657,658,659]){
    await page.locator('[class*="groupList"]').evaluate((el,size)=>{el.style.width=size+'px';},size);
    const nested=await measure(); if(nested.rootWidth>width || Math.abs(nested.role.width-size)>1)throw Error(JSON.stringify(nested));
    results.push({embeddedWidth:size,...nested});
   }
   await page.locator('[class*="groupList"]').evaluate(el=>{el.style.width='';});
   await page.evaluate(()=>{document.documentElement.style.zoom='2';});
   const zoom=await measure(); if(zoom.rootWidth>width)throw Error(JSON.stringify(zoom));
   results.push({cssZoom:2,...zoom});
  }
  await page.close();
 }
 console.log(JSON.stringify({results,images}));
 }finally{await browser.close();}
})();
