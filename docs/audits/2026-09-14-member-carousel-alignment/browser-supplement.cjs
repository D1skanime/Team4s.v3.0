
const {chromium}=require('/app/node_modules/playwright'); const {expect}=require('/app/node_modules/playwright/test');
(async()=>{const browser=await chromium.launch({headless:true});const results={};try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://192.168.235.196:3000/members/type',{waitUntil:'domcontentloaded',timeout:15000});
 const region=page.getByRole('region',{name:'Rollenfortschritt-Karussell'}); await region.scrollIntoViewIfNeeded();
 await expect(region.locator('[data-focal-carousel-item]')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Nächste Rolle',exact:true})).toHaveCount(0);
 results.single=await page.evaluate(()=>{const a=document.querySelector('[data-role-card-state="active"]').getBoundingClientRect(),b=document.querySelector('[data-anime-project-stage]').getBoundingClientRect();return {roleX:a.x,animeX:b.x,roleWidth:a.width,animeWidth:b.width,rootWidth:document.documentElement.scrollWidth};});
 if(results.single.roleX!==results.single.animeX||results.single.roleWidth!==results.single.animeWidth)throw Error('single alignment');
 await page.goto('http://192.168.235.196:3000/members/qc',{waitUntil:'domcontentloaded',timeout:15000});
 await region.scrollIntoViewIfNeeded(); await expect(region).toHaveAttribute('data-interaction-enabled','true');
 const box=await region.boundingBox(); await page.mouse.move(box.x+box.width*.8,box.y+100); await page.mouse.down(); await page.mouse.move(box.x+box.width*.15,box.y+100,{steps:12}); await page.mouse.up();
 await expect(region.locator('[data-focal-carousel-item][aria-current="true"]')).toHaveAttribute('aria-label','Rolle 2 von 3');
 results.pointerDrag='passed';
 await region.press('Home'); await expect(region).toHaveAttribute('data-navigation-state','settled');
 await page.locator('[class*="groupList"]').evaluate(el=>{el.style.width='562px';});
 await page.locator('[data-role-card-state="active"] h3').evaluate(el=>{el.textContent='Qualitätsprüfung und abschließende Übersetzungskontrolle:';});
 results.longLabel=await page.locator('[data-role-card-state="active"] h3').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight}));
 if(results.longLabel.scrollWidth>results.longLabel.width)throw Error('label overflow');
 console.log(JSON.stringify(results));
}finally{await browser.close();}})();
