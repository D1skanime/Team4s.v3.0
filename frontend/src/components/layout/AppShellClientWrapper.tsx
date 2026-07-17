'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { RotateCw } from 'lucide-react'

import { Button } from '@/components/ui'
import { ApiError, getOwnProfile, resolveApiUrl } from '@/lib/api'
import { useAuthSession, useLogoutAuthSession } from '@/lib/useAuthSession'

import { AppShell } from './AppShell'
import styles from './AppShellClientWrapper.module.css'

interface WrapperProfile {
  displayName?: string
  email?: string
  avatarUrl?: string
  hasMemberProfile?: boolean
  hasProjectAssignments?: boolean
  memberships?: Array<{
    fansub_group_id: number
    fansub_group_name: string
    fansub_group_slug: string
  }>
  canAdmin?: boolean
}

function readProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Accountdaten konnten nicht geladen werden.'
}

/**
 * Sichtbare, unaufdringliche Fehleranzeige wenn die aktive Session besteht,
 * aber der Team4s-Account-Aggregat für die Navigation nicht geladen werden
 * konnte (D-19). Bietet "Erneut versuchen" direkt hier; "Abmelden" bleibt
 * die bereits zentrale Drawer-Footer-Aktion — es erscheint nie ein
 * "Anmelden"-Aufruf für eine aktive Session.
 */
function ProfileLoadErrorBanner({
  message,
  isRetrying,
  onRetry,
  onLogout,
}: {
  message: string
  isRetrying: boolean
  onRetry: () => void
  onLogout: () => void
}) {
  return (
    <div className={styles.profileErrorBanner} role="alert">
      <p className={styles.profileErrorText}>
        Deine Anmeldung ist aktiv, aber deine Accountdaten konnten nicht geladen werden. {message}
      </p>
      <div className={styles.profileErrorActions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={isRetrying}
          leftIcon={<RotateCw size={16} aria-hidden="true" />}
          onClick={onRetry}
        >
          Erneut versuchen
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
          Abmelden
        </Button>
      </div>
    </div>
  )
}

export function AppShellClientWrapper({ children }: { children: ReactNode }) {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const logoutActiveSession = useLogoutAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const currentPath = usePathname()
  const [profile, setProfile] = useState<WrapperProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!isClientInitialized || !hasAuthSession) {
      queueMicrotask(() => {
        if (!cancelled) {
          setProfile(null)
          setProfileError(null)
        }
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setProfileError(null)
      }
    })

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
          hasProjectAssignments: Boolean(d.has_project_assignments),
          memberships: d.memberships ?? [],
          canAdmin: d.account_global_roles.includes('platform_admin') || d.account_global_roles.includes('admin'),
        })
        setProfileError(null)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setProfile(null)
        setProfileError(readProfileErrorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [isClientInitialized, hasAuthSession, retryToken])

  const handleRetry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  const handleLogout = useCallback(() => {
    void logoutActiveSession().catch(() => undefined)
  }, [logoutActiveSession])

  // D-18: während Session-Initialisierung, Refresh oder Account-/Profil-Laden
  // erscheint ein einheitlicher neutraler Ladezustand — weder das Login-Formular
  // noch die fertige Accountnavigation dürfen dabei widersprüchlich gleichzeitig
  // sichtbar sein.
  const isProfileLoading = isClientInitialized && hasAuthSession && profile === null && profileError === null
  const isNeutralLoading = !isClientInitialized || isProfileLoading
  const isProfileError = isClientInitialized && hasAuthSession && profileError !== null

  const activeProfile = hasAuthSession ? profile : null
  const shellUser = activeProfile
    ? {
        displayName: activeProfile.displayName,
        email: activeProfile.email,
        avatarUrl: activeProfile.avatarUrl,
      }
    : null

  const shellMode = isNeutralLoading ? 'loading' : hasAuthSession ? 'authenticated' : 'anonymous'

  return (
    <AppShell
      mode={shellMode}
      currentPath={currentPath ?? undefined}
      user={shellUser}
      memberships={activeProfile?.memberships ?? []}
      canAccessAdmin={activeProfile?.canAdmin ?? false}
      hasMemberProfile={activeProfile?.hasMemberProfile ?? false}
      hasProjectAssignments={activeProfile?.hasProjectAssignments ?? false}
    >
      {isProfileError && profileError ? (
        <ProfileLoadErrorBanner
          message={profileError}
          isRetrying={isProfileLoading}
          onRetry={handleRetry}
          onLogout={handleLogout}
        />
      ) : null}
      {children}
    </AppShell>
  )
}
