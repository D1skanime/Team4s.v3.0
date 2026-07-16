import type { PublicFansubProject } from '@/types/fansub'

export function buildPublicFansubProjectPath(fansubSlug: string, animeSlug: string): string {
  return `/fansubs/${encodeURIComponent(fansubSlug.trim())}/fansubprojekt/${encodeURIComponent(animeSlug.trim())}`
}

export function buildPublicFansubReleasePath(fansubSlug: string, animeSlug: string, releaseVersionID: number): string {
  return `${buildPublicFansubProjectPath(fansubSlug, animeSlug)}/releases/${releaseVersionID}`
}

export function buildTechnicalFansubReleasePath(animeID: number, groupID: number, releaseVersionID: number): string {
  return `/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}`
}

export function buildFansubReleaseHref(params: { animeID: number; groupID: number; releaseVersionID: number; canonicalProjectPath?: string | null }): string {
  const canonicalProjectPath = params.canonicalProjectPath?.trim().replace(/\/$/, '')
  return canonicalProjectPath
    ? `${canonicalProjectPath}/releases/${params.releaseVersionID}`
    : buildTechnicalFansubReleasePath(params.animeID, params.groupID, params.releaseVersionID)
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
