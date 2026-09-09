import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
const root='.next/dev/static/chunks/'
const result={}
for(const name of ['main-app.js','app/layout.js','app/members/[slug]/page.js','app/members/[slug]/not-found.js','app/fansubs/[slug]/page.js']){
 let raw;try{raw=readFileSync(root+name,'utf8')}catch{continue}
 const matches=[...raw.matchAll(/^\/\*\*\*\/ "([^"]+)":/gm)]
 const modules=matches.map((m,i)=>{
  const code=raw.slice(m.index,matches[i+1]?.index||raw.length)
  const sourceMaps=[...code.matchAll(/sourceMappingURL=data:application\/json;charset=utf-8;base64,([a-zA-Z0-9+/=]+)/g)].reduce((n,m)=>n+m[1].length,0)
  let category='other'
  const id=m[1]
  if(id.includes('/@tiptap/'))category='tiptap'
  else if(id.includes('/prosemirror-'))category='prosemirror'
  else if(id.includes('/lucide-react/'))category='lucide'
  else if(id.includes('/components/editor/'))category='editor'
  else if(id.includes('FocalCarousel'))category='carousel'
  else if(id.includes('/components/profile/'))category='profile'
  else if(id.includes('/lib/api'))category='api'
  else if(id.includes('/admin/')||id.includes('Edit')||id.includes('CorrectionReport'))category='edit-admin'
  else if(id.includes('/node_modules/next/'))category='next'
  return {id,category,bytes:Buffer.byteLength(code),sourceMapBase64Bytes:sourceMaps,gzipStandalone:gzipSync(code).length}
 })
 const categories={}
 for(const m of modules){categories[m.category]??={modules:0,bytes:0,sourceMapBase64Bytes:0};categories[m.category].modules++;categories[m.category].bytes+=m.bytes;categories[m.category].sourceMapBase64Bytes+=m.sourceMapBase64Bytes}
 result[name]={bytes:Buffer.byteLength(raw),gzip:gzipSync(raw).length,categories,modules}
}
const path='/tmp/public-member-rca/'+(process.env.AUDIT_LABEL||'baseline')+'-bundles.json'
writeFileSync(path,JSON.stringify(result,null,2))
console.log('Bundle evidence: '+path)
