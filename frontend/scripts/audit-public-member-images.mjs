import fs from 'node:fs'
import sharp from 'sharp'
const root='/tmp/public-member-rca'
const results=[]
for(const name of ['baseline-members-timer-0-cold','baseline-members-kara-0-cold','baseline-fansubs-new-subs-0-cold']){
 const d=JSON.parse(fs.readFileSync(root+'/'+name+'.json'))
 for(const r of d.requests.filter(r=>r.type==='Image')){
  const request=new URL(r.url)
  const source=request.pathname==='/_next/image'?request.searchParams.get('url'):r.url
  const parsed=new URL(source,d.base)
  let path=parsed.pathname.startsWith('/member-achievement-badges/')||parsed.pathname.startsWith('/history-event-badges-transparent/')?'/app/public'+parsed.pathname:parsed.pathname.startsWith('/api/v1/media/')?'/media/'+parsed.pathname.slice('/api/v1/media/'.length):parsed.pathname.startsWith('/media/')?parsed.pathname:null
  let meta=null,bytes=null,error=null
  try{
   if(path&&fs.existsSync(path)){bytes=fs.statSync(path).size;const m=await sharp(path).metadata();meta={format:m.format,width:m.width,height:m.height,pages:m.pages||1}}
  }catch(e){error=String(e)}
  const image=d.images.find(i=>i.currentSrc===r.url||i.src===r.url)
  results.push({case:name,source,path,sourceBytes:bytes,sourceMetadata:meta,error,
   request:r.url,status:r.status,deliveredFormat:r.mime,transferred:r.transferred,decodedBody:r.decoded,
   nextImage:request.pathname==='/_next/image',nextCache:r.headers?.['x-nextjs-cache'],
   rendered:image?{width:image.width,height:image.height}:null,
   loading:image?.loading,decoding:image?.decoding,fetchPriority:image?.fetchPriority,
   badgeCode:image?.slot,initialElement:!!image,
   note:image?null:'Requested variant no longer selected at final DOM sample; see same asset at another optimizer width.'})
 }
}
fs.writeFileSync(root+'/images.json',JSON.stringify(results,null,2))
console.log('Image audit:',results.length,'actual requests')
