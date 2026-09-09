import { chromium } from 'playwright'
import fs from 'node:fs'
const root='/tmp/public-member-rca'
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
try {
 for(const route of ['members/timer','members/kara','fansubs/new-subs']){
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage(),cdp=await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular3g'})
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
  await page.addInitScript(()=>{
   window.__visibility={samples:[],changes:[]}
   const snapshot=()=>{
    const panels=[...document.querySelectorAll('[data-badge-skeleton],[class*="skeletonLayer"],[class*="projectSkeleton"]')].map(n=>{
     const r=n.getBoundingClientRect(),s=getComputedStyle(n)
     return {section:n.closest('section')?.querySelector('h2,h3')?.textContent,top:r.top,height:r.height,visibility:s.visibility,opacity:s.opacity,state:n.getAttribute('data-visible')}
    })
    window.__visibility.samples.push({at:performance.now(),h1:document.querySelector('h1')?.textContent,panels,images:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length})
   }
   new MutationObserver(ms=>{
    for(const m of ms)window.__visibility.changes.push({at:performance.now(),attribute:m.attributeName,value:m.target.getAttribute(m.attributeName),section:m.target.closest('section')?.querySelector('h2,h3')?.textContent})
   }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-visible','data-interaction-enabled']})
   setInterval(snapshot,500)
  })
  await page.goto('http://127.0.0.1:3000/'+route,{waitUntil:'load',timeout:120000})
  await page.waitForTimeout(1500)
  const beforeScroll=await page.evaluate(()=>performance.now())
  for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=500){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(120)}
  await page.waitForTimeout(1000)
  const d=await page.evaluate(()=>({...window.__visibility,navigation:performance.getEntriesByType('navigation')[0].toJSON()}))
  fs.writeFileSync(root+'/visibility-'+route.replaceAll('/','-')+'.json',JSON.stringify({...d,beforeScroll},null,2))
  console.log('Visibility',route,'load',d.navigation.loadEventEnd,'changes',JSON.stringify(d.changes))
  await context.close()
 }
}finally{await browser.close()}
