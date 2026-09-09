import fs from 'node:fs'
import zlib from 'node:zlib'
// Strong-edge shortest retaining paths; not a dominator/retained-size analysis.
const root='/tmp/public-member-rca'
const reports={}
for(const stem of ['retention-dev-member','retention-dev-group','retention-production-diagnostic-member','retention-production-diagnostic-group','retention-production-eager-member','retention-production-no-auto-sizes-member']){
 const after=root+'/'+stem+'-after.heapsnapshot.gz'
 if(!fs.existsSync(after))continue
 const before=JSON.parse(zlib.gunzipSync(fs.readFileSync(root+'/'+stem+'-before.heapsnapshot.gz')))
 const oldIDs=new Set();const oldFields=before.snapshot.meta.node_fields
 for(let i=oldFields.indexOf('id');i<before.nodes.length;i+=oldFields.length)oldIDs.add(before.nodes[i])
 const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(after)))
 const nf=d.snapshot.meta.node_fields,ef=d.snapshot.meta.edge_fields,N=nf.length,E=ef.length,n=d.nodes.length/N
 const ni=Object.fromEntries(nf.map((v,i)=>[v,i])),ei=Object.fromEntries(ef.map((v,i)=>[v,i]))
 const nt=d.snapshot.meta.node_types[0],et=d.snapshot.meta.edge_types[0],names=d.strings
 const offsets=new Uint32Array(n+1)
 for(let i=0;i<n;i++)offsets[i+1]=offsets[i]+d.nodes[i*N+ni.edge_count]*E
 const parent=new Int32Array(n).fill(-1),via=new Int32Array(n).fill(-1),queue=new Uint32Array(n)
 let head=0,tail=1;queue[0]=0;parent[0]=0
 while(head<tail){
  const from=queue[head++]
  for(let e=offsets[from];e<offsets[from+1];e+=E){
   if(et[d.edges[e+ei.type]]==='weak')continue
   const to=d.edges[e+ei.to_node]/N
   if(parent[to]!==-1)continue
   parent[to]=from;via[to]=e;queue[tail++]=to
  }
 }
 const label=i=>({index:i,id:d.nodes[i*N+ni.id],type:nt[d.nodes[i*N+ni.type]],name:names[d.nodes[i*N+ni.name]],detachedness:d.nodes[i*N+ni.detachedness]})
 const path=i=>{
  const result=[]
  for(let count=0;i!==0&&i>=0&&count<60;count++){
   const e=via[i]
   const edgeType=e>=0?et[d.edges[e+ei.type]]:'unreachable'
   const edgeName=e>=0?(['element','hidden'].includes(edgeType)?d.edges[e+ei.name_or_index]:names[d.edges[e+ei.name_or_index]]):''
   result.unshift({...label(i),via:edgeType+':'+edgeName})
   i=parent[i]
  }
  return result
 }
 const candidates=[]
 for(let i=0;i<n;i++){
  const l=label(i)
  if(l.type==='native'&&/^<|HTML.*Element|HTMLDocument/.test(l.name)&&!oldIDs.has(l.id))candidates.push(i)
 }
 const byDetached={}
 for(const i of candidates){const v=d.nodes[i*N+ni.detachedness];byDetached[v]=(byDetached[v]||0)+1}
 const selected=[...candidates.filter(i=>d.nodes[i*N+ni.detachedness]===2).slice(0,8),...candidates.filter(i=>/^<div|HTMLDivElement/.test(label(i).name)).slice(0,8)]
 reports[stem]={nodes:n,strongReachable:tail,newNativeHTML:candidates.length,byDetached,paths:[...new Set(selected)].map(path)}
 console.log(stem,JSON.stringify({newNativeHTML:candidates.length,byDetached,example:reports[stem].paths[0]}))
}
fs.writeFileSync(root+'/retainers.json',JSON.stringify(reports,null,2))
