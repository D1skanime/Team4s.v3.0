#!/usr/bin/env python3
"""Run temporary independent experiments and always restore owned source bytes."""
import json, os, signal, subprocess, urllib.request
from pathlib import Path

ROOT=Path('/home/d1sk/team4s')
os.chdir(ROOT)
base=Path('frontend/src')
def source(rel): return base/rel
paths=[
 'components/profile/MemberStorySection.tsx','components/profile/MemberBadgeChain.tsx',
 'components/ui/FocalCarousel.tsx','components/profile/MemberCurrentProjectsSection.tsx',
 'components/profile/LatestContributionsSection.tsx','components/profile/PreviousContributionsSection.tsx',
 'app/members/[slug]/MemberProfileContent.tsx','app/members/[slug]/not-found.tsx'
]
original={p:source(p).read_text() for p in paths}
backup=Path('docs/audits/2026-09-09-public-member-performance/source-backup.json')
if backup.exists(): raise SystemExit('An existing backup must be reviewed/restored first.')
backup.write_text(json.dumps(original))
def restore():
 for p,s in original.items():
  if source(p).read_text()!=s:source(p).write_text(s)
def stop(*_):raise KeyboardInterrupt()
signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGHUP,stop)
def stub(name):return "'use client'\nexport function "+name+"(_props: any) { return null }\n"
static="""'use client'
import { useId } from 'react'
import { CollapsedCarousel, positionOwnedItem, type FocalCarouselProps, type CollapsedTrackHandlers } from './FocalCarouselInternals'
export type { FocalCarouselItemState } from './FocalCarouselInternals'
const noop = () => {}
export function FocalCarousel<T>(props: FocalCarouselProps<T>) {
 const id=useId()
 const items=props.carouselItems??props.items
 if(!items.length)return null
 return <CollapsedCarousel {...props} items={items} activationRef={null}
 trackRef={node=>{if(node)positionOwnedItem(node,0)}} gridId={id} toggleId={id+'-toggle'}
 activeIndex={0} lastIndex={items.length-1} quiet={items.length===1}
 interactionEnabled={false} isNavigating={false} showAll={noop}
 onPrevious={noop} onNext={noop} trackHandlers={{} as CollapsedTrackHandlers} />
}
"""
header="""import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { resolveApiUrl } from '@/lib/api'
import styles from './page.module.css'
export function MemberProfileContent({profile}: any) {
 return <main className={styles.page}><section className={styles.section}><MemberProfileHero
 profile={profile} avatarURL={resolveApiUrl(profile.avatar?.public_url||'')}
 backgroundImageURL={resolveApiUrl(profile.background_image?.public_url||'')}
 isPublicView isVerified={profile.is_verified} publicBadges={profile.public_badges??[]} /></section></main>
}
"""
variants=[
 ('baseline-repeat',{}),
 ('A-story-removed', {paths[0]:stub('MemberStorySection')}),
 ('A2-renderer-direct',{paths[0]:original[paths[0]].replace("from '@/components/editor'","from '@/components/editor/RichTextRenderer'")}),
 ('B-badges-removed',{paths[1]:stub('MemberBadgeChain')}),
 ('C-carousel-static',{paths[2]:static}),
 ('D-projects-removed',{paths[3]:stub('MemberCurrentProjectsSection')}),
 ('E-contributions-removed',{paths[4]:stub('LatestContributionsSection'),paths[5]:stub('PreviousContributionsSection')}),
 ('F-images-disabled',{}),
 ('G-header-only',{paths[6]:header}),
 ('H-neutral-not-found',{paths[7]:"export default function MemberProfileNotFound() { return <main><h1>Profil nicht verfügbar</h1></main> }\n"}),
]
try:
 for label,changes in variants:
  restore()
  for p,s in changes.items():source(p).write_text(s)
  for slug in ['timer','kara']:
   with urllib.request.urlopen('http://127.0.0.1:3000/members/'+slug,timeout=120) as r:r.read()
  print('VARIANT '+label,flush=True)
  env=['-e','AUDIT_LABEL='+label,'-e','AUDIT_REPEATS=2','-e','AUDIT_ROUTES=members/timer,members/kara']
  if label=='F-images-disabled':env+=['-e','AUDIT_NO_IMAGES=1']
  subprocess.run(['docker','compose','exec','-T',*env,'team4sv30-frontend','node','scripts/audit-public-member-performance.mjs'],check=True,stdin=subprocess.DEVNULL)
  subprocess.run(['docker','compose','exec','-T','-e','AUDIT_LABEL='+label,'team4sv30-frontend','node','scripts/audit-public-member-bundles.mjs'],check=True,stdin=subprocess.DEVNULL)
finally:
 restore()
 backup.unlink()
 print('All original product source restored.',flush=True)
