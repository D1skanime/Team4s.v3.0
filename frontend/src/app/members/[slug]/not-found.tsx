'use client'

import dynamic from 'next/dynamic'

import { LoadingState } from '@/components/ui'

// PMFE (Phase 153, Plan 03): this route segment renders exclusively a client
// component (OwnHiddenProfilePreview), so marking the segment itself
// 'use client' loses no server-rendered content. next/dynamic({ ssr: false })
// gives it a real code-split loading boundary so its bundle is no longer part
// of the successful public profile route's initial chunk (RCA-02, second half).
const OwnHiddenProfilePreview = dynamic(
  () => import('./OwnHiddenProfilePreview').then((mod) => mod.OwnHiddenProfilePreview),
  {
    ssr: false,
    loading: () => <LoadingState title="Profil wird geprüft." />,
  },
)

export default function MemberProfileNotFound() {
  return <OwnHiddenProfilePreview />
}