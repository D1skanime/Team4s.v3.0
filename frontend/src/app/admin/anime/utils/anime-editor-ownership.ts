import type { AnimeDetail } from '@/types/anime'

export interface AnimeEditorOwnershipInput extends Pick<AnimeDetail, 'id' | 'title'> {
  source?: string | null
  jellyfinSeriesID?: string | null
  jellyfin_series_id?: string | null
  jellyfinSeriesPath?: string | null
  jellyfin_series_path?: string | null
}

export interface AnimeEditorOwnership {
  label: string
  tone: 'manual' | 'linked'
  hint: string
}

function hasLinkedSource(anime: AnimeEditorOwnershipInput): boolean {
  const source = (anime.source || '').trim().toLowerCase()
  if (source.includes('jellyfin') || (source && source !== 'manual')) {
    return true
  }

  return Boolean(
    (anime.jellyfinSeriesID || '').trim() ||
      (anime.jellyfin_series_id || '').trim() ||
      (anime.jellyfinSeriesPath || '').trim() ||
      (anime.jellyfin_series_path || '').trim(),
  )
}

export function resolveAnimeEditorOwnership(anime: AnimeEditorOwnershipInput): AnimeEditorOwnership {
  if (hasLinkedSource(anime)) {
    const folderName = (anime.jellyfinSeriesPath || anime.jellyfin_series_path || '').trim()
    return {
      label: 'Jellyfin-Provenance aktiv',
      tone: 'linked',
      hint: folderName
        ? `Fill-only Resync bleibt explizit. Manuelle Assets bleiben geschuetzt. Quelle: ${folderName}`
        : 'Fill-only Resync bleibt explizit. Manuelle Assets bleiben geschuetzt.',
    }
  }

  return {
    label: 'Manuell gepflegt',
    tone: 'manual',
    hint: 'Keine persistierte Jellyfin-Verknuepfung aktiv. Aenderungen bleiben manuell gepflegt.',
  }
}
