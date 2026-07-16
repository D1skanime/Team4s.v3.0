import { notFound } from 'next/navigation'

import { ReleaseDetailPageContent } from '@/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData'
import { ApiError, getPublicFansubProfileBySlug } from '@/lib/api'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

interface Props { params: { slug: string; animeSlug: string; releaseVersionId: string } | Promise<{ slug: string; animeSlug: string; releaseVersionId: string }> }

export default async function PrettyReleaseDetailPage({ params }: Props) {
  const { slug, animeSlug, releaseVersionId } = await params
  if (!slug?.trim() || !animeSlug?.trim() || !/^\d+$/.test(releaseVersionId)) return notFound()
  const releaseVersionID = Number.parseInt(releaseVersionId, 10)
  if (releaseVersionID <= 0) return notFound()

  let profile: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>
  try {
    profile = await getPublicFansubProfileBySlug(slug.trim())
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }
  const project = profile.data.projects.find((item) => item.anime_slug?.trim() === animeSlug.trim())
  if (!project) return notFound()
  return <ReleaseDetailPageContent
    animeID={project.id}
    groupID={profile.data.group.id}
    releaseVersionID={releaseVersionID}
    canonicalProjectPath={buildPublicFansubProjectPath(profile.data.group.slug, project.anime_slug)}
  />
}
