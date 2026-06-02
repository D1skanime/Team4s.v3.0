'use client'

import { useEffect, useState } from 'react'

import { MyContributionsSection } from '@/components/contributions/MyContributionsSection'
import { MyProposalsSection } from '@/components/contributions/MyProposalsSection'
import { Button, ErrorState, LoadingState } from '@/components/ui'
import { ApiError, getMyAnimeContributions } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution } from '@/types/contributions'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export default function MyContributionsPage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [contributions, setContributions] = useState<MeAnimeContribution[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasAuthSession = hasAccessToken || hasRefreshToken

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isClientInitialized) return
      if (!hasAuthSession) {
        setError('Bitte einloggen.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await getMyAnimeContributions()
        if (!cancelled) setContributions(response.data)
      } catch (loadError) {
        if (!cancelled) setError(readErrorMessage(loadError, 'Beiträge konnten nicht geladen werden.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [hasAuthSession, isClientInitialized])

  if (!isClientInitialized || isLoading) {
    return <LoadingState title="Beiträge werden geladen" description="Team4s lädt deine Contributions." />
  }

  if (error || !contributions) {
    return (
      <ErrorState
        title={hasAuthSession ? 'Beiträge konnten nicht geladen werden' : 'Anmeldung erforderlich'}
        description={error ?? 'Unbekannter Fehler'}
        action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
      />
    )
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Meine Beiträge</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        <MyContributionsSection initialContributions={contributions} />
        <MyProposalsSection />
      </div>
    </main>
  )
}
