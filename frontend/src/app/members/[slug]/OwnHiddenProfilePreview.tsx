'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

import { Button, ErrorState, LoadingState } from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'
import { useMemberViewer } from '@/lib/useMemberViewer'

import { MemberProfileContent } from './MemberProfileContent'
import styles from './page.module.css'

const STORED_MEMBER_PATH = /^\/members\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/

function getStoredSlug(pathname: string): string | null {
  return STORED_MEMBER_PATH.exec(pathname)?.[1] ?? null
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
  // Client-seitig einmalig erfasster Referenzzeitpunkt (PMFE-09): via useState-Initializer
  // erfasst, damit der Wert ueber Re-Renders derselben aufgeloesten Vorschau stabil bleibt und
  // relative Zeitangaben ("vor 3 Tagen") nicht bei jedem Render neu Date.now() lesen. Diese
  // Vorschau ist vollstaendig client-gerendert -- kein SSR-Hydration-Mismatch-Risiko hier.
  const [referenceNow] = useState(() => Date.now())
  const slug = getStoredSlug(pathname)
  const hasAuthSession = hasAccessToken || hasRefreshToken

  // PMFE-02: einziger Owner-/Viewer-Resolver dieser Seite (siehe useMemberViewer.ts).
  const { status, response } = useMemberViewer(slug, {
    enabled: isClientInitialized && hasAuthSession,
    retryKey,
  })

  if (!isClientInitialized) {
    return <LoadingProfile />
  }

  if (!slug || !hasAuthSession) {
    return <UnavailableProfile />
  }

  if (status === 'loading') {
    return <LoadingProfile />
  }

  if (status === 'unavailable') {
    return <UnavailableProfile />
  }

  if (status === 'error') {
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

  if (!response || !response.viewer.is_owner) {
    return <UnavailableProfile />
  }

  return (
    <MemberProfileContent
      profile={response.data}
      storedSlug={slug}
      viewer={response.viewer}
      viewerResolved
      referenceNow={referenceNow}
    />
  )
}
