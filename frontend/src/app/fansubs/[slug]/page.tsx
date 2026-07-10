import Link from 'next/link'

import { FansubHistorySection } from '@/components/fansubs/FansubHistorySection'
import { FansubHeroSection } from '@/components/fansubs/FansubHeroSection'
import { FansubMediaSection } from '@/components/fansubs/FansubMediaSection'
import { FansubProjectsSection } from '@/components/fansubs/FansubProjectsSection'
import { FansubStorySection } from '@/components/fansubs/FansubStorySection'
import { countVisibleTeamMembers, FansubTeamSection } from '@/components/fansubs/FansubTeamSection'
import type { DomainProjectionResponse } from '@/types/domain-projection'
import {
  ApiError,
  getFansubGroupDomainProjection,
  getPublicFansubProfileBySlug,
  resolveApiUrl,
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

export function hasStoriesContent(
  stories: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>['data']['stories'],
): boolean {
  return stories.some((story) => Boolean(story.title?.trim() || story.body_html?.trim() || story.body_text?.trim()))
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

  const domainProjectionResult = await Promise.allSettled([getFansubGroupDomainProjection(group.id)])
  const domainProjection: DomainProjectionResponse =
    domainProjectionResult[0].status === 'fulfilled'
      ? domainProjectionResult[0].value
      : { members: [], historical: [], contributors: [] }
  const visibleTeamCount = countVisibleTeamMembers(domainProjection.members, domainProjection.historical)
  const heroStats = [
    { label: 'Anime-Projekte', value: profile.projects.length },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: visibleTeamCount },
  ]
  const storyAvailable = hasStoriesContent(profile.stories)
  const hasTeam = visibleTeamCount > 0
  const hasHistory = profile.history.length > 0
  const hasMedia = profile.media.length > 0
  const bannerBackdrop = group.banner_url ? resolveApiUrl(group.banner_url) : ''

  return (
    <main className={styles.page}>
      <FansubHeroSection group={group} stats={heroStats} communityLinks={profile.community_links} />

      {storyAvailable ? (
        <div className={styles.gridSection}>
          <FansubStorySection group={group} stories={profile.stories} />
        </div>
      ) : null}

      {profile.projects.length > 0 ? (
        <div className={styles.sectionBand}>
          {bannerBackdrop ? (
            <div
              className={styles.sectionBandBackdrop}
              style={{ backgroundImage: `url("${bannerBackdrop}")` }}
              aria-hidden="true"
            />
          ) : null}
          <div className={styles.gridSection}>
            <FansubProjectsSection projects={profile.projects} groupId={group.id} />
          </div>
        </div>
      ) : null}

      {hasTeam ? (
        <div className={styles.gridSection}>
          <FansubTeamSection members={domainProjection.members} historical={domainProjection.historical} />
        </div>
      ) : null}

      {hasHistory ? (
        <div className={styles.gridSection}>
          <FansubHistorySection history={profile.history} />
        </div>
      ) : null}

      {hasMedia ? (
        <div className={styles.sectionBand}>
          {bannerBackdrop ? (
            <div
              className={styles.sectionBandBackdrop}
              style={{ backgroundImage: `url("${bannerBackdrop}")` }}
              aria-hidden="true"
            />
          ) : null}
          <div className={styles.gridSection}>
            <FansubMediaSection media={profile.media} />
          </div>
        </div>
      ) : null}
    </main>
  )
}
