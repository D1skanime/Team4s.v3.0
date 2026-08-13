'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PencilLine } from 'lucide-react'

import { CorrectionReportModal } from '@/components/profile/CorrectionReportModal'
import { getMemberProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicMemberViewer } from '@/types/profile'

import styles from './page.module.css'

type OwnProfileEditLinkProps = {
  storedSlug: string
  publicMemberId: number
  memberName: string
  initialViewer: PublicMemberViewer
  viewerResolved?: boolean
}

type ViewerResolution =
  | { key: string; status: 'resolved'; viewer: PublicMemberViewer }
  | { key: string; status: 'unavailable' }

export function OwnProfileEditLink({
  storedSlug,
  publicMemberId,
  memberName,
  initialViewer,
  viewerResolved = false,
}: OwnProfileEditLinkProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [resolution, setResolution] = useState<ViewerResolution | null>(null)
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const requestKey = [storedSlug, hasAuthSession].join(':')

  useEffect(() => {
    if (!isClientInitialized || viewerResolved || !hasAuthSession) return

    let active = true
    void getMemberProfile(storedSlug)
      .then((response) => {
        if (active) {
          setResolution({
            key: requestKey,
            status: 'resolved',
            viewer: response.viewer,
          })
        }
      })
      .catch(() => {
        if (active) {
          setResolution({ key: requestKey, status: 'unavailable' })
        }
      })

    return () => {
      active = false
    }
  }, [hasAuthSession, isClientInitialized, requestKey, storedSlug, viewerResolved])

  if (!isClientInitialized) return null

  const viewer = viewerResolved
    ? initialViewer
    : !hasAuthSession
      ? initialViewer
      : resolution?.key === requestKey && resolution.status === 'resolved'
        ? resolution.viewer
        : null

  if (!viewer) return null

  if (viewer.is_owner) {
    return (
      <Link href="/me/profile" className={styles.editProfileLink}>
        <PencilLine size={16} aria-hidden="true" />
        Profil bearbeiten
      </Link>
    )
  }

  return (
    <CorrectionReportModal
      memberId={publicMemberId}
      memberName={memberName}
    />
  )
}