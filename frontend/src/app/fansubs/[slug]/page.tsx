import Link from 'next/link'

import { FansubContributorsSection } from '@/components/fansubs/FansubContributorsSection'
import { FansubDeepDiveSection } from '@/components/fansubs/FansubDeepDiveSection'
import { FansubHistorySection } from '@/components/fansubs/FansubHistorySection'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubHighlightsSection } from '@/components/fansubs/FansubHighlightsSection'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubSectionNav } from '@/components/fansubs/FansubSectionNav'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { FansubTeamSection } from '@/components/fansubs/FansubTeamSection'
import { GroupLeaderTimeline } from '@/components/fansubs/GroupLeaderTimeline'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import {
  ApiError,
  getFansubContributions,
  getFansubGroupDomainProjection,
  getPublicFansubProfileBySlug,
} from '@/lib/api'

import styles from './page.module.css'

interface FansubProfilePageProps {
  params:
    | {
        slug: string
      }
    | Promise<{
        slug: string
      }>
}

function resolveSettled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

export default async function FansubProfilePage({ params }: FansubProfilePageProps) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

  if (!slug) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>Ungültiger Fansub-Slug.</div>
      </main>
    )
  }

  let profileResponse: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>> | null = null
  let message: string | null = null

  try {
    profileResponse = await getPublicFansubProfileBySlug(slug)
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Fansubgruppe nicht gefunden.'
        : 'Fansub-Profil konnte nicht geladen werden.'
  }

  if (!profileResponse) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message || 'Fansub-Profil konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  const profile = profileResponse.data
  const group = profile.group

  const [contributionsResult, domainProjectionResult] = await Promise.allSettled([
    getFansubContributions(group.id),
    getFansubGroupDomainProjection(group.id),
  ])
  const contributions = resolveSettled<PublicGroupContributionsResponse | null>(contributionsResult, null)
  const domainProjection =
    domainProjectionResult.status === 'fulfilled'
      ? domainProjectionResult.value
      : { members: [], historical: [], contributors: [] }
  const teamMemberNames = [
    ...domainProjection.members.map((m) => m.member_display_name),
    ...domainProjection.historical.map((m) => m.member_display_name),
  ]

  return (
    <main className={styles.page}>
      <FansubSectionNav />
      <div className={styles.readingColumn}>
        <FansubHeroSection group={group} />
        <div className={styles.sectionSpacing}>
          <FansubStorySection group={group} story={profile.story} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubHighlightsSection
            group={group}
            contributions={contributions}
            animeProjectCount={profile.projects.length}
            historyCount={profile.history.length}
          />
        </div>
      </div>
      <div className={styles.gridSection}>
        <FansubProjectsSection projects={profile.projects} groupId={group.id} />
      </div>
      <div className={styles.readingColumn}>
        <div className={styles.sectionSpacing}>
          <FansubHistorySection history={profile.history} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubTeamSection members={domainProjection.members} historical={domainProjection.historical} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubContributorsSection contributors={domainProjection.contributors} teamMemberNames={teamMemberNames} />
        </div>
      </div>
      <div className={styles.gridSection}>
        <FansubMediaSection media={profile.media} />
      </div>
      <div className={styles.readingColumn}>
        <section id="gruppenleitung" className={styles.sectionSpacing}>
          <GroupLeaderTimeline
            entries={contributions?.leader_timeline ?? []}
            fallbackLeads={domainProjection.members
              .filter((m) => m.roles.includes('fansub_lead'))
              .map((m) => ({
                member_display_name: m.member_display_name,
                member_slug: m.member_slug,
                role_code: 'fansub_lead',
                role_label: 'Fansub-Lead',
                started_year: null,
                ended_year: null,
                status: m.status,
              }))}
          />
        </section>
        <div className={styles.sectionSpacing}>
          <FansubDeepDiveSection group={group} />
        </div>
      </div>
    </main>
  )
}
