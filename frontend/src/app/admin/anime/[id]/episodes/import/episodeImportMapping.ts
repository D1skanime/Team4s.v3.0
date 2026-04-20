import type {
  EpisodeImportMappingRow,
  EpisodeImportPreviewResult,
  EpisodeImportPreviewSummary,
} from '../../../../../../types/episodeImport'

export function parseMappingTargets(rawTargets: string): number[] {
  const targets = rawTargets
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0)
  return [...new Set(targets)].sort((left, right) => left - right)
}

export function setMappingTargets(
  rows: EpisodeImportMappingRow[],
  mediaItemId: string,
  rawTargets: string,
): EpisodeImportMappingRow[] {
  const targets = parseMappingTargets(rawTargets)

  return detectMappingConflicts(
    rows.map((row) =>
      row.media_item_id === mediaItemId
        ? {
            ...row,
            target_episode_numbers: targets,
            status: targets.length > 0 ? 'confirmed' : 'skipped',
          }
        : row,
    ),
  )
}

export function markMappingSkipped(
  rows: EpisodeImportMappingRow[],
  mediaItemId: string,
): EpisodeImportMappingRow[] {
  return detectMappingConflicts(
    rows.map((row) =>
      row.media_item_id === mediaItemId
        ? { ...row, target_episode_numbers: [], status: 'skipped' }
        : row,
    ),
  )
}

/**
 * Bulk-skip all rows that are still in 'suggested' state.
 * Useful for quickly clearing unresolved automatic suggestions.
 */
export function markAllSuggestedSkipped(rows: EpisodeImportMappingRow[]): EpisodeImportMappingRow[] {
  return detectMappingConflicts(
    rows.map((row) =>
      row.status === 'suggested'
        ? { ...row, target_episode_numbers: [], status: 'skipped' }
        : row,
    ),
  )
}

/**
 * Bulk-confirm all rows that are still in 'suggested' state.
 * Accepts the preview suggestion targets as-is.
 */
export function markAllSuggestedConfirmed(rows: EpisodeImportMappingRow[]): EpisodeImportMappingRow[] {
  return detectMappingConflicts(
    rows.map((row) =>
      row.status === 'suggested'
        ? { ...row, status: 'confirmed' }
        : row,
    ),
  )
}

/**
 * Confirm all rows that have a given episode number in their suggested targets.
 * Used for per-episode quick-confirm in the grouped workbench.
 */
export function confirmEpisodeMappingRows(
  rows: EpisodeImportMappingRow[],
  episodeNumber: number,
): EpisodeImportMappingRow[] {
  return detectMappingConflicts(
    rows.map((row) => {
      if (
        (row.status === 'suggested' || row.status === 'conflict') &&
        (row.suggested_episode_numbers ?? []).includes(episodeNumber)
      ) {
        return { ...row, status: 'confirmed' }
      }
      return row
    }),
  )
}

/**
 * Skip all rows that have a given episode number in their suggested targets.
 * Used for per-episode quick-skip in the grouped workbench.
 */
export function skipEpisodeMappingRows(
  rows: EpisodeImportMappingRow[],
  episodeNumber: number,
): EpisodeImportMappingRow[] {
  return detectMappingConflicts(
    rows.map((row) => {
      if ((row.suggested_episode_numbers ?? []).includes(episodeNumber)) {
        return { ...row, target_episode_numbers: [], status: 'skipped' }
      }
      return row
    }),
  )
}

export function detectMappingConflicts(rows: EpisodeImportMappingRow[]): EpisodeImportMappingRow[] {
  const claimCounts = new Map<number, number>()
  rows.forEach((row) => {
    if (row.status === 'skipped') return
    ;(row.target_episode_numbers ?? []).forEach((episodeNumber) => {
      claimCounts.set(episodeNumber, (claimCounts.get(episodeNumber) ?? 0) + 1)
    })
  })

  return rows.map((row) => {
    if (row.status === 'skipped') return row
    const hasConflict = (row.target_episode_numbers ?? []).some((episodeNumber) => (claimCounts.get(episodeNumber) ?? 0) > 1)
    if (hasConflict) return { ...row, status: 'conflict' }
    if (row.status === 'conflict') return { ...row, status: 'confirmed' }
    return row
  })
}

export function summarizeImportPreview(
  preview: EpisodeImportPreviewResult,
): EpisodeImportPreviewSummary {
  return {
    canonical_episode_count: (preview.canonical_episodes ?? []).length,
    media_candidate_count: (preview.media_candidates ?? []).length,
    suggested_count: (preview.mappings ?? []).filter((row) => row.status === 'suggested').length,
    confirmed_count: (preview.mappings ?? []).filter((row) => row.status === 'confirmed').length,
    conflict_count: (preview.mappings ?? []).filter((row) => row.status === 'conflict').length,
    skipped_count: (preview.mappings ?? []).filter((row) => row.status === 'skipped').length,
    unmapped_episode_count: preview.unmapped_episodes?.length ?? 0,
    unmapped_media_count: preview.unmapped_media_item_ids?.length ?? 0,
  }
}
