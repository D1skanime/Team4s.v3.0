import {
  ANIME_BANNER_BILD,
  ANIME_COVER_BILD,
  ANIME_HINTERGRUND_BILD,
  ANIME_LOGO_BILD,
  type StorybookBildEintrag,
} from '@/lib/storybookBildKatalog'
import type { AnimeBackdropResponse, PaginatedAnimeResponse } from '@/types/anime'

/**
 * Bildet einen Bildkatalog-Eintrag (storybookBildKatalog.ts, Pfade unter `/storybook-bilder/`)
 * auf denselben Dateinamen innerhalb der Auslieferungs-Route `/covers/` ab. AnimeMediaProvider
 * löst Hintergrund-/Banner-/Logo-Pfade ausschließlich über resolveAnimeImageURL
 * (animeBackdrops.ts) auf, dessen `staticDisplayURL` nur die Namensräume `/covers/(display/)?*`,
 * `/media/anime/*` und `/api/v1/media/files/*` kennt -- jeder andere Pfad (also auch der
 * Katalogpfad unverändert) fällt lautlos auf den Platzhalter zurück. Die zugehörige Bilddatei
 * muss deshalb zusätzlich unter `public/covers/display/<dateiname>` liegen: Storybook hat keinen
 * Next-Rewrite/Route-Handler für diese Auslieferungs-Route, sondern liefert ausschließlich
 * statische Dateien aus `public/` aus (siehe `animeFixtures.test.ts`).
 */
function alsAuslieferungsPfad(bild: StorybookBildEintrag): string {
  return '/covers/' + bild.pfad.replace(/^\/storybook-bilder\//, '')
}

/**
 * Gemeinsame Medien-Antwort für Seiten-Stories: entspricht dem öffentlichen Backdrop-Manifest
 * und hält den Anime-Kopf unabhängig von einem erreichbaren Entwicklungs-Backend stabil. Nutzt
 * die echten Freezing-Produktionsbilder aus dem zentralen Bildkatalog (Hintergrund als
 * Backdrop, echter Banner-Upload, echtes transparentes Logo) statt synthetischer Platzhalter --
 * `banner_url` profitiert davon zusätzlich fachlich: `AnimeInfoBanner` (AnimeMediaProvider.tsx)
 * rendert sein Bild mit festen `width={600} height={180}` (10:3, Landscape); ein echter
 * Landscape-Banner-Upload passt zu dieser Form, anders als ein wiederverwendetes Portrait-Cover.
 */
export const animeBackdropManifestFixture: AnimeBackdropResponse = {
  data: {
    anime_id: 1,
    provider: 'jellyfin',
    media_item_id: 'storybook-anime-1',
    backdrops: [alsAuslieferungsPfad(ANIME_HINTERGRUND_BILD)],
    banner_url: alsAuslieferungsPfad(ANIME_BANNER_BILD),
    logo_url: alsAuslieferungsPfad(ANIME_LOGO_BILD),
    theme_videos: [],
  },
}

/** Zwei Nachbarn um den aktuellen Anime für die Randnavigation der Detailseiten-Story. */
export const animeNavigationFixture: PaginatedAnimeResponse = {
  data: [
    { id: 12, title: 'Freezing: Erstes Kapitel', type: 'tv', status: 'done', year: 2011, cover_image: ANIME_COVER_BILD.pfad, max_episodes: 12 },
    { id: 13, title: 'Freezing', type: 'tv', status: 'done', year: 2011, cover_image: ANIME_COVER_BILD.pfad, max_episodes: 12 },
    { id: 14, title: 'Freezing: Vibration', type: 'tv', status: 'done', year: 2013, cover_image: ANIME_COVER_BILD.pfad, max_episodes: 12 },
  ],
  meta: { total: 3, page: 1, per_page: 24, total_pages: 1 },
}
