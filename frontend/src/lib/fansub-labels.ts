import type { FansubGroupLinkType } from '@/types/fansub'

/** AO5-08: zentrale deutsche Labels für Fansub-Gruppenmedien-Kategorien. */
export const FANSUB_MEDIA_CATEGORY_LABELS: Record<string, string> = {
  gallery: 'Galerie',
  history_screenshot: 'Historische Screenshots',
  old_website: 'Alte Website',
  forum: 'Forum',
  irc_chat: 'IRC-Chat',
  event_meeting: 'Event / Treffen',
  artwork_fanart: 'Artwork / Fanart',
  other: 'Sonstiges',
}

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
  return FANSUB_MEDIA_CATEGORY_LABELS[category] ?? FANSUB_MEDIA_CATEGORY_FALLBACK
}

/** Übersetzt einen Community-Link-Typ in ein deutsches Label; unbekannte Werte liefern den Rohwert zurück. */
export function getFansubLinkTypeLabel(linkType: string): string {
  return FANSUB_LINK_TYPE_LABELS[linkType as FansubGroupLinkType] ?? linkType
}
