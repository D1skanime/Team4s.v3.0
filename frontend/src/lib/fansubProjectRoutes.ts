import type { PublicFansubProject } from '@/types/fansub'

export function buildPublicFansubProjectPath(fansubSlug: string, animeSlug: string): string {
  return `/fansubs/${fansubSlug.trim()}/fansubprojekt/${animeSlug.trim()}`
}

export function buildPublicFansubProjectHref(params: {
  project: PublicFansubProject
  groupId: number
  fansubSlug?: string | null
}): string {
  const fansubSlug = params.fansubSlug?.trim()
  const animeSlug = params.project.anime_slug?.trim()

  if (fansubSlug && animeSlug) {
    return buildPublicFansubProjectPath(fansubSlug, animeSlug)
  }

  return `/anime/${params.project.id}/group/${params.groupId}`
}
