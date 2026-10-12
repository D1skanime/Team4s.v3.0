import { describe, expect, it } from "vitest";

import {
  ANIME_BANNER_CROP_OUTPUT_HEIGHT,
  ANIME_BANNER_CROP_OUTPUT_WIDTH,
  ANIME_COVER_CROP_OUTPUT_HEIGHT,
  ANIME_COVER_CROP_OUTPUT_WIDTH,
  isAnimeCroppableAssetKind,
  resolveAnimeAssetCropConfig,
} from "./animeAssetCropConfig";

describe("resolveAnimeAssetCropConfig", () => {
  it("gives the banner a fixed 5.4:1 crop at 1920x355", () => {
    const config = resolveAnimeAssetCropConfig("banner");
    expect(config).not.toBeNull();
    expect(config?.outputWidth).toBe(ANIME_BANNER_CROP_OUTPUT_WIDTH);
    expect(config?.outputHeight).toBe(ANIME_BANNER_CROP_OUTPUT_HEIGHT);
    expect(config?.aspectRatio).toBeCloseTo(5.4, 1);
  });

  it("gives the cover a fixed 2:3 portrait crop at 1000x1500", () => {
    const config = resolveAnimeAssetCropConfig("cover");
    expect(config).not.toBeNull();
    expect(config?.outputWidth).toBe(ANIME_COVER_CROP_OUTPUT_WIDTH);
    expect(config?.outputHeight).toBe(ANIME_COVER_CROP_OUTPUT_HEIGHT);
    expect(config?.aspectRatio).toBeCloseTo(2 / 3, 5);
  });

  it("gives logo, background and background_video no crop at all", () => {
    expect(resolveAnimeAssetCropConfig("logo")).toBeNull();
    expect(resolveAnimeAssetCropConfig("background")).toBeNull();
    expect(resolveAnimeAssetCropConfig("background_video")).toBeNull();
  });
});

describe("isAnimeCroppableAssetKind", () => {
  it("is true only for cover and banner", () => {
    expect(isAnimeCroppableAssetKind("cover")).toBe(true);
    expect(isAnimeCroppableAssetKind("banner")).toBe(true);
    expect(isAnimeCroppableAssetKind("logo")).toBe(false);
    expect(isAnimeCroppableAssetKind("background")).toBe(false);
    expect(isAnimeCroppableAssetKind("background_video")).toBe(false);
  });
});
