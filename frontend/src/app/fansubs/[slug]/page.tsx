import Link from 'next/link'

import { FansubCommunityLinksSection } from '@/components/fansubs/FansubCommunityLinksSection'
import { FansubHistorySection } from '@/components/fansubs/FansubHistorySection'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { countVisibleTeamMembers, FansubTeamSection } from '@/components/fansubs/FansubTeamSection'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import type { DomainProjectionResponse } from '@/types/domain-projection'
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

export function hasStoryContent(
  story: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>['data']['story'],
): boolean {
  return Boolean(story && (story.title?.trim() || story.body_html?.trim() || story.body_text?.trim()))
}

export function buildEmptyAreaLabels(
  profile: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>['data'],
  domainProjection: DomainProjectionResponse,
  contributions: PublicGroupContributionsResponse | null,
): string[] {
  const labels: string[] = []

  if (profile.projects.length === 0) labels.push('Laufende Projekte')
  if (countVisibleTeamMembers(domainProjection.members, domainProjection.historical) === 0) labels.push('Team')
  if (!hasStoryContent(profile.story)) labels.push('Geschichte')
  if (profile.history.length === 0) labels.push('Erfolge')
  if (
    domainProjection.contributors.filter(
      (contributor) => contributor.visibility === 'public' && contributor.review_status === 'approved',
    ).length === 0
  ) {
    labels.push('Externe Mitwirkende')
  }
  if (profile.media.length === 0) labels.push('Medien')
  if ((contributions?.leader_timeline ?? []).length === 0) labels.push('Gruppenleitung')
  if (!profile.group.website_url && profile.community_links.length === 0) labels.push('Mehr')

  return labels
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
  const visibleTeamCount = countVisibleTeamMembers(domainProjection.members, domainProjection.historical)
  const heroStats = [
    { label: 'Anime-Projekte', value: profile.projects.length },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: visibleTeamCount },
  ]
  const storyAvailable = hasStoryContent(profile.story)
  const hasTeam = visibleTeamCount > 0
  const hasHistory = profile.history.length > 0
  const hasCommunityLinks = profile.community_links.length > 0
  const hasMedia = profile.media.length > 0
  const emptyAreaLabels = buildEmptyAreaLabels(profile, domainProjection, contributions)

  return (
    <main className={styles.page}>
      <div className={styles.readingColumn}>
        <FansubHeroSection group={group} stats={heroStats} />

        {storyAvailable ? (
          <div className={styles.sectionSpacing}>
            <FansubStorySection group={group} story={profile.story} />
          </div>
        ) : null}
      </div>

      {profile.projects.length > 0 ? (
        <div className={styles.gridSection}>
          <FansubProjectsSection projects={profile.projects} groupId={group.id} />
        </div>
      ) : null}

      <div className={styles.readingColumn}>
        {hasTeam ? (
          <div className={styles.sectionSpacing}>
            <FansubTeamSection members={domainProjection.members} historical={domainProjection.historical} />
          </div>
        ) : null}

        {hasHistory ? (
          <div className={styles.sectionSpacing}>
            <FansubHistorySection history={profile.history} />
          </div>
        ) : null}

        {hasCommunityLinks ? (
          <div className={styles.sectionSpacing}>
            <FansubCommunityLinksSection links={profile.community_links} />
          </div>
        ) : null}

        {hasMedia ? (
          <div className={styles.sectionSpacing}>
            <FansubMediaSection media={profile.media} />
          </div>
        ) : null}

        {emptyAreaLabels.length > 0 ? (
          <aside className={styles.emptySummary} aria-label="Noch offene Profilbereiche">
            <p>Weitere Bereiche sind noch nicht öffentlich befüllt: {emptyAreaLabels.join(', ')}.</p>
          </aside>
        ) : null}
      </div>
    </main>
  )
}
