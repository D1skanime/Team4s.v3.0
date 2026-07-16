import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { ApiError, getAnimeByID, getGroupDetail, getGroupReleaseDetail } from '@/lib/api'

import { ContributorsRow } from './ContributorsRow'
import { ReleaseDetailHero } from './ReleaseDetailHero'
import { ReleaseGallery } from './ReleaseGallery'
import { ReleaseNavigation } from './ReleaseNavigation'
import { ReleaseNotesList } from './ReleaseNotesList'
import { ThemeTimeline } from './ThemeTimeline'
import styles from './page.module.css'

export interface ReleaseDetailPageContext {
  animeID: number
  groupID: number
  releaseVersionID: number
  canonicalProjectPath?: string | null
}

export function parseReleaseDetailIDs(params: { id: string; groupId: string; releaseVersionId: string }): ReleaseDetailPageContext | null {
  if (![params.id, params.groupId, params.releaseVersionId].every((value) => /^\d+$/.test(value))) return null
  const animeID = Number.parseInt(params.id, 10)
  const groupID = Number.parseInt(params.groupId, 10)
  const releaseVersionID = Number.parseInt(params.releaseVersionId, 10)
  return animeID > 0 && groupID > 0 && releaseVersionID > 0 && [animeID, groupID, releaseVersionID].every(Number.isFinite)
    ? { animeID, groupID, releaseVersionID }
    : null
}

export async function ReleaseDetailPageContent({ animeID, groupID, releaseVersionID, canonicalProjectPath }: ReleaseDetailPageContext) {
  let animeTitle: string | null = null
  let groupName: string | null = null
  let animePoster: string | null = null
  try {
    const [animeResponse, groupResponse] = await Promise.all([getAnimeByID(animeID), getGroupDetail(animeID, groupID)])
    animeTitle = animeResponse.data.title
    animePoster = animeResponse.data.cover_image ?? null
    groupName = groupResponse.data.fansub.name
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
  }

  let detail: Awaited<ReturnType<typeof getGroupReleaseDetail>>
  try {
    detail = await getGroupReleaseDetail(animeID, groupID, releaseVersionID)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    return <main className={styles.page}><p className={styles.backLink}><Link href={canonicalProjectPath ?? `/anime/${animeID}/group/${groupID}`}>Zurück zum Projekt</Link></p><div className={styles.errorBox}>Release konnte nicht geladen werden.</div></main>
  }

  const projectHref = canonicalProjectPath ?? `/anime/${animeID}/group/${groupID}`
  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: animeTitle ?? 'Anime', href: `/anime/${animeID}` },
    { label: groupName ?? 'Gruppe', href: projectHref },
    { label: `Episode ${detail.episode_number}` },
  ]

  return <main className={styles.page}>
    <Breadcrumbs items={breadcrumbItems} />
    <p className={styles.backLink}><Link href={projectHref}>Zurück zum Projekt</Link></p>
    <ReleaseDetailHero {...detail} fallbackPosterUrl={animePoster} />
    <ContributorsRow contributors={detail.contributors} />
    <ReleaseGallery animeID={animeID} groupID={groupID} releaseVersionID={releaseVersionID} initialImages={detail.images} categoryTotals={detail.image_category_totals} />
    <ReleaseNotesList animeID={animeID} groupID={groupID} releaseVersionID={releaseVersionID} initialNotes={detail.notes} totalCount={detail.notes_count} />
    <ThemeTimeline releaseVersionID={releaseVersionID} episodeDurationSeconds={detail.duration_seconds} segments={detail.segments} />
    <ReleaseNavigation animeID={animeID} groupID={groupID} canonicalProjectPath={canonicalProjectPath} previous={detail.previous} next={detail.next} />
  </main>
}
