import {chromium} from 'playwright'
import fs from 'node:fs'
// Isolate native image retention without React, Next.js, application hooks or DOM handles.
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const results=[]
try{
 for(const mode of ['lazy-auto','lazy-fixed','eager-auto']){
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const cdp=await page.context().newCDPSession(page)
  await page.goto('about:blank')
  const samples=[]
  for(let i=0;i<12;i++){
   await page.evaluate(({mode,i})=>{
    const section=document.createElement('section')
    const img=document.createElement('img')
    img.width=256;img.height=256;img.loading=mode.startsWith('lazy')?'lazy':'eager'
    img.sizes=mode.endsWith('auto')?'auto, 256px':'256px'
    img.src='http://team4s-member-rca-prod:3105/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75'
    img.srcset=img.src+' 256w'
    section.append(img)
    for(let j=0;j<100;j++){const span=document.createElement('span');span.textContent='item-'+i+'-'+j;section.append(span)}
    document.body.append(section)
   },{mode,i})
   await page.waitForTimeout(200)
   const imageState=await page.evaluate(()=>({complete:document.images[0]?.complete,naturalWidth:document.images[0]?.naturalWidth}))
   await page.evaluate(()=>document.body.replaceChildren())
   await page.waitForTimeout(100)
   await cdp.send('HeapProfiler.collectGarbage')
   samples.push({cycle:i,...await cdp.send('Memory.getDOMCounters'),imageState})
  }
  results.push({mode,browser:browser.version(),samples});console.log(mode,JSON.stringify(samples))
  await page.close()
 }
}finally{await browser.close()}
fs.writeFileSync('/tmp/public-member-rca/native-auto-sizes.json',JSON.stringify(results,null,2))
