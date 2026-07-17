'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'

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
  getOwnProfile,
  rejectAnimeContributionWithReason,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'
import type { MemberProfileData } from '@/types/profile'

const MEMBER_PROFILE_REQUIRED_CODE = 'MEMBER_PROFILE_REQUIRED'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

// D-06/D-09: the only authoritative eligibility source is the own-profile aggregate.
// has_member_profile alone is never sufficient — a verified Member without any real
// project/contribution assignment must still be treated as non-entitled.
function isEligibleForContributions(profile: Pick<MemberProfileData, 'has_member_profile' | 'has_project_assignments'> | null): boolean {
  return Boolean(profile?.has_member_profile && profile?.has_project_assignments)
}

function isMemberProfileRequiredError(error: unknown): boolean {
  return error instanceof ApiError && error.code === MEMBER_PROFILE_REQUIRED_CODE
}

export default function MyContributionsPage() {
  const router = useRouter()
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [contributions, setContributions] = useState<MeAnimeContribution[] | null>(null)
  const [ownGroups, setOwnGroups] = useState<MembershipEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<ContributionFilterState>(EMPTY_FILTER_STATE)
  const [rejectModalOpenId, setRejectModalOpenId] = useState<number | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const hasAuthSession = hasAccessToken || hasRefreshToken

  const reload = useCallback(async () => {
    if (!isClientInitialized) return
    if (!hasAuthSession) {
      setError('Bitte einloggen.')
      setIsRedirecting(false)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Own-profile eligibility gate first (D-06/D-08/D-09): any authenticated account
      // lacking a verified Member + real project assignment redirects straight to Mein
      // Account — never a claim/error intermediate on this page.
      const profileResponse = await getOwnProfile()
      if (!isEligibleForContributions(profileResponse.data)) {
        setIsRedirecting(true)
        setIsLoading(false)
        router.replace('/me/profile')
        return
      }

      const [response, membershipsResponse] = await Promise.all([
        getMyAnimeContributions(),
        getMyMemberships().catch(() => ({ data: [] as MembershipEntry[] })),
      ])
      setContributions(response.data)
      setOwnGroups(membershipsResponse.data)
    } catch (loadError) {
      // Defensive: if the account lost eligibility between the own-profile check and the
      // contribution load itself, the standardized MEMBER_PROFILE_REQUIRED code (Task 2)
      // still redirects instead of surfacing a raw error.
      if (isMemberProfileRequiredError(loadError)) {
        setIsRedirecting(true)
        setIsLoading(false)
        router.replace('/me/profile')
        return
      }
      setError(readErrorMessage(loadError, 'Projekt-Hinweise konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
    // router is intentionally omitted: Next.js guarantees a stable router instance, and
    // including it here would re-run this load effect on every render in test/mocked
    // environments where a fresh object is returned per call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAuthSession, isClientInitialized])

  useEffect(() => {
    void reload()
  }, [reload, reloadToken])

  const handleRetry = useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

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

  // D-08: client initializing and the own-profile eligibility redirect are both neutral
  // loading — never a claim/error intermediate flashes on /me/contributions itself.
  if (!isClientInitialized || isLoading || isRedirecting) {
    return <LoadingState title="Projekt-Hinweise werden geladen" />
  }

  if (error || !contributions) {
    if (!hasAuthSession) {
      return (
        <ErrorState
          title="Anmeldung erforderlich"
          description={error ?? 'Bitte einloggen.'}
          action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
        />
      )
    }

    // D-08/D-19: an authenticated, eligibility-checked session whose data failed to load
    // (network/5xx) gets a scoped retry action here — never a login prompt, since the
    // session itself is active and already passed the eligibility check above.
    return (
      <ErrorState
        title="Projekt-Hinweise konnten nicht geladen werden"
        description={error ?? 'Unbekannter Fehler'}
        action={
          <Button
            type="button"
            variant="secondary"
            leftIcon={<RotateCw size={16} aria-hidden="true" />}
            onClick={handleRetry}
          >
            Erneut versuchen
          </Button>
        }
      />
    )
  }

  return (
    <main className={styles.contributionsPage}>
      <PageHeader title="Meine Projekte" />

      <div className={styles.contributionsStack}>
        <MyContributionsSection
          contributions={filteredContributions}
          onVisibilityChange={handleVisibilityChange}
        />

        <ContributionInbox
          contributions={contributions}
          onConfirm={(id) => void handleConfirm(id)}
          onRejectWithReason={setRejectModalOpenId}
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
