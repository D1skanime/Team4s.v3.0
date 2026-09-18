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

/**
 * Code+Label-Paar einer der beiden Einstufungs-Lookup-Tabellen
 * (episode_filler_types/episode_types), wie vom Admin-Lookup-Endpunkt
 * geliefert (GAP-11). Ersetzt die früher hier hartcodierten Label-Arrays.
 */
export interface EpisodeClassificationOption {
  code: string
  label: string
}

export interface EpisodeClassificationOptionsResponse {
  data: {
    filler_types: EpisodeClassificationOption[]
    episode_types: EpisodeClassificationOption[]
  }
}
