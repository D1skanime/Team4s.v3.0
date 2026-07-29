'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { getMyAnimeContributions, getOwnDashboard, getOwnProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution } from '@/types/contributions'
import type { OwnDashboardData } from '@/types/dashboard'
import type { MemberProfileMembership } from '@/types/profile'

import { AttentionSection } from './components/AttentionSection'
import { CategoryProgressTable } from './components/CategoryProgressTable'
import { DashboardMetrics } from './components/DashboardMetrics'
import { MyGroupsSection } from './components/MyGroupsSection'
import { QuickLinksSection } from './components/QuickLinksSection'
import styles from './page.module.css'

const AUTH_REQUIRED_MESSAGE = 'Bitte melde dich an, um dein Dashboard zu sehen.'
// UI-SPEC Copywriting Contract: the whole-page error state always shows this exact,
// fixed description -- never the raw upstream error message -- regardless of which of
// the three parallel fetches failed or why.
const DASHBOARD_ERROR_DESCRIPTION =
  'Deine Dashboard-Daten konnten nicht geladen werden. Bitte lade die Seite neu oder versuche es später erneut.'

interface DashboardPageState {
  contributions: MeAnimeContribution[]
  memberships: MemberProfileMembership[]
  dashboardData: OwnDashboardData
}

/**
 * /me/dashboard (Phase 116-06, D-01/D-09): composes the five already-built Phase 116
 * sections behind ONE parallel Promise.all fetch. This file intentionally contains no
 * eligibility check, no router.replace/router.push call, and no `useRouter` import at
 * all -- the single most important behavioral contrast with `me/contributions/page.tsx`
 * (isEligibleForContributions + router.replace). Every authenticated user reaches this
 * page regardless of has_member_profile/has_project_assignments; sections without data
 * render their own empty state instead.
 */
export default function DashboardPage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken

  const [state, setState] = useState<DashboardPageState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const loadDashboard = useCallback(async (cancelledRef: { current: boolean }) => {
    setIsLoading(true)
    setHasError(false)
    try {
      // D-09: all three sources load in one Promise.all, never sequential awaits.
      const [profileResponse, contributionsResponse, dashboardResponse] = await Promise.all([
        getOwnProfile(),
        getMyAnimeContributions(),
        getOwnDashboard(),
      ])
      if (cancelledRef.current) return
      setState({
        contributions: contributionsResponse.data,
        memberships: profileResponse.data.memberships ?? [],
        dashboardData: dashboardResponse.data,
      })
    } catch {
      if (cancelledRef.current) return
      setHasError(true)
    } finally {
      if (!cancelledRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isClientInitialized) return
    if (!hasAuthSession) {
      setIsLoading(false)
      return
    }

    const cancelledRef = { current: false }
    void loadDashboard(cancelledRef)
    return () => {
      cancelledRef.current = true
    }
  }, [isClientInitialized, hasAuthSession, loadDashboard, reloadToken])

  const handleRetry = useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  if (!isClientInitialized || (hasAuthSession && isLoading)) {
    return (
      <LoadingState
        title="Dein Dashboard wird geladen"
        description="Kennzahlen, Fortschritt und Gruppen werden zusammengestellt."
      />
    )
  }

  if (!hasAuthSession) {
    return (
      <ErrorState
        title="Anmeldung erforderlich"
        description={AUTH_REQUIRED_MESSAGE}
        action={
          <Button href="/login" variant="secondary">
            Zur Anmeldung
          </Button>
        }
      />
    )
  }

  if (hasError || !state) {
    return (
      <ErrorState
        title="Dashboard konnte nicht geladen werden"
        description={DASHBOARD_ERROR_DESCRIPTION}
        action={
          <Button type="button" variant="secondary" onClick={handleRetry}>
            Erneut versuchen
          </Button>
        }
      />
    )
  }

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Mein Bereich"
        title="Dashboard"
        description="Deine Projekte, Kennzahlen und Absprünge auf einen Blick."
      />
      <div className={styles.sections}>
        <AttentionSection contributions={state.contributions} />
        <DashboardMetrics data={state.dashboardData} />
        <CategoryProgressTable data={state.dashboardData} />
        <MyGroupsSection memberships={state.memberships} />
        <QuickLinksSection />
      </div>
    </main>
  )
}
