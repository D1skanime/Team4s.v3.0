import type {
  EpisodeImportCanonicalEpisode,
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
  return rows.map((row) => {
    if (row.status === 'skipped') return row
    if (row.status === 'conflict') return { ...row, status: 'confirmed' }
    return row
  })
}

export function setMappingReleaseMeta(
  rows: EpisodeImportMappingRow[],
  mediaItemID: string,
  meta: { fansubGroupName?: string; releaseVersion?: string },
): EpisodeImportMappingRow[] {
  return rows.map((row) =>
    row.media_item_id === mediaItemID
      ? {
          ...row,
          fansub_group_name:
            meta.fansubGroupName !== undefined ? (meta.fansubGroupName || null) : row.fansub_group_name,
          release_version:
            meta.releaseVersion !== undefined ? (meta.releaseVersion || null) : row.release_version,
        }
      : row,
  )
}

export function applyFansubGroupToEpisodeRows(
  rows: EpisodeImportMappingRow[],
  episodeNumber: number,
  fansubGroupName: string,
): EpisodeImportMappingRow[] {
  const normalized = normalizeOptionalText(fansubGroupName)
  return rows.map((row) =>
    (row.suggested_episode_numbers ?? []).includes(episodeNumber)
      ? { ...row, fansub_group_name: normalized }
      : row,
  )
}

export function applyFansubGroupFromEpisodeDown(
  rows: EpisodeImportMappingRow[],
  episodeNumber: number,
  fansubGroupName: string,
): EpisodeImportMappingRow[] {
  const normalized = normalizeOptionalText(fansubGroupName)
  return rows.map((row) => {
    const suggestedEpisode = row.suggested_episode_numbers?.[0]
    return suggestedEpisode != null && suggestedEpisode >= episodeNumber
      ? { ...row, fansub_group_name: normalized }
      : row
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

/**
 * Return the operator-facing display title for a canonical episode.
 * The import UI intentionally shows only the German title when available;
 * other language variants are still persisted on apply, but not surfaced here.
 */
export function resolveEpisodeDisplayTitle(ep: EpisodeImportCanonicalEpisode): string | null {
  if (ep.titles_by_language) {
    const german = ep.titles_by_language['de']
    if (german) return german
  }
  return ep.title ?? ep.existing_title ?? null
}

/**
 * Return a human-readable filler label for display in the workbench.
 * Returns null for 'canon' episodes so the badge is not rendered.
 */
export function fillerLabel(fillerType: string | null | undefined): string | null {
  switch (fillerType) {
    case 'filler': return 'Filler'
    case 'mixed': return 'Gemischt'
    case 'recap': return 'Recap'
    case 'unknown': return 'Unbekannt'
    case 'canon':
    case null:
    case undefined:
      return null
    default: return fillerType
  }
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
