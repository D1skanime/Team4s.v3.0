'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ContributionInbox } from '@/components/contributions/ContributionInbox'
import { ContributionSummary } from '@/components/contributions/ContributionSummary'
import { MyContributionsSection } from '@/components/contributions/MyContributionsSection'
import { MyProposalsSection } from '@/components/contributions/MyProposalsSection'
import { RejectReasonModal } from '@/components/contributions/RejectReasonModal'
import { ReportModal } from '@/components/contributions/ReportModal'
import type { SuggestionType } from '@/components/contributions/ReportModal'
import {
  applyFilters,
  EMPTY_FILTER_STATE,
  type ContributionFilterState,
} from '@/components/contributions/ContributionFilters'
import { Button, ErrorState, LoadingState } from '@/components/ui'
import {
  ApiError,
  confirmAnimeContribution,
  getMyAnimeContributions,
  rejectAnimeContributionWithReason,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution } from '@/types/contributions'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export default function MyContributionsPage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()

  // Kern-Datenzustand
  const [contributions, setContributions] = useState<MeAnimeContribution[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter-State für D-11/D-12
  const [activeFilters, setActiveFilters] = useState<ContributionFilterState>(EMPTY_FILTER_STATE)

  // Overlay-State: RejectReasonModal
  const [rejectModalOpenId, setRejectModalOpenId] = useState<number | null>(null)

  // Overlay-State: ReportModal
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportPrefillType, setReportPrefillType] = useState<SuggestionType | null>(null)
  const [reportPrefillId, setReportPrefillId] = useState<number | null>(null)

  const hasAuthSession = hasAccessToken || hasRefreshToken

  // Einmaliger Lade-Callback (D-11: kein zweiter API-Call für Filterung)
  const reload = useCallback(async () => {
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
      setContributions(response.data)
    } catch (loadError) {
      setError(readErrorMessage(loadError, 'Beiträge konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [hasAuthSession, isClientInitialized])

  useEffect(() => {
    void reload()
  }, [reload])

  // useMemo-Filter (D-11): Mitwirkungen-Liste (confirmed) gefiltert
  const filteredContributions = useMemo(() => {
    if (!contributions) return []
    const predicate = applyFilters(activeFilters)
    return contributions.filter((c) => c.status === 'confirmed' && predicate(c))
  }, [contributions, activeFilters])

  // useMemo-Filter (D-11): Vorschläge-Liste (eigene: is_own_proposal) gefiltert
  const filteredProposals = useMemo(() => {
    if (!contributions) return []
    const predicate = applyFilters(activeFilters)
    return contributions.filter((c) => c.is_own_proposal && predicate(c))
  }, [contributions, activeFilters])

  // Handler: Bestätigen (D-08)
  async function handleConfirm(id: number) {
    try {
      await confirmAnimeContribution(id)
      await reload()
    } catch {
      // Fehler sind sichtbar im Netzwerk-Tab; kein persistenter Error-State nötig
    }
  }

  // Handler: RejectReasonModal öffnen (D-09)
  function openRejectModal(id: number) {
    setRejectModalOpenId(id)
  }

  // Handler: Ablehnen mit Begründung (D-09) — wird von RejectReasonModal aufgerufen
  async function handleRejectWithReason(id: number, reason: string) {
    await rejectAnimeContributionWithReason(id, reason)
    await reload()
  }

  // Handler: Sichtbarkeit in MyContributionsSection aktualisieren (optimistisch)
  function handleVisibilityChange(id: number, isPublic: boolean) {
    setContributions((prev) =>
      prev
        ? prev.map((c) => (c.id === id ? { ...c, is_public_on_member_profile: isPublic } : c))
        : prev,
    )
  }

  // Handler: ReportModal öffnen — allgemeiner „Vorschlagen / Melden"-Button (D-04/D-05)
  function openReportModal() {
    setReportPrefillType(null)
    setReportPrefillId(null)
    setReportModalOpen(true)
  }

  // Handler: ReportModal öffnen vorbefüllt für „Details korrigieren" (D-10)
  function openCorrectModal(id: number) {
    setReportPrefillType('fehler')
    setReportPrefillId(id)
    setReportModalOpen(true)
  }

  if (!isClientInitialized || isLoading) {
    return <LoadingState title="Beiträge werden geladen" description="Team4s lädt deine Beiträge." />
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
      {/* Header-Zeile mit Titel und primärem Aktions-Button (D-02) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Meine Beiträge</h1>
        <Button
          variant="primary"
          size="md"
          onClick={openReportModal}
          aria-label="Vorschlagen oder melden öffnen"
        >
          Vorschlagen / Melden
        </Button>
      </div>

      {/* Sektionen in verbindlicher Reihenfolge D-02:
          ContributionInbox → ContributionSummary → Mitwirkungen-Liste → Vorschläge-Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* 1. Klärungs-Inbox (D-03) */}
        <ContributionInbox
          contributions={contributions}
          onConfirm={(id) => void handleConfirm(id)}
          onRejectWithReason={openRejectModal}
          onCorrect={openCorrectModal}
          onVisibilityChange={handleVisibilityChange}
        />

        {/* 2. Überblick & Filter mit Stat-Chips (D-12) */}
        <ContributionSummary
          contributions={contributions}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
        />

        {/* 3. Bestätigte Mitwirkungen — gefiltert (D-11) */}
        <MyContributionsSection
          contributions={filteredContributions}
          onVisibilityChange={handleVisibilityChange}
        />

        {/* 4. Eigene Vorschläge — gefiltert (D-11) */}
        <MyProposalsSection proposals={filteredProposals} onReload={() => void reload()} />
      </div>

      {/* Overlays */}
      <RejectReasonModal
        open={rejectModalOpenId !== null}
        contributionId={rejectModalOpenId}
        onClose={() => setRejectModalOpenId(null)}
        onConfirm={handleRejectWithReason}
      />
      <ReportModal
        open={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false)
          setReportPrefillType(null)
          setReportPrefillId(null)
        }}
        onSuccess={() => void reload()}
        prefillType={reportPrefillType ?? undefined}
        prefillContributionId={reportPrefillId ?? undefined}
      />
    </main>
  )
}
