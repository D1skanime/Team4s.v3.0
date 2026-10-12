import type { AdminAnimeAssetKind } from "@/types/admin";

// Scope-Erweiterung Phase 180 (2026-10-12): verbindliche Zuschnitt-Entscheidungen fuer die
// Anime-Assets, analog zum bereits umgesetzten Fansub-Logo/Banner- und Profil-Zuschnitt. Nur
// Cover und Banner bekommen einen festen Zuschnitt; Logo/Background/Background-Video bleiben
// unveraendert ohne Zuschnitt-Schritt.

export const ANIME_BANNER_CROP_OUTPUT_WIDTH = 1920;
export const ANIME_BANNER_CROP_OUTPUT_HEIGHT = 355;
export const ANIME_COVER_CROP_OUTPUT_WIDTH = 1000;
export const ANIME_COVER_CROP_OUTPUT_HEIGHT = 1500;

export type AnimeCroppableAssetKind = "cover" | "banner";

export interface AnimeAssetCropConfig {
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
}

const ANIME_ASSET_CROP_CONFIG: Record<AnimeCroppableAssetKind, AnimeAssetCropConfig> = {
  banner: {
    aspectRatio: ANIME_BANNER_CROP_OUTPUT_WIDTH / ANIME_BANNER_CROP_OUTPUT_HEIGHT,
    outputWidth: ANIME_BANNER_CROP_OUTPUT_WIDTH,
    outputHeight: ANIME_BANNER_CROP_OUTPUT_HEIGHT,
  },
  cover: {
    aspectRatio: ANIME_COVER_CROP_OUTPUT_WIDTH / ANIME_COVER_CROP_OUTPUT_HEIGHT,
    outputWidth: ANIME_COVER_CROP_OUTPUT_WIDTH,
    outputHeight: ANIME_COVER_CROP_OUTPUT_HEIGHT,
  },
};

/**
 * Formatwahl je Asset-Slot: Cover (2:3 hochkant, 1000x1500) und Banner (5,4:1, 1920x355)
 * bekommen einen festen Zuschnitt; Logo/Background/Background-Video liefern `null` -- für sie
 * bleibt der direkte Upload ohne Zuschnitt-Dialog unverändert.
 */
export function resolveAnimeAssetCropConfig(kind: AdminAnimeAssetKind): AnimeAssetCropConfig | null {
  if (kind === "banner" || kind === "cover") {
    return ANIME_ASSET_CROP_CONFIG[kind];
  }
  return null;
}

export function isAnimeCroppableAssetKind(kind: AdminAnimeAssetKind): kind is AnimeCroppableAssetKind {
  return kind === "banner" || kind === "cover";
}
