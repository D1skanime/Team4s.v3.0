import type { AnimeBackdropResponse, PaginatedAnimeResponse } from '@/types/anime'

/**
 * Gemeinsame Medien-Antwort für Seiten-Stories: entspricht dem öffentlichen Backdrop-Manifest
 * und hält den Anime-Kopf unabhängig von einem erreichbaren Entwicklungs-Backend stabil.
 * Nutzt bewusst /covers/placeholder.png statt .jpg: AnimeMediaProvider normalisiert diese Pfade
 * über resolveAnimeImageURL zur Auslieferungs-Route /covers/display/*, die es im
 * Next-losen Storybook nur als statische Datei unter public/covers/display/ gibt (kein
 * Next-Rewrite/Route-Handler dort) -- .png ist dieselbe bereits geprüft dekodierbare Datei, die
 * resolveAnimeCoverURL (animeBackdrops.ts) selbst als eigenen Fallback nutzt, seit .jpg sich dort
 * als nicht dekodierbar erwies (Commit 159-05).
 */
export const animeBackdropManifestFixture: AnimeBackdropResponse = {
  data: {
    anime_id: 1,
    provider: 'jellyfin',
    media_item_id: 'storybook-anime-1',
    backdrops: ['/covers/placeholder.png'],
    banner_url: '/covers/placeholder.png',
    logo_url: '/covers/placeholder.png',
    theme_videos: [],
  },
}

/** Zwei Nachbarn um den aktuellen Anime für die Randnavigation der Detailseiten-Story. */
export const animeNavigationFixture: PaginatedAnimeResponse = {
  data: [
    { id: 12, title: 'Freezing: Erstes Kapitel', type: 'tv', status: 'done', year: 2011, cover_image: '/covers/placeholder.png', max_episodes: 12 },
    { id: 13, title: 'Freezing', type: 'tv', status: 'done', year: 2011, cover_image: '/covers/placeholder.png', max_episodes: 12 },
    { id: 14, title: 'Freezing: Vibration', type: 'tv', status: 'done', year: 2013, cover_image: '/covers/placeholder.png', max_episodes: 12 },
  ],
  meta: { total: 3, page: 1, per_page: 24, total_pages: 1 },
}
