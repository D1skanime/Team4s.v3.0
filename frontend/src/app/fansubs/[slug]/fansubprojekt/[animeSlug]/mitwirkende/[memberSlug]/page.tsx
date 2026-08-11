import { notFound } from 'next/navigation'

import { ProjectMemberPage } from '@/components/fansubs/projectMember/ProjectMemberPage'
import { ApiError, getProjectMemberSummary, getPublicFansubProfileBySlug } from '@/lib/api'

interface ProjectMemberRouteParams {
  slug: string
  animeSlug: string
  memberSlug: string
}

interface ProjectMemberRouteProps {
  params: Promise<ProjectMemberRouteParams>
}

// Öffentliche Projekt-Member-Seite (Phase 122): kombinierte Read-View Member × Fansubgruppe × Anime.
// Slug→ID-Auflösung wie die bestehende Fansub-Projektseite; 404 bei fehlender Gruppe/Anime/Member
// oder fehlender Projektbeziehung (D-10). Niemals Redirect auf /members/[slug].
export default async function ProjectMemberRoute({ params }: ProjectMemberRouteProps) {
  const resolved = await params
  const fansubSlug = resolved.slug?.trim()
  const animeSlug = resolved.animeSlug?.trim()
  const memberSlug = resolved.memberSlug?.trim()
  if (!fansubSlug || !animeSlug || !memberSlug) return notFound()

  let profileResponse: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>
  try {
    profileResponse = await getPublicFansubProfileBySlug(fansubSlug)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }

  const profile = profileResponse.data
  const project = profile.projects.find((item) => item.anime_slug?.trim() === animeSlug)
  if (!project) return notFound()

  let summary: Awaited<ReturnType<typeof getProjectMemberSummary>>
  try {
    summary = await getProjectMemberSummary(project.id, profile.group.id, memberSlug)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }

  return (
    <ProjectMemberPage
      summary={summary}
      memberSlug={memberSlug}
      groupName={profile.group.name}
      groupSlug={profile.group.slug}
      animeTitle={project.title}
      animeID={project.id}
      groupID={profile.group.id}
      projectPath={`/fansubs/${profile.group.slug}/fansubprojekt/${animeSlug}`}
    />
  )
}
