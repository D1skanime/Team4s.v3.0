'use client'

import Link from 'next/link'
import { PencilLine } from 'lucide-react'

import { CorrectionReportModal } from '@/components/profile/CorrectionReportModal'
import { useAuthSession } from '@/lib/useAuthSession'
import { useMemberViewer } from '@/lib/useMemberViewer'
import type { PublicMemberViewer } from '@/types/profile'

import styles from './page.module.css'

type OwnProfileEditLinkProps = {
  storedSlug: string
  publicMemberId: number
  memberName: string
  initialViewer: PublicMemberViewer
  viewerResolved?: boolean
}

export function OwnProfileEditLink({
  storedSlug,
  publicMemberId,
  memberName,
  initialViewer,
  viewerResolved = false,
}: OwnProfileEditLinkProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken

  // PMFE-02: einziger Owner-/Viewer-Resolver dieser Seite (siehe useMemberViewer.ts). Ist der
  // Viewer bereits über die SSR/Owner-Vorschau bekannt (`viewerResolved`), wird gar nicht erst
  // gefetcht.
  const { status, response } = useMemberViewer(storedSlug, {
    enabled: isClientInitialized && !viewerResolved && hasAuthSession,
  })

  if (!isClientInitialized) return null

  const viewer = viewerResolved
    ? initialViewer
    : !hasAuthSession
      ? initialViewer
      : status === 'resolved' && response
        ? response.viewer
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
