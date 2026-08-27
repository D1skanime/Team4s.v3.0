interface BulkEpisode {
  id: number
  episode_number: string
}

interface BulkFansubGroup {
  id: number
  name?: string
}

interface BulkReleaseVersion {
  id: number
  fansub_groups?: BulkFansubGroup[]
}

interface BulkGroupedEpisode {
  episode_number: number
  versions: BulkReleaseVersion[]
}

interface BuildBulkFansubGroupAssignmentsInput {
  selectedEpisodeIDs: Record<number, true>
  episodes: BulkEpisode[]
  groupedEpisodes: BulkGroupedEpisode[]
  fansubGroupID: number
}

export interface BulkFansubGroupAssignment {
  versionID: number
  fansubGroups: Array<{ id: number }>
}

export interface BulkFansubGroupAssignmentResult {
  assignments: BulkFansubGroupAssignment[]
  skippedEpisodeIDs: number[]
}

export function buildBulkFansubGroupAssignments({
  selectedEpisodeIDs,
  episodes,
  groupedEpisodes,
  fansubGroupID,
}: BuildBulkFansubGroupAssignmentsInput): BulkFansubGroupAssignmentResult {
  const groupedByEpisodeNumber = new Map(groupedEpisodes.map((episode) => [episode.episode_number, episode]))
  const assignments: BulkFansubGroupAssignment[] = []
  const skippedEpisodeIDs: number[] = []

  for (const episode of episodes) {
    if (!selectedEpisodeIDs[episode.id]) continue

    const episodeNumber = Number.parseInt(episode.episode_number, 10)
    const groupedEpisode = Number.isFinite(episodeNumber) ? groupedByEpisodeNumber.get(episodeNumber) : undefined
    if (!groupedEpisode || groupedEpisode.versions.length === 0) {
      skippedEpisodeIDs.push(episode.id)
      continue
    }

    for (const version of groupedEpisode.versions) {
      const existingGroupIDs = new Set(
        (version.fansub_groups ?? [])
          .map((group) => group.id)
          .filter((groupID) => Number.isFinite(groupID) && groupID > 0),
      )
      existingGroupIDs.add(fansubGroupID)
      assignments.push({
        versionID: version.id,
        fansubGroups: Array.from(existingGroupIDs, (id) => ({ id })),
      })
    }
  }

  return { assignments, skippedEpisodeIDs }
}
