import type { FansubGroupSummary } from '@/types/fansub'
import type { PublicEpisodeVersion, PublicGroupedEpisode } from '@/types/episodeVersion'

type FillerType = PublicGroupedEpisode['filler_type']
type EpisodeType = PublicGroupedEpisode['episode_type']

const CLASSIFICATION_LABELS: Record<FillerType, string | null> = {
  canon: 'Haupthandlung',
  filler: 'Filler',
  mixed: 'Gemischt',
  recap: 'Rückblick',
  unknown: null,
}

// D-04: episode_type=recap und filler_type=recap koennen gleichzeitig auftreten -- bewusst ein
// anderer deutscher Wortlaut als classificationLabel('recap'), sonst "Rückblick · Rückblick".
const EPISODE_TYPE_LABELS: Record<EpisodeType, string> = {
  episode: 'Episode',
  special: 'Special',
  ova: 'OVA',
  ona: 'ONA',
  movie: 'Film',
  recap: 'Rückblickfolge',
  preview: 'Vorschau',
  prologue: 'Prolog',
  epilogue: 'Epilog',
  bonus: 'Bonus',
}

const TECH_VALUE_FALLBACK = 'Unbekannt'

export function classificationLabel(fillerType: FillerType): string | null {
  return CLASSIFICATION_LABELS[fillerType] ?? null
}

export function episodeTypeLabel(episodeType: EpisodeType): string {
  return EPISODE_TYPE_LABELS[episodeType] ?? episodeType
}

/** UI-SPEC decision 4: unknown-Klassifikation zeigt ausschliesslich den Episodentyp. */
export function classificationAndTypeLine(fillerType: FillerType, episodeType: EpisodeType): string {
  const classification = classificationLabel(fillerType)
  const type = episodeTypeLabel(episodeType)
  return classification ? `${classification} · ${type}` : type
}

/** UI-SPEC decision 8: reiner Fliesstext, kein "+"-Praefix, keine Pille. */
export function formatVersionCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'Version' : 'Versionen'}`
}

/** UI-SPEC decision 10: fehlende Einzelwerte fallen einheitlich auf "Unbekannt" zurueck. */
export function formatTechValue(value?: string | null): string {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : TECH_VALUE_FALLBACK
}

export function formatSubtitleType(value?: string | null): string {
  if (value === 'softsub') return 'Softsub'
  if (value === 'hardsub') return 'Hardsub'
  return formatTechValue(null)
}

/** D-14: fehlt das Datum, wird die gesamte Zeile weggelassen -- null signalisiert das dem Aufrufer. */
export function formatReleaseDateLine(value?: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const formatted = parsed.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return `Veröffentlicht am ${formatted}`
}

export function resolveLogoUrl(raw?: string | null): string | null {
  const value = (raw || '').trim()
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  return `/covers/${value}`
}

export function resolveEpisodeTitle(episode: PublicGroupedEpisode, summaryVersion: PublicEpisodeVersion | null): string {
  const explicitTitle = (episode.episode_title || '').trim()
  if (explicitTitle) return explicitTitle
  const summaryTitle = (summaryVersion?.title || '').trim()
  if (summaryTitle) return summaryTitle
  return `Folge ${episode.episode_number}`
}

export function resolveReleaseName(version: PublicEpisodeVersion): string {
  const explicit = (version.title || '').trim()
  if (explicit) return explicit
  return `Release #${version.release_version_id}`
}

/**
 * D-11: fansub_groups kommt vom Server bereits nach `ORDER BY fg.name, fg.id` sortiert -- die
 * alphabetisch erste Gruppe traegt den "Zum Release"-Link, ohne eine Primaergruppe zu erfinden.
 * Sortiert hier defensiv erneut (statt sich auf die Server-Reihenfolge zu verlassen): Aufrufer
 * duerfen nicht annehmen, dass das Array immer vorsortiert ankommt, auch wenn das heute stets
 * der Fall ist (164-06 Task 2, RESEARCH.md Assumption A2).
 */
export function resolveCoopLinkGroupId(fansubGroups: FansubGroupSummary[] | undefined): number | null {
  if (!fansubGroups || fansubGroups.length === 0) return null
  return [...fansubGroups].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)[0].id
}
