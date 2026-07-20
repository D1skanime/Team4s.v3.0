import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'

import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { ApiError, getAnimeBackdrops, getAnimeByID, getGroupDetail, getGroupReleaseDetail } from '@/lib/api'
import { resolvePublicApiUrl } from '@/lib/publicApiUrl'

import { ContributorsRow } from './ContributorsRow'
import { ReleaseDetailHero } from './ReleaseDetailHero'
import { ReleaseEpisodePlayer } from './ReleaseEpisodePlayer'
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
  initialKaraSegmentID?: number | null
  autoplayInitialKara?: boolean
}

export function parseReleaseDetailSearchParams(params: Record<string, string | string[] | undefined>): Pick<ReleaseDetailPageContext, 'initialKaraSegmentID' | 'autoplayInitialKara'> {
  const karaValue = Array.isArray(params.kara) ? params.kara[0] : params.kara
  const parsedKara = karaValue && /^\d+$/.test(karaValue) ? Number.parseInt(karaValue, 10) : 0
  return {
    initialKaraSegmentID: parsedKara > 0 ? parsedKara : null,
    autoplayInitialKara: params.autoplay === '1',
  }
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

export async function ReleaseDetailPageContent({ animeID, groupID, releaseVersionID, canonicalProjectPath, initialKaraSegmentID, autoplayInitialKara }: ReleaseDetailPageContext) {
  let detail: Awaited<ReturnType<typeof getGroupReleaseDetail>>
  try {
    detail = await getGroupReleaseDetail(animeID, groupID, releaseVersionID)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    return <main className={styles.page}><p className={styles.backLink}><Link href={canonicalProjectPath ?? `/anime/${animeID}/group/${groupID}`}>Zurück zum Fansub-Projekt</Link></p><div className={styles.errorBox}>Release konnte nicht geladen werden. Bitte versuche es erneut oder kehre zum Fansub-Projekt zurück.</div></main>
  }

  let animeTitle: string | null = null
  let groupName: string | null = null
  let animeLogoFallbackUrl: string | null = null
  let atmosphereUrl: string | null = null
  try {
    const [animeResponse, groupResponse, backdropResponse] = await Promise.all([
      getAnimeByID(animeID),
      getGroupDetail(animeID, groupID),
      getAnimeBackdrops(animeID).catch(() => null),
    ])
    animeTitle = animeResponse.data.title
    groupName = groupResponse.data.fansub.name
    animeLogoFallbackUrl = backdropResponse?.data.logo_url ? resolvePublicApiUrl(backdropResponse.data.logo_url) : null
    const atmosphereCandidate = backdropResponse?.data.backdrops[0] ?? backdropResponse?.data.banner_url ?? animeResponse.data.banner_url
    atmosphereUrl = atmosphereCandidate ? resolvePublicApiUrl(atmosphereCandidate) : null
  } catch {
    // Release-Metadaten sind ergänzend. Ein vorhandenes Release bleibt auch
    // ohne Anime-/Gruppenlabels oder Backdrop öffentlich erreichbar.
  }

  const projectHref = canonicalProjectPath ?? `/anime/${animeID}/group/${groupID}`
  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: animeTitle ?? 'Anime', href: `/anime/${animeID}` },
    { label: groupName ?? 'Gruppe', href: projectHref },
    { label: `Episode ${detail.episode_number}` },
  ]

  const pageStyle = atmosphereUrl ? ({ '--release-page-backdrop': `url("${atmosphereUrl}")` } as CSSProperties) : undefined
  return <main className={`${styles.page} ${atmosphereUrl ? styles.pageWithBackdrop : ''}`} style={pageStyle}>
    <Breadcrumbs items={breadcrumbItems} />
    <p className={styles.backLink}><Link href={projectHref}>Zurück zum Fansub-Projekt</Link></p>
    <ReleaseDetailHero
      {...detail}
      animeID={animeID}
      groupID={groupID}
      canonicalProjectPath={canonicalProjectPath}
      animeLogoFallbackUrl={animeLogoFallbackUrl}
      atmosphereUrl={atmosphereUrl}
    />
    <ThemeTimeline
      releaseVersionID={releaseVersionID}
      episodeDurationSeconds={detail.duration_seconds}
      segments={detail.segments}
      initialSegmentID={initialKaraSegmentID}
      autoPlayInitial={autoplayInitialKara}
    />
    <ReleaseGallery animeID={animeID} groupID={groupID} releaseVersionID={releaseVersionID} initialImages={detail.images} categoryTotals={detail.image_category_totals} groups={detail.groups} />
    <ReleaseNotesList animeID={animeID} groupID={groupID} releaseVersionID={releaseVersionID} initialNotes={detail.notes} totalCount={detail.notes_count} groups={detail.groups} />
    <ContributorsRow contributors={detail.contributors} groups={detail.groups} />
    <ReleaseEpisodePlayer releaseVersionID={releaseVersionID} title={detail.title} />
    <ReleaseNavigation animeID={animeID} groupID={groupID} canonicalProjectPath={canonicalProjectPath} previous={detail.previous} next={detail.next} />
  </main>
}
