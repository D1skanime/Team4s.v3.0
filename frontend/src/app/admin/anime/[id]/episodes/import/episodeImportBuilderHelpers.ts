// Pure, non-hook helpers extracted out of useEpisodeImportBuilder.ts (CLAUDE.md
// 450-line file-length rule) once the fix_1 D-01 baseline-ref change pushed that
// file to 465 lines. Pure refactor, no behavior change -- these three functions
// (serialize-for-apply, preview normalization, error-message fallback) have no
// dependency on React state/hooks, so they can live independently of the hook
// itself. Public imports are re-pointed at this file in the same commit.

import {
  detectMappingConflicts,
  hasReviewedMediaSource,
  serializeEpisodeImportMappingRow,
} from './episodeImportMapping'
import { applyEinteilerTitlePrefill } from './episodeImportEinteilerTitle'
import type {
  EpisodeImportApplyInput,
  EpisodeImportApplyMappingRow,
  EpisodeImportMappingRow,
  EpisodeImportPreviewResult,
} from '@/types/episodeImport'

export function buildEpisodeImportApplyInput(
  animeID: number,
  preview: EpisodeImportPreviewResult,
  mappings: EpisodeImportMappingRow[],
): EpisodeImportApplyInput {
  const reviewedMappings: EpisodeImportApplyMappingRow[] = []
  for (const row of detectMappingConflicts(mappings, preview.media_candidates ?? [])) {
    if (row.status === 'skipped') {
      reviewedMappings.push({ ...serializeEpisodeImportMappingRow(row), status: 'skipped' })
      continue
    }
    if (row.status !== 'confirmed' || !row.media_source_id?.trim() ||
      !hasReviewedMediaSource(row, preview.media_candidates ?? [])) {
      throw new Error('Die geprüfte Quelle fehlt oder wurde geändert. Bitte die Vorschau erneut laden.')
    }
    reviewedMappings.push({ ...serializeEpisodeImportMappingRow(row), status: 'confirmed', media_source_id: row.media_source_id })
  }
  return {
    anime_id: animeID,
    canonical_episodes: preview.canonical_episodes,
    media_candidates: preview.media_candidates ?? [],
    mappings: reviewedMappings,
  }
}

export function normalizePreviewResult(preview: EpisodeImportPreviewResult): EpisodeImportPreviewResult {
  return {
    ...preview,
    canonical_episodes: applyEinteilerTitlePrefill(
      preview.canonical_episodes ?? [],
      preview.is_einteiler ?? false,
      preview.anime_title,
    ),
    media_candidates: preview.media_candidates ?? [],
    mappings: detectMappingConflicts((preview.mappings ?? []).map((row) => {
      const candidates = (preview.media_candidates ?? []).filter(
        (candidate) => candidate.media_item_id === row.media_item_id,
      )
      // Seed only at the preview boundary. Apply must never repair a lost selector.
      const reviewedRow = {
        ...row,
        media_source_id: row.media_source_id ?? (candidates.length === 1 ? candidates[0].media_source_id : null),
      }
      const detectedGroupName = row.fansub_group_name?.trim()
      if ((row.fansub_groups?.length ?? 0) > 0 || !detectedGroupName) return reviewedRow
      return serializeEpisodeImportMappingRow({
        ...reviewedRow,
        fansub_groups: [{ name: detectedGroupName }],
      })
    }), preview.media_candidates ?? []),
    unmapped_episodes: preview.unmapped_episodes ?? [],
    unmapped_media_item_ids: preview.unmapped_media_item_ids ?? [],
  }
}

export function formatEpisodeImportError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}
