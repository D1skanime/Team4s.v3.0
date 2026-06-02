'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PencilLine } from 'lucide-react'

import { getOwnProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

import styles from './page.module.css'

type OwnProfileEditLinkProps = {
  publicMemberId: number
}

export function OwnProfileEditLink({ publicMemberId }: OwnProfileEditLinkProps) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [ownMemberId, setOwnMemberId] = useState<number | null>(null)
  const hasAuthSession = hasAccessToken || hasRefreshToken

  useEffect(() => {
    if (!isClientInitialized || !hasAuthSession) return

    let active = true
    getOwnProfile()
      .then((response) => {
        if (active) setOwnMemberId(response.data.member_id)
      })
      .catch(() => {
        if (active) setOwnMemberId(null)
      })

    return () => {
      active = false
    }
  }, [hasAuthSession, isClientInitialized])

  if (!hasAuthSession || ownMemberId !== publicMemberId) return null

  return (
    <Link href="/me/profile" className={styles.editProfileLink}>
      <PencilLine size={16} aria-hidden="true" />
      Profil bearbeiten
    </Link>
  )
}
