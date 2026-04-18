import type {
  EpisodeImportMappingRow,
  EpisodeImportPreviewResult,
  EpisodeImportPreviewSummary,
} from '../../../../../../types/episodeImport'

export function setMappingTargets(
  rows: EpisodeImportMappingRow[],
  mediaItemId: string,
  rawTargets: string,
): EpisodeImportMappingRow[] {
  void rawTargets

  return rows.map((row) =>
    row.media_item_id === mediaItemId
      ? { ...row, status: 'confirmed' }
      : row,
  )
}

export function markMappingSkipped(
  rows: EpisodeImportMappingRow[],
  mediaItemId: string,
): EpisodeImportMappingRow[] {
  return rows.map((row) =>
    row.media_item_id === mediaItemId
      ? { ...row, target_episode_numbers: [], status: 'skipped' }
      : row,
  )
}

export function detectMappingConflicts(rows: EpisodeImportMappingRow[]): EpisodeImportMappingRow[] {
  return rows
}

export function summarizeImportPreview(
  preview: EpisodeImportPreviewResult,
): EpisodeImportPreviewSummary {
  return {
    canonical_episode_count: preview.canonical_episodes.length,
    media_candidate_count: preview.media_candidates.length,
    suggested_count: preview.mappings.filter((row) => row.status === 'suggested').length,
    confirmed_count: preview.mappings.filter((row) => row.status === 'confirmed').length,
    conflict_count: preview.mappings.filter((row) => row.status === 'conflict').length,
    skipped_count: preview.mappings.filter((row) => row.status === 'skipped').length,
    unmapped_episode_count: preview.unmapped_episodes?.length ?? 0,
    unmapped_media_count: preview.unmapped_media_item_ids?.length ?? 0,
  }
}
