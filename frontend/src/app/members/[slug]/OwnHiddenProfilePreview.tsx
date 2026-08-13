'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { Button, ErrorState, LoadingState } from '@/components/ui'
import { ApiError, getMemberProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicMemberProfileResponse } from '@/types/profile'

import { MemberProfileContent } from './MemberProfileContent'
import styles from './page.module.css'

const STORED_MEMBER_PATH = /^\/members\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/

type PreviewState =
  | { key: string; status: 'loading' }
  | { key: string; status: 'unavailable' }
  | { key: string; status: 'error' }
  | { key: string; status: 'owner'; response: PublicMemberProfileResponse }

function getStoredSlug(pathname: string): string | null {
  return STORED_MEMBER_PATH.exec(pathname)?.[1] ?? null
}

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404
  return (
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: unknown }).status === 404
  )
}

function LoadingProfile() {
  return (
    <main className={styles.page}>
      <div className={styles.stateRegion} role="status" aria-live="polite">
        <LoadingState
          title="Profil wird geladen."
          description="Team4s prüft, ob dieses Profil angezeigt werden kann."
        />
      </div>
    </main>
  )
}

function UnavailableProfile() {
  return (
    <main className={styles.page}>
      <section className={styles.errorBox}>
        <h1>Profil nicht verfügbar</h1>
        <p>
          Dieses Profil ist nicht verfügbar. Prüfe den Link oder kehre zur
          Anime-Übersicht zurück.
        </p>
        <Button href="/anime" variant="secondary">
          Zur Anime-Übersicht
        </Button>
      </section>
    </main>
  )
}

export function OwnHiddenProfilePreview() {
  const pathname = usePathname()
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState<PreviewState>({ key: '', status: 'loading' })
  const slug = getStoredSlug(pathname)
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const requestKey = [slug ?? '', isClientInitialized, hasAuthSession, retryKey].join(':')

  useEffect(() => {
    if (!isClientInitialized || !slug || !hasAuthSession) return

    let active = true

    void getMemberProfile(slug)
      .then((response) => {
        if (!active) return
        setState(
          response.viewer.is_owner
            ? { key: requestKey, status: 'owner', response }
            : { key: requestKey, status: 'unavailable' },
        )
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          key: requestKey,
          status: isNotFoundError(error) ? 'unavailable' : 'error',
        })
      })

    return () => {
      active = false
    }
  }, [hasAuthSession, isClientInitialized, requestKey, slug])

  if (!isClientInitialized) {
    return <LoadingProfile />
  }

  if (!slug || !hasAuthSession) {
    return <UnavailableProfile />
  }

  if (state.key !== requestKey || state.status === 'loading') {
    return <LoadingProfile />
  }

  if (state.status === 'unavailable') {
    return <UnavailableProfile />
  }

  if (state.status === 'error') {
    return (
      <main className={styles.page}>
        <div className={styles.stateRegion}>
          <ErrorState
            title="Profil konnte nicht geladen werden"
            description="Bitte versuche es später erneut."
            action={(
              <Button variant="secondary" onClick={() => setRetryKey((value) => value + 1)}>
                Erneut versuchen
              </Button>
            )}
          />
        </div>
      </main>
    )
  }

  return (
    <MemberProfileContent
      profile={state.response.data}
      storedSlug={slug}
      viewer={state.response.viewer}
    />
  )
}