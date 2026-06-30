'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ContributionInbox } from '@/components/contributions/ContributionInbox'
import { ContributionSummary } from '@/components/contributions/ContributionSummary'
import {
  applyFilters,
  EMPTY_FILTER_STATE,
  type ContributionFilterState,
} from '@/components/contributions/ContributionFilters'
import styles from '@/components/contributions/contributions.module.css'
import { MyContributionsSection } from '@/components/contributions/MyContributionsSection'
import { MyProposalsSection } from '@/components/contributions/MyProposalsSection'
import { RejectReasonModal } from '@/components/contributions/RejectReasonModal'
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

  // Filter nur einblenden, wenn es genug zu filtern gibt — bei wenigen Beiträgen/Gruppen ist er nur Lärm.
  const showFilter = useMemo(() => {
    if (!contributions) return false
    const distinctAnimes = new Set(contributions.map((c) => c.anime_id)).size
    const distinctGroups = new Set(
      contributions.map((c) => c.fansub_group_name).filter(Boolean),
    ).size
    return contributions.length > 6 || distinctAnimes > 3 || distinctGroups > 2
  }, [contributions])

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

  function handleVisibilityChange(id: number, isPublic: boolean, roleCode?: string, nextContributionId?: number) {
    setContributions((prev) =>
      prev
        ? prev.flatMap((contribution) => {
            if (contribution.id !== id) return [contribution]

            if (!roleCode || !nextContributionId || nextContributionId === id || contribution.role_codes.length <= 1) {
              return [{ ...contribution, is_public_on_member_profile: isPublic }]
            }

            const roleIndex = contribution.role_codes.indexOf(roleCode)
            if (roleIndex < 0) {
              return [{ ...contribution, is_public_on_member_profile: isPublic }]
            }

            const roleLabel = contribution.role_labels?.[roleIndex]
            const remainingRoleCodes = contribution.role_codes.filter((_, index) => index !== roleIndex)
            const remainingRoleLabels = contribution.role_labels?.filter((_, index) => index !== roleIndex)

            return [
              {
                ...contribution,
                role_codes: remainingRoleCodes,
                role_labels: remainingRoleLabels,
              },
              {
                ...contribution,
                id: nextContributionId,
                role_codes: [roleCode],
                role_labels: roleLabel ? [roleLabel] : undefined,
                is_public_on_member_profile: isPublic,
              },
            ]
          })
        : prev,
    )
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
      <PageHeader title="Meine Projekte" />

      <div className={styles.contributionsStack}>
        <ContributionInbox
          contributions={contributions}
          onConfirm={(id) => void handleConfirm(id)}
          onRejectWithReason={setRejectModalOpenId}
          onVisibilityChange={handleVisibilityChange}
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

        {showFilter ? (
          <ContributionSummary
            contributions={contributions}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
          />
        ) : null}
      </div>

      <RejectReasonModal
        open={rejectModalOpenId !== null}
        contributionId={rejectModalOpenId}
        onClose={() => setRejectModalOpenId(null)}
        onConfirm={handleRejectWithReason}
      />
    </main>
  )
}
