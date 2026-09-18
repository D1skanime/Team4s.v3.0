import type { FansubGroupSummary } from '@/types/fansub'
import type { PublicEpisodeVersion, PublicGroupedEpisode } from '@/types/episodeVersion'

/**
 * GAP-11: Anzeigenamen kommen ausschliesslich von der DB (episode_filler_types.label /
 * episode_types.label, 164-10) -- keine hardcodierte Frontend-Map mehr. Die
 * unknown-Klassifikation-versteckt-sich-Regel (UI-SPEC decision 4) bleibt am stabilen Code
 * `filler_type === 'unknown'` festgemacht, nicht am Label-Text, da die DB inzwischen auch fuer
 * "unknown" ein nicht-leeres Label liefert.
 */
export function classificationAndTypeLine(
  episode: Pick<PublicGroupedEpisode, 'filler_type' | 'filler_type_label' | 'episode_type_label'>,
): string {
  if (episode.filler_type === 'unknown') return episode.episode_type_label
  return `${episode.filler_type_label} · ${episode.episode_type_label}`
}

/** UI-SPEC decision 8: reiner Fliesstext, kein "+"-Praefix, keine Pille. */
export function formatVersionCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'Version' : 'Versionen'}`
}

/**
 * GAP-03: fehlende Einzelwerte werden nicht mehr auf "Unbekannt" abgebildet -- null signalisiert
 * dem Aufrufer, den Wert (und ggf. die ganze Technikzeile) vollstaendig wegzulassen.
 */
export function formatTechValue(value?: string | null): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export function formatSubtitleType(value?: string | null): string | null {
  if (value === 'softsub') return 'Softsub'
  if (value === 'hardsub') return 'Hardsub'
  return null
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
  return `Fansub-Release vom ${formatted}`
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

/** GAP-02: der Release-Name kommt immer vom Backend (164-08); kein client-seitiges Titel-/ID-Fallback mehr. */
export function resolveReleaseName(version: PublicEpisodeVersion): string {
  return version.release_name
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
