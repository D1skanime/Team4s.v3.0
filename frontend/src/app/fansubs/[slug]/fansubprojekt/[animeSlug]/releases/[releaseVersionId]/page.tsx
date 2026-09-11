import { notFound } from 'next/navigation'

import { parseReleaseDetailSearchParams, ReleaseDetailPageContent } from '@/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData'
import { ApiError, resolveFansubProject } from '@/lib/api'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

interface Props {
  params: Promise<{ slug: string; animeSlug: string; releaseVersionId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PrettyReleaseDetailPage({ params, searchParams }: Props) {
  const { slug, animeSlug, releaseVersionId } = await params
  if (!slug?.trim() || !animeSlug?.trim() || !/^\d+$/.test(releaseVersionId)) return notFound()
  const releaseVersionID = Number.parseInt(releaseVersionId, 10)
  if (releaseVersionID <= 0) return notFound()

  let resolution: Awaited<ReturnType<typeof resolveFansubProject>>
  try {
    resolution = await resolveFansubProject(slug.trim(), animeSlug.trim())
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }
  const deepLink = parseReleaseDetailSearchParams(await searchParams ?? {})
  return <ReleaseDetailPageContent
    animeID={resolution.data.anime_id}
    groupID={resolution.data.group_id}
    releaseVersionID={releaseVersionID}
    canonicalProjectPath={buildPublicFansubProjectPath(slug.trim(), resolution.data.anime_slug)}
    {...deepLink}
  />
}
