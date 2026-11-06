/**
 * Zentraler Katalog der rohen Referenzbilder für die Storybook-Kategorie "Bilder/*".
 *
 * Jeder Eintrag steht für genau EINEN Bildtyp aus Team4S (z. B. Anime-Cover) und referenziert
 * eine feste, Jellyfin-unabhängige Bildkopie unter `frontend/public/storybook-bilder/` --
 * `.storybook/main.ts`s `staticDirs: ['../public']` liefert diese Dateien unverändert als
 * statisches Asset aus. Dies ist die EINE zentrale Stelle, aus der jede künftige Grundbaustein-
 * oder Zusammengesetzte-Bausteine-Story ein solches Referenzbild importieren soll, statt den
 * Pfad an mehreren Stellen erneut hart zu codieren -- diese Wiederverwendung in anderen Stories
 * selbst ist noch nicht umgesetzt, nur die zentrale Ablage dafür.
 */
export interface StorybookBildEintrag {
  /** Stabiler, technischer Bezeichner des Bildtyps (z. B. für React-Keys in Listen-Darstellungen). */
  id: string
  /** Menschlich lesbare Typbezeichnung, wird unter dem Bild als Beschriftung gezeigt. */
  bezeichnung: string
  /** Öffentlicher Pfad relativ zu `frontend/public/`, unter dem Storybook und Next.js das Bild ausliefern. */
  pfad: string
  /** Alt-Text für das native `<img>`, beschreibt die konkrete Bildquelle. */
  altText: string
  /**
   * Zeigt das Bild über die volle Breite des Storybook-Bereichs statt mit der für
   * hochkante Bildtypen (z. B. Cover) passenden festen Höchstbreite -- für breitformatige
   * Bildtypen wie Banner, deren Seitenverhältnis bei fester Höchstbreite unnötig klein wirkt.
   */
  vollbreite?: boolean
}

/**
 * Das echte, bereits von Jellyfin bezogene Primärbild des Anime Freezing (Anime-ID 13) --
 * als feste Kopie im Repo abgelegt, damit die zugehörige Story ohne laufende
 * Jellyfin-Verbindung funktioniert.
 */
export const ANIME_COVER_BILD: StorybookBildEintrag = {
  id: 'anime-cover',
  bezeichnung: 'Anime-Cover',
  pfad: '/storybook-bilder/anime-cover-freezing.jpg',
  altText: 'Cover des Anime Freezing, als Jellyfin-Bild bezogen',
}

/**
 * Das Banner-Bild des Anime Freezing -- eine eigenständig in Team4S hochgeladene Datei
 * (Medienordner `media/anime/<id>/banner/`), nicht aus Jellyfin bezogen. Als feste Kopie
 * im Repo abgelegt, damit die zugehörige Story ohne Zugriff auf diesen Medienordner
 * funktioniert.
 */
export const ANIME_BANNER_BILD: StorybookBildEintrag = {
  id: 'anime-banner',
  bezeichnung: 'Anime-Banner',
  pfad: '/storybook-bilder/anime-banner-freezing.jpg',
  altText: 'Banner des Anime Freezing',
  vollbreite: true,
}

/**
 * Sammelstelle aller Bildkatalog-Einträge -- künftige weitere Bildtypen (z. B. Backdrop,
 * Gruppen-Logo) werden hier zusätzlich ergänzt, damit eine vollständige Übersicht entsteht.
 */
export const STORYBOOK_BILD_KATALOG: readonly StorybookBildEintrag[] = [
  ANIME_COVER_BILD,
  ANIME_BANNER_BILD,
]
