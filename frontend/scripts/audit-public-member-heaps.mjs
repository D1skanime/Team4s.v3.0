import fs from 'node:fs'
import zlib from 'node:zlib'
const root='/tmp/public-member-rca'
const result={}
for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.heapsnapshot.gz'))){
 const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(root+'/'+file)))
 const fields=d.snapshot.meta.node_fields
 const stride=fields.length, names=d.strings, types=d.snapshot.meta.node_types[0]
 const ix=Object.fromEntries(fields.map((v,i)=>[v,i]))
 const byName={}, byType={}
 let detached=0,attached=0,unknown=0,fibers=0,fiberSelfBytes=0,domNative=0
 for(let offset=0;offset<d.nodes.length;offset+=stride){
  const type=types[d.nodes[offset+ix.type]],name=names[d.nodes[offset+ix.name]],size=d.nodes[offset+ix.self_size]
  byType[type]=(byType[type]||0)+1
  if(name==='FiberNode'&&type==='object'){fibers++;fiberSelfBytes+=size}
  if(type==='native'&&/^<|^(?:HTMLDocument|Document|Text|Comment)$|^SVG.*Element$/.test(name)){
   domNative++
   const value=d.nodes[offset+ix.detachedness]
   if(value===2)detached++;else if(value===1)attached++;else unknown++
  }
  if(type==='object'||type==='native'){
   const key=type+':'+name
   byName[key]??={count:0,selfBytes:0};byName[key].count++;byName[key].selfBytes+=size
  }
 }
 result[file]={nodes:d.snapshot.node_count,edges:d.snapshot.edge_count,byType,fibers,fiberSelfBytes,domNative,detached,attached,unknown,
  largestSelf:Object.entries(byName).sort((a,b)=>b[1].selfBytes-a[1].selfBytes).slice(0,30)}
 console.log(file,JSON.stringify({fibers,domNative,detached,attached,unknown}))
}
fs.writeFileSync(root+'/heaps.json',JSON.stringify(result,null,2))
