import Link from 'next/link'

import { FansubContributorsSection } from '@/components/fansubs/FansubContributorsSection'
import { FansubDeepDiveSection } from '@/components/fansubs/FansubDeepDiveSection'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubHighlightsSection } from '@/components/fansubs/FansubHighlightsSection'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubSectionNav } from '@/components/fansubs/FansubSectionNav'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { FansubTeamSection } from '@/components/fansubs/FansubTeamSection'
import { GroupLeaderTimeline } from '@/components/fansubs/GroupLeaderTimeline'
import type { AnimeListItem } from '@/types/anime'
import type { PublicGroupContributionsResponse } from '@/types/contributions'
import type { MediaOwnershipRow } from '@/types/media-ownership'
import {
  ApiError,
  getAnimeList,
  getFansubBySlug,
  getFansubContributions,
  getFansubGroupDomainProjection,
  getMediaOwnershipProjection,
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

async function loadFansubProjects(fansubID: number): Promise<AnimeListItem[]> {
  const perPage = 100
  const maxPages = 10
  const projects: AnimeListItem[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await getAnimeList({ page, per_page: perPage, fansub_id: fansubID })
    projects.push(...response.data)
    if (page >= response.meta.total_pages) break
  }

  return projects
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

  let groupResponse: Awaited<ReturnType<typeof getFansubBySlug>> | null = null
  let message: string | null = null

  try {
    groupResponse = await getFansubBySlug(slug)
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Fansubgruppe nicht gefunden.'
        : 'Fansub-Profil konnte nicht geladen werden.'
  }

  if (!groupResponse) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message || 'Fansub-Profil konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  const group = groupResponse.data

  // Kollaboration-Check — VOR allen nachgelagerten API-Aufrufen
  if (group.group_type === 'collaboration') {
    return (
      <main className={styles.page}>
        <div className={styles.readingColumn}>
          <FansubHeroSection group={group} isCollaboration />
        </div>
      </main>
    )
  }

  const [projectsResult, contributionsResult, domainProjectionResult, mediaOwnershipResult] =
    await Promise.allSettled([
      loadFansubProjects(group.id),
      getFansubContributions(group.id),
      getFansubGroupDomainProjection(group.id),
      getMediaOwnershipProjection('fansub_group', group.id),
    ])
  const projects = resolveSettled<AnimeListItem[]>(projectsResult, [])
  const contributions = resolveSettled<PublicGroupContributionsResponse | null>(contributionsResult, null)
  const domainProjection =
    domainProjectionResult.status === 'fulfilled'
      ? domainProjectionResult.value
      : { members: [], historical: [], contributors: [] }
  const mediaRows = resolveSettled<MediaOwnershipRow[]>(mediaOwnershipResult, [])

  return (
    <main className={styles.page}>
      <FansubSectionNav />
      <div className={styles.readingColumn}>
        <FansubHeroSection group={group} />
        <div className={styles.sectionSpacing}>
          <FansubStorySection group={group} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubHighlightsSection group={group} contributions={contributions} />
        </div>
        <div className={`${styles.sectionSpacing} ${styles.gridSection}`}>
          <FansubProjectsSection projects={projects} groupId={group.id} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubTeamSection members={domainProjection.members} historical={domainProjection.historical} />
        </div>
        <div className={styles.sectionSpacing}>
          <FansubContributorsSection contributors={domainProjection.contributors} />
        </div>
        <div className={`${styles.sectionSpacing} ${styles.gridSection}`}>
          <FansubMediaSection mediaRows={mediaRows} group={group} />
        </div>
        <section id="gruppenleitung" className={styles.sectionSpacing}>
          <GroupLeaderTimeline entries={contributions?.leader_timeline ?? []} />
        </section>
        <div className={styles.sectionSpacing}>
          <FansubDeepDiveSection group={group} />
        </div>
      </div>
    </main>
  )
}
