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

export function buildTechnicalFansubProjectPath(animeID: number, groupID: number): string {
  return `/anime/${animeID}/group/${groupID}`
}

export function buildFansubReleaseHref(params: { animeID: number; groupID: number; releaseVersionID: number; canonicalProjectPath?: string | null }): string {
  const canonicalProjectPath = params.canonicalProjectPath?.trim().replace(/\/$/, '')
  return canonicalProjectPath
    ? `${canonicalProjectPath}/releases/${params.releaseVersionID}`
    : buildTechnicalFansubReleasePath(params.animeID, params.groupID, params.releaseVersionID)
}

export function buildFansubReleasePlaybackLoginHref(params: {
  animeID: number
  groupID: number
  releaseVersionID: number
  segmentID: number
  canonicalProjectPath?: string | null
}): string {
  const releaseHref = buildFansubReleaseHref(params)
  const target = `${releaseHref}?kara=${params.segmentID}&autoplay=1#op-ed-middle`
  return `/login?next=${encodeURIComponent(target)}`
}

/**
 * Phase 189 (UAT-Nachbesserung): kanonisches Link-Ziel für eine Fansub-Gruppe
 * bei einem bestimmten Anime, mit Rückfall auf den technischen Pfad nur wenn
 * einer der beiden Slugs fehlt. Primitive Felder (groupSlug/animeSlug/
 * animeID/groupID) statt eines vollen PublicFansubProject-Objekts, damit
 * Aufrufstellen ohne ein solches Objekt (Coop-Partner-Links, "Mehr
 * entdecken") sie direkt nutzen können; buildPublicFansubProjectHref
 * unten delegiert hierher, um dieselbe Rückfalllogik nicht zu duplizieren.
 */
export function buildFansubProjectPath(params: {
  groupSlug?: string | null
  animeSlug?: string | null
  animeID: number
  groupID: number
}): string {
  const groupSlug = params.groupSlug?.trim()
  const animeSlug = params.animeSlug?.trim()

  if (groupSlug && animeSlug) {
    return buildPublicFansubProjectPath(groupSlug, animeSlug)
  }

  return buildTechnicalFansubProjectPath(params.animeID, params.groupID)
}

export function buildPublicFansubProjectHref(params: {
  project: PublicFansubProject
  groupId: number
  fansubSlug?: string | null
}): string {
  return buildFansubProjectPath({
    groupSlug: params.fansubSlug,
    animeSlug: params.project.anime_slug,
    animeID: params.project.id,
    groupID: params.groupId,
  })
}

export function buildPublicFansubProjectMemberPath(
  fansubSlug: string,
  animeSlug: string,
  memberSlug: string,
): string {
  return `${buildPublicFansubProjectPath(fansubSlug, animeSlug)}/mitwirkende/${encodeURIComponent(memberSlug.trim())}`
}
