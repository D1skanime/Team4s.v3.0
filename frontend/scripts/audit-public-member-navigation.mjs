import { chromium } from 'playwright'
import fs from 'node:fs'
const root='/tmp/public-member-rca'
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const result={steps:[],responses:[],errors:[],crashes:[]}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Performance.enable')
 page.on('pageerror',e=>result.errors.push(e.message));page.on('crash',()=>result.crashes.push(Date.now()))
 cdp.on('Network.responseReceived',e=>result.responses.push({url:e.response.url,type:e.type,status:e.response.status,mime:e.response.mimeType}))
 await page.goto('http://127.0.0.1:3000/fansubs/new-subs',{waitUntil:'load'})
 await page.waitForTimeout(1800)
 result.groupMemberLinks=await page.locator('a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href')).filter(h=>h?.startsWith('/members/')))
 for(let i=0;i<12;i++){
  const slug=i%2?'kara':'timer',href='/members/'+slug
  if(!result.groupMemberLinks.includes(href))throw Error('No visible group navigation link for '+href)
  let start=Date.now()
  await page.locator('a[href="'+href+'"]').first().click()
  await page.waitForURL('**/members/'+slug);await page.getByRole('heading',{name:slug,exact:true}).waitFor()
  await page.waitForTimeout(700)
  const elapsed=Date.now()-start
  await cdp.send('HeapProfiler.collectGarbage')
  result.steps.push({i,route:href,elapsed,dom:await cdp.send('Memory.getDOMCounters'),metrics:await cdp.send('Performance.getMetrics')})
  await page.locator('a[href="/fansubs/new-subs"]').first().click()
  await page.waitForURL('**/fansubs/new-subs');await page.waitForTimeout(700)
 }
 await cdp.send('HeapProfiler.collectGarbage')
 result.final={dom:await cdp.send('Memory.getDOMCounters'),metrics:await cdp.send('Performance.getMetrics')}
} catch(e){result.failure=e.stack||String(e)}
finally{await browser.close();fs.writeFileSync(root+'/navigation.json',JSON.stringify(result,null,2));console.log('Navigation cycles:',result.steps.length,'errors:',result.errors,'failure:',result.failure)}
