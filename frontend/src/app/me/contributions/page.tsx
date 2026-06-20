'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ContributionInbox } from '@/components/contributions/ContributionInbox'
import { ContributionSummary } from '@/components/contributions/ContributionSummary'
import {
  applyFilters,
  EMPTY_FILTER_STATE,
  type ContributionFilterState,
} from '@/components/contributions/ContributionFilters'
import { ANIME_CONTRIBUTION_ROLES } from '@/components/contributions/contributionRoles'
import styles from '@/components/contributions/contributions.module.css'
import { MyContributionsSection } from '@/components/contributions/MyContributionsSection'
import { MyProposalsSection } from '@/components/contributions/MyProposalsSection'
import { RejectReasonModal } from '@/components/contributions/RejectReasonModal'
import { ReportModal } from '@/components/contributions/ReportModal'
import type { SuggestionType } from '@/components/contributions/ReportModal'
import { buildReportTargetOptions } from '@/components/contributions/reportTargets'
import { Button, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import {
  ApiError,
  confirmAnimeContribution,
  getMyAnimeContributions,
  getMyMemberships,
  rejectAnimeContributionWithReason,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export default function MyContributionsPage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [contributions, setContributions] = useState<MeAnimeContribution[] | null>(null)
  const [ownGroups, setOwnGroups] = useState<MembershipEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<ContributionFilterState>(EMPTY_FILTER_STATE)
  const [rejectModalOpenId, setRejectModalOpenId] = useState<number | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportPrefillType, setReportPrefillType] = useState<SuggestionType | null>(null)
  const [reportPrefillId, setReportPrefillId] = useState<number | null>(null)

  const hasAuthSession = hasAccessToken || hasRefreshToken

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
      const [response, membershipsResponse] = await Promise.all([
        getMyAnimeContributions(),
        getMyMemberships().catch(() => ({ data: [] as MembershipEntry[] })),
      ])
      setContributions(response.data)
      setOwnGroups(membershipsResponse.data)
    } catch (loadError) {
      setError(readErrorMessage(loadError, 'Projekt-Hinweise konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [hasAuthSession, isClientInitialized])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredContributions = useMemo(() => {
    if (!contributions) return []
    const predicate = applyFilters(activeFilters)
    return contributions.filter((contribution) => contribution.status === 'confirmed' && predicate(contribution))
  }, [contributions, activeFilters])

  const filteredProposals = useMemo(() => {
    if (!contributions) return []
    const predicate = applyFilters(activeFilters)
    return contributions.filter((contribution) => contribution.is_own_proposal && predicate(contribution))
  }, [contributions, activeFilters])

  const reportTargetOptions = useMemo(
    () => contributions ? buildReportTargetOptions(contributions) : [],
    [contributions],
  )

  async function handleConfirm(id: number) {
    try {
      await confirmAnimeContribution(id)
      await reload()
    } catch {
      // Open contribution cards keep their local action state; reload failures are not persisted here.
    }
  }

  async function handleRejectWithReason(id: number, reason: string) {
    await rejectAnimeContributionWithReason(id, reason)
    await reload()
  }

  function handleVisibilityChange(id: number, isPublic: boolean) {
    setContributions((prev) =>
      prev
        ? prev.map((contribution) =>
            contribution.id === id ? { ...contribution, is_public_on_member_profile: isPublic } : contribution,
          )
        : prev,
    )
  }

  function openReportModal() {
    setReportPrefillType(null)
    setReportPrefillId(null)
    setReportModalOpen(true)
  }

  if (!isClientInitialized || isLoading) {
    return <LoadingState title="Projekt-Hinweise werden geladen" />
  }

  if (error || !contributions) {
    return (
      <ErrorState
        title={hasAuthSession ? 'Projekt-Hinweise konnten nicht geladen werden' : 'Anmeldung erforderlich'}
        description={error ?? 'Unbekannter Fehler'}
        action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
      />
    )
  }

  return (
    <main className={styles.contributionsPage}>
      <PageHeader
        title="Meine Projekte"
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={openReportModal}
            aria-label="Hinweis senden"
            className={styles.pageHeaderAction}
          >
            Hinweis senden
          </Button>
        }
      />

      <div className={styles.contributionsStack}>
        <ContributionInbox
          contributions={contributions}
          onConfirm={(id) => void handleConfirm(id)}
          onRejectWithReason={setRejectModalOpenId}
          onVisibilityChange={handleVisibilityChange}
        />

        <ContributionSummary
          contributions={contributions}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
        />

        <MyContributionsSection
          contributions={filteredContributions}
          onVisibilityChange={handleVisibilityChange}
        />

        <MyProposalsSection
          proposals={filteredProposals}
          ownGroups={ownGroups}
          onReload={() => void reload()}
        />
      </div>

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
        targetOptions={reportTargetOptions}
        ownGroups={ownGroups}
        roleDefinitions={ANIME_CONTRIBUTION_ROLES}
      />
    </main>
  )
}
