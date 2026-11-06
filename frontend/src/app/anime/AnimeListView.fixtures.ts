import type { AnimeListItem, PaginatedAnimeResponse } from '@/types/anime'

/** Baut einen `AnimeListItem`-Eintrag mit realistischen deutschen Demo-Daten (keine
 *  Lorem-ipsum-Platzhalter) für Storybook-Fixtures der öffentlichen Anime-Liste. */
export function buildAnimeListItem(overrides: Partial<AnimeListItem> = {}): AnimeListItem {
  return {
    id: 1,
    title: 'Frühlingsblüten über Tokio',
    type: 'anime',
    status: 'ongoing',
    year: 2024,
    cover_image: '/covers/placeholder.jpg',
    max_episodes: 12,
    ...overrides,
  }
}

const DEMO_TITLES = [
  'Frühlingsblüten über Tokio',
  'Sternenstaub-Chroniken',
  'Die Wächter des Nebelwalds',
  'Klingen im Morgenlicht',
  'Verlorene Melodien',
  'Schatten über der Hauptstadt',
  'Der letzte Alchemist',
  'Himmelsinseln',
]

function buildDemoItems(count: number): AnimeListItem[] {
  return Array.from({ length: count }, (_, index) =>
    buildAnimeListItem({
      id: index + 1,
      title: DEMO_TITLES[index % DEMO_TITLES.length],
      year: 2018 + (index % 8),
    }),
  )
}

/** Normalfall: eine Seite mit mehreren Einträgen, keine Pagination nötig. */
export const normalResponse: PaginatedAnimeResponse = {
  data: buildDemoItems(7),
  meta: { total: 7, page: 1, per_page: 24, total_pages: 1 },
}

/** Leerer Fall: Filter/Suche liefert keine Treffer. */
export const emptyResponse: PaginatedAnimeResponse = {
  data: [],
  meta: { total: 0, page: 1, per_page: 24, total_pages: 0 },
}

/** Volle Seite mitten in einer langen Liste -- macht `Pagination`s Lückenanzeige sichtbar. */
export const manyPageResponse: PaginatedAnimeResponse = {
  data: buildDemoItems(24),
  meta: { total: 240, page: 3, per_page: 24, total_pages: 10 },
}

/** Ein Eintrag mit sehr langem Titel (>80 Zeichen), um Zeilenumbruch/Kürzung im Grid zu prüfen. */
export const longTitleResponse: PaginatedAnimeResponse = {
  data: [
    buildAnimeListItem({
      id: 1,
      title:
        'Die unglaublich lange Geschichte von den sieben vergessenen Königreichen und ihrem ewigen Winterkrieg',
    }),
    ...buildDemoItems(5).slice(1),
  ],
  meta: { total: 6, page: 1, per_page: 24, total_pages: 1 },
}

/** Ein Eintrag ohne Cover-Bild -- prüft den Platzhalter-/Fallback-Zustand im Grid. */
export const missingCoverResponse: PaginatedAnimeResponse = {
  data: [
    buildAnimeListItem({ id: 1, cover_image: '' }),
    ...buildDemoItems(5).slice(1),
  ],
  meta: { total: 6, page: 1, per_page: 24, total_pages: 1 },
}
