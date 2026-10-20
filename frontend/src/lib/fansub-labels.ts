import type { FansubGroupLinkType, FansubStatus } from '@/types/fansub'
import type { FansubGroupMediaCategory } from '@/lib/api'

/** AO5-08: zentrale deutsche Labels für Fansub-Gruppenmedien-Kategorien. */
export const FANSUB_MEDIA_CATEGORY_LABELS: Record<FansubGroupMediaCategory, string> = {
  gallery: 'Galerie',
  history_screenshot: 'Historische Screenshots',
  old_website: 'Alte Website',
  forum: 'Forum',
  irc_chat: 'IRC-Chat',
  event_meeting: 'Event / Treffen',
  artwork_fanart: 'Artwork / Fanart',
  other: 'Sonstiges',
}

/**
 * 183-EXTRA (D-02-Nachzug): zentrale Options-Liste für Kategorie-Auswahlfelder, abgeleitet
 * aus FANSUB_MEDIA_CATEGORY_LABELS statt einer vierten/fünften/sechsten eigenen Kopie je
 * Select-Konsument. Reihenfolge entspricht der Objekt-Deklarationsreihenfolge oben.
 */
export const FANSUB_MEDIA_CATEGORY_OPTIONS: Array<{ value: FansubGroupMediaCategory; label: string }> =
  Object.entries(FANSUB_MEDIA_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as FansubGroupMediaCategory,
    label,
  }))

/** AO5-08: zentrale deutsche Labels für Community-Link-Typen. */
export const FANSUB_LINK_TYPE_LABELS: Record<FansubGroupLinkType, string> = {
  website: 'Webseite',
  discord: 'Discord',
  irc: 'IRC',
  twitter: 'Twitter/X',
  github: 'GitHub',
}

const FANSUB_MEDIA_CATEGORY_FALLBACK = 'Sonstiges'

/** Übersetzt eine Medien-Kategorie in ein deutsches Label; unbekannte Werte fallen auf 'Sonstiges' zurück. */
export function getFansubMediaCategoryLabel(category: string): string {
  return FANSUB_MEDIA_CATEGORY_LABELS[category as FansubGroupMediaCategory] ?? FANSUB_MEDIA_CATEGORY_FALLBACK
}

/** Übersetzt einen Community-Link-Typ in ein deutsches Label; unbekannte Werte liefern den Rohwert zurück. */
export function getFansubLinkTypeLabel(linkType: string): string {
  return FANSUB_LINK_TYPE_LABELS[linkType as FansubGroupLinkType] ?? linkType
}

/**
 * 176-EXTRA Scope Addition 3: zentrale deutsche Labels für Fansub-Gruppen-
 * Status. Die gespeicherten Rohwerte (active/inactive/dissolved) bleiben
 * unverändert -- nur die Anzeige in Status-Auswahlfeldern/-Badges wird
 * eingedeutscht. Einziger Label-Helfer für FansubStatus; wird sowohl von der
 * Anlege- als auch von der Bearbeitungsseite (und deren Fansub-Leader-Sicht)
 * verwendet.
 */
export const FANSUB_STATUS_LABELS: Record<FansubStatus, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  dissolved: 'Aufgelöst',
}

/** Übersetzt einen Fansub-Gruppen-Status in sein deutsches Anzeige-Label. */
export function getFansubStatusLabel(status: FansubStatus): string {
  return FANSUB_STATUS_LABELS[status] ?? status
}

/**
 * Phase 189 (D-06/UAT-Nachbesserung): zentrale Überschrift für die Liste der übrigen Gruppen,
 * die denselben Anime getrennt bearbeitet haben. Wird sowohl auf der Projektseite
 * (BacklinksSection, "Mehr entdecken") als auch auf der Release-Liste (OtherGroupsChips)
 * verwendet, damit beide Stellen denselben Satz zeigen statt zwei gepflegter Kopien.
 */
export function getOtherGroupsHeading(animeTitle: string): string {
  return `${animeTitle} wurde auch gesubbt von`
}
