import type { EpisodeImportSelectedFansubGroup } from '../../../../../../types/episodeImport'

/**
 * Normalization/key helpers for `EpisodeImportSelectedFansubGroup[]` (D-04,
 * 186-CONTEXT.md file-length rule). Extracted verbatim out of
 * `episodeImportMapping.ts` once that file crossed the 450-line ceiling after
 * the D-01 `applyGroupFromHere`/`applyFansubGroupFromEpisodeDown` rewrite --
 * pure refactor, no behavior change. Kept as its own sibling file because
 * these are the shape-normalization/dedup primitives every fansub-group
 * mutation in `episodeImportMapping.ts` builds on, distinct from that file's
 * row-mutation/mapping-status concerns.
 */

export function normalizeFansubGroups(
  fansubGroups: EpisodeImportSelectedFansubGroup[] | null | undefined,
): EpisodeImportSelectedFansubGroup[] {
  const normalized: EpisodeImportSelectedFansubGroup[] = []
  const seen = new Set<string>()

  for (const group of fansubGroups ?? []) {
    const normalizedGroup = normalizeFansubGroup(group)
    if (!normalizedGroup) {
      continue
    }
    const key = getFansubGroupKey(normalizedGroup)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    normalized.push(normalizedGroup)
  }

  return normalized
}

export function getFansubGroupKey(fansubGroup: EpisodeImportSelectedFansubGroup): string {
  if (typeof fansubGroup.id === 'number' && Number.isFinite(fansubGroup.id)) {
    return `id:${fansubGroup.id}`
  }
  return `name:${(fansubGroup.name ?? fansubGroup.slug ?? '').trim().toLowerCase()}`
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeFansubGroup(
  fansubGroup: EpisodeImportSelectedFansubGroup | null | undefined,
): EpisodeImportSelectedFansubGroup | null {
  if (!fansubGroup) {
    return null
  }

  const id = typeof fansubGroup.id === 'number' && Number.isFinite(fansubGroup.id) ? fansubGroup.id : null
  const slug = normalizeOptionalText(fansubGroup.slug ?? '')
  const name = normalizeOptionalText(fansubGroup.name ?? '')

  if (id == null && !name) {
    return null
  }

  return {
    slug,
    name: name ?? slug ?? null,
    ...(id != null ? { id } : {}),
  }
}
