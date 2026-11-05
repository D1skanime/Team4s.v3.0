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
 *
 * `banner_url` verweist bewusst NICHT auf denselben Platzhalter wie Poster/Logo: `AnimeInfoBanner`
 * (AnimeMediaProvider.tsx) rendert sein Bild mit festen `width={600} height={180}` (10:3,
 * Landscape) -- ein wiederverwendetes PORTRAIT-Bild (64x96, 2:3) hat eine eigene, vom Browser
 * bevorzugte Bitmap-Seitenverhältnis-Vorgabe (CSS `aspect-ratio: auto <attr-ratio>` tritt gegenüber
 * einem tatsächlich vorhandenen Bitmap-Seitenverhältnis zurück), wodurch `height:auto` (aus
 * ResponsiveImages `fillWidth`-Prop) nicht die erwarteten 180px, sondern die Portrait-Bitmap-
 * Proportion (Breite * 96/64 = Breite * 1.5) ergab -- bei voller Kartenbreite ein ca. 1600px
 * hoher, vollflächiger Block (live per Playwright vermessen).
 * `placeholder-banner.png` ist derselbe naheinige dunkle Farbton wie `placeholder.png`, nur mit der
 * tatsächlich erwarteten 600x180-Landscape-Form -- kein neues Bildmotiv, nur die korrekte Form.
 */
export const animeBackdropManifestFixture: AnimeBackdropResponse = {
  data: {
    anime_id: 1,
    provider: 'jellyfin',
    media_item_id: 'storybook-anime-1',
    backdrops: ['/covers/placeholder.png'],
    banner_url: '/covers/placeholder-banner.png',
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
