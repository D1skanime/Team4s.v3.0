/**
 * Episode-eigene Einstufung. Canon/Filler und technischer Episodentyp existieren
 * genau einmal pro Episode und gelten für alle Release-Versionen dieser Episode.
 * Beide Dimensionen sind unabhängig; "recap" gibt es bewusst in beiden.
 */

export type EpisodeFillerType = 'unknown' | 'canon' | 'filler' | 'mixed' | 'recap'

export type EpisodeType =
  | 'episode'
  | 'special'
  | 'ova'
  | 'ona'
  | 'movie'
  | 'recap'
  | 'preview'
  | 'prologue'
  | 'epilogue'
  | 'bonus'

export interface EpisodeClassification {
  episode_id: number
  episode_number: string
  filler_type: EpisodeFillerType | null
  filler_type_source: string | null
  episode_type: EpisodeType | null
  episode_type_source: string | null
}

export interface EpisodeClassificationListResponse {
  data: EpisodeClassification[]
}

export const EPISODE_FILLER_TYPE_OPTIONS: ReadonlyArray<{ value: EpisodeFillerType; label: string }> = [
  { value: 'unknown', label: 'Unbekannt' },
  { value: 'canon', label: 'Haupthandlung' },
  { value: 'filler', label: 'Zusatzfolge' },
  { value: 'mixed', label: 'Teilweise Zusatzfolge' },
  { value: 'recap', label: 'Rückblick' },
]

export const EPISODE_TYPE_OPTIONS: ReadonlyArray<{ value: EpisodeType; label: string }> = [
  { value: 'episode', label: 'Episode' },
  { value: 'special', label: 'Special' },
  { value: 'ova', label: 'OVA' },
  { value: 'ona', label: 'ONA' },
  { value: 'movie', label: 'Movie' },
  { value: 'recap', label: 'Recap' },
  { value: 'preview', label: 'Preview' },
  { value: 'prologue', label: 'Prologue' },
  { value: 'epilogue', label: 'Epilogue' },
  { value: 'bonus', label: 'Bonus' },
]
