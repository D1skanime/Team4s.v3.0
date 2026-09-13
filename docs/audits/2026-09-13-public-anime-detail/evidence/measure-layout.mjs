// Read-only audit probe. Run via stdin in the existing frontend container.
import http from 'node:http';
import { chromium } from 'playwright';
const proxy=http.createServer((req,res)=>{const p=http.request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:3000'}},s=>{res.writeHead(s.statusCode,s.headers);s.pipe(res)});p.on('error',()=>res.end());req.pipe(p)});
await new Promise(resolve=>proxy.listen(3300,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try {
 for(const width of [390,1440]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3300/anime/1',{waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>{
   const info=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,class:e.className,text:e.textContent?.trim().slice(0,70),x:r.x,right:r.right,width:r.width,color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,overflowX:s.overflowX,position:s.position,transform:s.transform}};
   const title=document.querySelector('[class*="summaryLine"]');
   const ancestors=[]; for(let e=title;e;e=e.parentElement)ancestors.push(info(e));
   const outliers=[...document.querySelectorAll('main *,[class*="banner"]')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,20).map(info);
   const headings=[...document.querySelectorAll('h2')].map(info);
   const video=[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,autoplay:v.autoplay,preload:v.preload,muted:v.muted,paused:v.paused,readyState:v.readyState}));
   const cover=document.querySelector('img[alt="Buddy Complex"]');
   return {width:innerWidth,documentClient:document.documentElement.clientWidth,documentScroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,ancestors,outliers,headings,video,cover:cover?{...info(cover),naturalWidth:cover.naturalWidth,naturalHeight:cover.naturalHeight}:null};
  });
  await page.evaluate(()=>window.scrollTo(100,0));
  geometry.horizontalScrollAfterProbe=await page.evaluate(()=>window.scrollX);
  results.push(geometry);await context.close();
 }
 console.log(JSON.stringify({measuredAt:new Date().toISOString(),results},null,2));
}finally{await browser.close();await new Promise(resolve=>proxy.close(resolve));}
