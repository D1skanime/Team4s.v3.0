import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { GroupEdgeNavigation } from '@/components/groups/GroupEdgeNavigation'
import { CollapsibleStory } from '@/components/groups/CollapsibleStory'
import { buildGroupNavigationGroups } from '@/lib/groupNavigation'
import { getGroupDetail, getGroupReleases, getAnimeByID, getAnimeFansubs, ApiError } from '@/lib/api'

import styles from './page.module.css'

interface GroupStoryPageProps {
  params:
    | {
        id: string
        groupId: string
      }
    | Promise<{
        id: string
        groupId: string
      }>
}

export default async function GroupStoryPage({ params }: GroupStoryPageProps) {
  const resolvedParams = await params
  const animeID = Number.parseInt(resolvedParams.id, 10)
  const groupID = Number.parseInt(resolvedParams.groupId, 10)

  if (Number.isNaN(animeID) || animeID <= 0 || Number.isNaN(groupID) || groupID <= 0) {
    return notFound()
  }

  let groupResponse: Awaited<ReturnType<typeof getGroupDetail>> | null = null
  let animeResponse: Awaited<ReturnType<typeof getAnimeByID>> | null = null
  let errorMessage: string | null = null

  try {
    groupResponse = await getGroupDetail(animeID, groupID)
    animeResponse = await getAnimeByID(animeID)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return notFound()
    }
    errorMessage = 'Gruppendetails konnten nicht geladen werden.'
  }

  if (!groupResponse || !animeResponse) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href={`/anime/${animeID}`}>Zurueck zum Anime</Link>
        </p>
        <div className={styles.errorBox}>{errorMessage ?? 'Fehler beim Laden der Seite.'}</div>
      </main>
    )
  }

  const group = groupResponse.data
  const anime = animeResponse.data

  let otherGroups: Awaited<ReturnType<typeof getGroupReleases>>['data']['other_groups'] = []
  let animeFansubRelations: Awaited<ReturnType<typeof getAnimeFansubs>>['data'] | null = null
  try {
    const [releasesData, animeFansubsData] = await Promise.all([
      getGroupReleases(animeID, groupID, { per_page: 1 }),
      getAnimeFansubs(animeID),
    ])
    otherGroups = releasesData.data.other_groups
    animeFansubRelations = animeFansubsData.data
  } catch {
    // If releases fail, continue without navigation
    try {
      const releasesData = await getGroupReleases(animeID, groupID, { per_page: 1 })
      otherGroups = releasesData.data.other_groups
    } catch {
      // Continue without additional navigation data
    }
  }

  const navigationGroups = buildGroupNavigationGroups({
    currentGroup: group.fansub,
    fallbackOtherGroups: otherGroups,
    animeFansubRelations,
  })

  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: anime.title, href: `/anime/${animeID}` },
    { label: 'Gruppe' },
    { label: group.fansub.name },
  ]

  const periodText = group.period?.start || group.period?.end
    ? `${group.period?.start ?? '?'} - ${group.period?.end ?? '?'}`
    : null

  return (
    <main className={styles.page}>
      <Breadcrumbs items={breadcrumbItems} />

      <p className={styles.backLink}>
        <Link href={`/anime/${animeID}`}>Zurueck zum Anime</Link>
      </p>

      <section className={styles.heroShell}>
        <section className={styles.hero}>
          {group.fansub.logo_url ? (
            <Image
              src={group.fansub.logo_url}
              alt={group.fansub.name}
              width={200}
              height={200}
              className={styles.logo}
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              <span className={styles.logoInitial}>{group.fansub.name.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div className={styles.info}>
            <h1 className={styles.title}>Fansub des Anime {anime.title} der Gruppe {group.fansub.name}</h1>
            <div className={styles.stats}>
              {periodText ? <span className={styles.statItem}>Periode: {periodText}</span> : null}
              <span className={styles.statItem}>Mitglieder: {group.stats.member_count}</span>
              <span className={styles.statItem}>Episoden: {group.stats.episode_count}</span>
            </div>
            {group.story ? (
              <div className={styles.story}>
                <h2 className={styles.storyHeading}>Story</h2>
                <CollapsibleStory content={group.story} />
              </div>
            ) : null}
            <div className={styles.actions}>
              <Link href={`/anime/${animeID}/group/${groupID}/releases`} className={styles.releasesButton}>
                Releases ansehen
              </Link>
              <Link href={`/fansubs/${group.fansub.slug}`} className={styles.profileButton}>
                Fansub-Profil
              </Link>
            </div>
          </div>
        </section>
        {navigationGroups.length > 1 ? (
          <GroupEdgeNavigation
            currentGroupId={groupID}
            animeId={animeID}
            animeTitle={anime.title}
            otherGroups={navigationGroups}
            mode="story"
          />
        ) : null}
      </section>
    </main>
  )
}
