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
  /**
   * Name des konkreten Anime, von dem dieses Beispielbild stammt -- nur gesetzt, wenn ein
   * Bildtyp (z. B. Anime-Banner) mehrere Beispielbilder verschiedener Anime im Katalog hat,
   * damit eine Galerie-Story die Bilder zusätzlich zur Typbezeichnung unterscheidbar
   * beschriften kann.
   */
  animeName?: string
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
  animeName: 'Freezing',
}

/**
 * Das Banner-Bild des Anime Naruto -- weiteres Beispielbild desselben Bildtyps wie
 * {@link ANIME_BANNER_BILD}, damit die Banner-Galerie-Story mehrere echte Banner
 * unterschiedlicher Seitenverhältnisse und Bildausschnitte nebeneinander zeigen kann.
 */
export const ANIME_BANNER_BILD_NARUTO: StorybookBildEintrag = {
  id: 'anime-banner-naruto',
  bezeichnung: 'Anime-Banner',
  pfad: '/storybook-bilder/anime-banner-naruto.jpg',
  altText: 'Banner des Anime Naruto',
  vollbreite: true,
  animeName: 'Naruto',
}

/**
 * Das Banner-Bild des Anime Accel World: Infinite Burst -- weiteres Beispielbild desselben
 * Bildtyps wie {@link ANIME_BANNER_BILD}.
 */
export const ANIME_BANNER_BILD_ACCEL_WORLD: StorybookBildEintrag = {
  id: 'anime-banner-accel-world-infinite-burst',
  bezeichnung: 'Anime-Banner',
  pfad: '/storybook-bilder/anime-banner-accel-world-infinite-burst.jpg',
  altText: 'Banner des Anime Accel World: Infinite Burst',
  vollbreite: true,
  animeName: 'Accel World: Infinite Burst',
}

/**
 * Das Banner-Bild des Anime 11eyes -- weiteres Beispielbild desselben Bildtyps wie
 * {@link ANIME_BANNER_BILD}.
 */
export const ANIME_BANNER_BILD_11EYES: StorybookBildEintrag = {
  id: 'anime-banner-11eyes',
  bezeichnung: 'Anime-Banner',
  pfad: '/storybook-bilder/anime-banner-11eyes.jpg',
  altText: 'Banner des Anime 11eyes',
  vollbreite: true,
  animeName: '11eyes',
}

/**
 * Alle Anime-Banner-Beispielbilder im Katalog, Freezing zuerst (das ursprüngliche, bereits
 * an anderer Stelle referenzierte Beispielbild) -- für Stories, die mehrere echte Banner
 * gemeinsam zeigen wollen (Banner-Galerie, FocalCarousel-Demo mit echten Bildern statt
 * Platzhaltern).
 */
export const ANIME_BANNER_BILDER: readonly StorybookBildEintrag[] = [
  ANIME_BANNER_BILD,
  ANIME_BANNER_BILD_NARUTO,
  ANIME_BANNER_BILD_ACCEL_WORLD,
  ANIME_BANNER_BILD_11EYES,
]

/**
 * Das Logo-Bild des Anime Freezing -- eine eigenständig in Team4S hochgeladene Datei
 * (Medienordner `media/anime/<id>/logo/`), nicht aus Jellyfin bezogen. Transparentes PNG,
 * als feste Kopie im Repo abgelegt, damit die zugehörige Story ohne Zugriff auf diesen
 * Medienordner funktioniert.
 */
export const ANIME_LOGO_BILD: StorybookBildEintrag = {
  id: 'anime-logo',
  bezeichnung: 'Anime-Logo',
  pfad: '/storybook-bilder/anime-logo-freezing.png',
  altText: 'Logo des Anime Freezing, transparentes PNG',
}

/**
 * Das Hintergrundbild (Backdrop) des Anime Freezing -- eine eigenständig in Team4S
 * hochgeladene Datei (Medienordner `media/anime/<id>/background/`), nicht aus Jellyfin
 * bezogen. Als feste Kopie im Repo abgelegt, damit die zugehörige Story ohne Zugriff auf
 * diesen Medienordner funktioniert.
 */
export const ANIME_HINTERGRUND_BILD: StorybookBildEintrag = {
  id: 'anime-hintergrund',
  bezeichnung: 'Anime-Hintergrund',
  pfad: '/storybook-bilder/anime-hintergrund-freezing.jpg',
  altText: 'Hintergrundbild des Anime Freezing',
  vollbreite: true,
}

/**
 * Das Banner-Bild der Fansub-Gruppe Bloody-Shadow -- eine eigenständig in Team4S hochgeladene
 * Datei (Medienordner `media/fansub/<id>/banner/`), nicht aus Jellyfin bezogen. Als feste Kopie
 * im Repo abgelegt, damit die zugehörige Story ohne Zugriff auf diesen Medienordner funktioniert.
 */
export const FANSUB_BANNER_BILD: StorybookBildEintrag = {
  id: 'fansub-banner',
  bezeichnung: 'Fansub-Banner',
  pfad: '/storybook-bilder/fansub-banner-bloody-shadow.jpg',
  altText: 'Banner der Fansub-Gruppe Bloody-Shadow',
  vollbreite: true,
}

/**
 * Das Logo-Bild der Fansub-Gruppe Bloody-Shadow -- eine eigenständig in Team4S hochgeladene
 * Datei (Medienordner `media/fansub/<id>/logo/`), nicht aus Jellyfin bezogen. Quadratisches PNG,
 * als feste Kopie im Repo abgelegt, damit die zugehörige Story ohne Zugriff auf diesen
 * Medienordner funktioniert -- dient zugleich als Beispielbild für den Avatar-Grundbaustein.
 */
export const FANSUB_LOGO_BILD: StorybookBildEintrag = {
  id: 'fansub-logo',
  bezeichnung: 'Fansub-Logo',
  pfad: '/storybook-bilder/fansub-logo-bloody-shadow.png',
  altText: 'Logo der Fansub-Gruppe Bloody-Shadow',
}

/**
 * Sammelstelle aller Bildkatalog-Einträge -- künftige weitere Bildtypen (z. B. Backdrop,
 * Gruppen-Logo) werden hier zusätzlich ergänzt, damit eine vollständige Übersicht entsteht.
 */
export const STORYBOOK_BILD_KATALOG: readonly StorybookBildEintrag[] = [
  ANIME_COVER_BILD,
  ANIME_BANNER_BILD,
  ANIME_LOGO_BILD,
  ANIME_HINTERGRUND_BILD,
  FANSUB_BANNER_BILD,
  FANSUB_LOGO_BILD,
]
