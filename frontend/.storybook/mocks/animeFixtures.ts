import type { AnimeBackdropResponse, PaginatedAnimeResponse } from '@/types/anime'

/**
 * Gemeinsame Medien-Antwort für Seiten-Stories: entspricht dem öffentlichen Backdrop-Manifest
 * und hält den Anime-Kopf unabhängig von einem erreichbaren Entwicklungs-Backend stabil.
 */
export const animeBackdropManifestFixture: AnimeBackdropResponse = {
  data: {
    anime_id: 1,
    provider: 'jellyfin',
    media_item_id: 'storybook-anime-1',
    backdrops: ['/covers/placeholder.jpg'],
    banner_url: '/covers/placeholder.jpg',
    logo_url: '/covers/placeholder.jpg',
    theme_videos: [],
  },
}

/** Zwei Nachbarn um den aktuellen Anime für die Randnavigation der Detailseiten-Story. */
export const animeNavigationFixture: PaginatedAnimeResponse = {
  data: [
    { id: 12, title: 'Freezing: Erstes Kapitel', type: 'tv', status: 'done', year: 2011, cover_image: '/covers/placeholder.jpg', max_episodes: 12 },
    { id: 13, title: 'Freezing', type: 'tv', status: 'done', year: 2011, cover_image: '/covers/placeholder.jpg', max_episodes: 12 },
    { id: 14, title: 'Freezing: Vibration', type: 'tv', status: 'done', year: 2013, cover_image: '/covers/placeholder.jpg', max_episodes: 12 },
  ],
  meta: { total: 3, page: 1, per_page: 24, total_pages: 1 },
}
