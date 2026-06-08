'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { getOwnProfile, resolveApiUrl } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

import { AppShell } from './AppShell'

interface WrapperProfile {
  displayName?: string
  email?: string
  avatarUrl?: string
  hasMemberProfile?: boolean
  memberships?: Array<{
    fansub_group_id: number
    fansub_group_name: string
    fansub_group_slug: string
  }>
  canAdmin?: boolean
}

export function AppShellClientWrapper({ children }: { children: ReactNode }) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const currentPath = usePathname()
  const [profile, setProfile] = useState<WrapperProfile | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!isClientInitialized || !hasAuthSession) {
      queueMicrotask(() => {
        if (!cancelled) {
          setProfile(null)
        }
      })
      return () => {
        cancelled = true
      }
    }

    getOwnProfile()
      .then((res) => {
        if (cancelled) {
          return
        }

        const d = res.data
        setProfile({
          displayName: d.account_display_name || d.fansub_name || undefined,
          email: d.email || undefined,
          avatarUrl: resolveApiUrl(d.avatar?.public_url || '') || undefined,
          hasMemberProfile: d.has_member_profile || d.member_id > 0,
          memberships: d.memberships ?? [],
          canAdmin: d.account_global_roles.includes('platform_admin') || d.account_global_roles.includes('admin'),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isClientInitialized, hasAuthSession])

  const activeProfile = hasAuthSession ? profile : null
  const shellUser = activeProfile
    ? {
        displayName: activeProfile.displayName,
        email: activeProfile.email,
        avatarUrl: activeProfile.avatarUrl,
      }
    : null

  return (
    <AppShell
      mode={hasAuthSession ? 'authenticated' : 'anonymous'}
      currentPath={currentPath ?? undefined}
      user={shellUser}
      memberships={activeProfile?.memberships ?? []}
      canAccessAdmin={activeProfile?.canAdmin ?? false}
      hasMemberProfile={activeProfile?.hasMemberProfile ?? false}
    >
      {children}
    </AppShell>
  )
}
