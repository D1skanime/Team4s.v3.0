import { notFound } from 'next/navigation'

import { ProjectMemberPage } from '@/components/fansubs/projectMember/ProjectMemberPage'
import { ApiError, getGroupDetail, getProjectMemberSummary, resolveFansubProject } from '@/lib/api'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

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

  let resolution: Awaited<ReturnType<typeof resolveFansubProject>>
  try {
    resolution = await resolveFansubProject(fansubSlug, animeSlug)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }

  // The resolver's own sibling-projects list always includes the current project (the one
  // matching resolution.data.anime_slug) with its title. Narrowed via find()+guard rather than
  // an inline `.find(...)?.title` because ProjectMemberPageProps.animeTitle is a required,
  // non-optional string under tsconfig's strict mode.
  const currentProject = resolution.data.projects.find(
    (project) => project.anime_slug === resolution.data.anime_slug,
  )
  if (!currentProject) return notFound()

  let groupDetail: Awaited<ReturnType<typeof getGroupDetail>>
  try {
    groupDetail = await getGroupDetail(resolution.data.anime_id, resolution.data.group_id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }

  let summary: Awaited<ReturnType<typeof getProjectMemberSummary>>
  try {
    summary = await getProjectMemberSummary(resolution.data.anime_id, resolution.data.group_id, memberSlug)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    throw error
  }

  return (
    <ProjectMemberPage
      summary={summary}
      memberSlug={memberSlug}
      groupName={groupDetail.data.fansub.name}
      groupSlug={fansubSlug}
      animeTitle={currentProject.title}
      animeID={resolution.data.anime_id}
      groupID={resolution.data.group_id}
      projectPath={buildPublicFansubProjectPath(fansubSlug, resolution.data.anime_slug)}
    />
  )
}
