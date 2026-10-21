import type { PublicFansubMediaItem } from '@/types/fansub'

/** 190-05 (D-i): die 8 CHECK-Constraint-Kategoriewerte in fester Anzeigereihenfolge. */
const MEDIA_CATEGORY_ORDER = [
  'gallery',
  'history_screenshot',
  'old_website',
  'forum',
  'irc_chat',
  'event_meeting',
  'artwork_fanart',
  'other',
] as const

type MediaCategoryOrderValue = (typeof MEDIA_CATEGORY_ORDER)[number]

export interface FansubMediaCategoryGroup {
  category: string
  items: PublicFansubMediaItem[]
}

/**
 * 190-05 (D-i): reiner Titel-Fallback ohne `media_type` -- das Feld ist in der
 * Live-Datenbank fast immer der generische Wert "image" und darf daher nie als
 * Medientitel erscheinen. Der Parametertyp nimmt `media_type` bewusst gar nicht
 * an, damit die Regression nicht per Konvention, sondern per Typsystem
 * ausgeschlossen ist.
 */
export function resolveFansubMediaTitle(item: Pick<PublicFansubMediaItem, 'title' | 'caption'>): string | null {
  return item.title?.trim() || item.caption?.trim() || null
}

/**
 * 190-05 (D-k): gruppiert Medien nach `category` in fester Reihenfolge
 * (MEDIA_CATEGORY_ORDER). Kategorien ohne Elemente erzeugen keine Gruppe;
 * unbekannte Kategoriewerte landen im "other"-Bucket (spiegelt den Fallback
 * von getFansubMediaCategoryLabel).
 */
export function groupFansubMediaByCategory(media: PublicFansubMediaItem[]): FansubMediaCategoryGroup[] {
  const buckets = new Map<MediaCategoryOrderValue, PublicFansubMediaItem[]>(
    MEDIA_CATEGORY_ORDER.map((category) => [category, []]),
  )

  for (const item of media) {
    const category = MEDIA_CATEGORY_ORDER.includes(item.category as MediaCategoryOrderValue)
      ? (item.category as MediaCategoryOrderValue)
      : 'other'
    buckets.get(category)!.push(item)
  }

  return MEDIA_CATEGORY_ORDER.filter((category) => buckets.get(category)!.length > 0).map((category) => ({
    category,
    items: buckets.get(category)!,
  }))
}

/** 190-09 (D-k, zweite Runde): Vorschau-Limit pro Kategorie -- 2 Zeilen a 3 Kacheln im
 * Desktop-Dreispalter-Raster. */
export const MEDIA_CATEGORY_PREVIEW_LIMIT = 6

export interface FansubMediaCategoryPreview {
  category: string
  visibleItems: PublicFansubMediaItem[]
  hasMore: boolean
  remainingCount: number
}

/**
 * 190-09 (D-k, zweite Runde): begrenzt EINE Kategorie-Gruppe unabhaengig von allen anderen auf
 * `limit` Kacheln, solange sie nicht explizit aufgeklappt ist (`expanded`). Jede Kategorie hat
 * ihr eigenes "Mehr anzeigen" statt eines einzigen globalen Overflow-Elements fuer den gesamten
 * Medienbereich.
 */
export function previewFansubMediaCategoryGroup(
  group: FansubMediaCategoryGroup,
  expanded: boolean,
  limit: number = MEDIA_CATEGORY_PREVIEW_LIMIT,
): FansubMediaCategoryPreview {
  const hasMore = group.items.length > limit
  return {
    category: group.category,
    visibleItems: expanded || !hasMore ? group.items : group.items.slice(0, limit),
    hasMore,
    remainingCount: Math.max(0, group.items.length - limit),
  }
}
