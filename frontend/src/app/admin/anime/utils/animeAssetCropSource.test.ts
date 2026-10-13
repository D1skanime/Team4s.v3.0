import { describe, expect, it } from "vitest";

import { deriveOriginalCropCandidates, resolveAnimeAssetCropSource } from "./animeAssetCropSource";

const API_BASE_URL = "http://192.168.235.196:18092";

describe("resolveAnimeAssetCropSource", () => {
  it("leaves a relative rehosted-upload path unchanged", () => {
    const result = resolveAnimeAssetCropSource("/media/anime/7/cover/original.jpg", API_BASE_URL);
    expect(result).toEqual({ fetchable: true, url: "/media/anime/7/cover/original.jpg" });
  });

  it("leaves the relative Jellyfin-image-proxy path unchanged", () => {
    const rawUrl = "/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin";
    const result = resolveAnimeAssetCropSource(rawUrl, API_BASE_URL);
    expect(result).toEqual({ fetchable: true, url: rawUrl });
  });

  it("strips the known backend origin from an absolute Jellyfin-image-proxy URL down to pathname+search", () => {
    const rawUrl = `${API_BASE_URL}/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin`;
    const result = resolveAnimeAssetCropSource(rawUrl, API_BASE_URL);
    expect(result).toEqual({
      fetchable: true,
      url: "/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin",
    });
  });

  it("strips the known backend origin from an absolute rehosted-upload URL", () => {
    const rawUrl = `${API_BASE_URL}/media/anime/2/banner/some-uuid/display.jpg`;
    const result = resolveAnimeAssetCropSource(rawUrl, API_BASE_URL);
    expect(result).toEqual({ fetchable: true, url: "/media/anime/2/banner/some-uuid/display.jpg" });
  });

  it("rejects an absolute URL whose origin is a genuinely foreign host", () => {
    const result = resolveAnimeAssetCropSource("https://image.tmdb.org/t/p/original/poster.jpg", API_BASE_URL);
    expect(result).toEqual({ fetchable: false });
  });

  it("rejects an absolute URL on the same hostname but a different port (not actually the same origin)", () => {
    const result = resolveAnimeAssetCropSource("http://192.168.235.196:9999/media/anime/2/cover/x/display.jpg", API_BASE_URL);
    expect(result).toEqual({ fetchable: false });
  });

  it("rejects an absolute URL when no known API base is given to compare against", () => {
    const result = resolveAnimeAssetCropSource(`${API_BASE_URL}/media/anime/2/cover/x/display.jpg`, "");
    expect(result).toEqual({ fetchable: false });
  });

  it("treats a missing or empty url as not fetchable", () => {
    expect(resolveAnimeAssetCropSource(undefined, API_BASE_URL)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource(null, API_BASE_URL)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("", API_BASE_URL)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("   ", API_BASE_URL)).toEqual({ fetchable: false });
  });

  it("does not throw on a malformed absolute-looking value", () => {
    expect(resolveAnimeAssetCropSource("http://", API_BASE_URL)).toEqual({ fetchable: false });
  });

  it("rejects a protocol-relative URL instead of treating its leading slash as a safe relative path (security-review finding 2026-10-13)", () => {
    const result = resolveAnimeAssetCropSource("//evil.example.com/cover.jpg", API_BASE_URL);
    expect(result).toEqual({ fetchable: false });
  });

  it("rejects a backslash-variant protocol-relative URL the same way", () => {
    expect(resolveAnimeAssetCropSource("/\\evil.example.com/cover.jpg", API_BASE_URL)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("\\\\evil.example.com/cover.jpg", API_BASE_URL)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("\\/evil.example.com/cover.jpg", API_BASE_URL)).toEqual({ fetchable: false });
  });
});

describe("deriveOriginalCropCandidates", () => {
  it("puts the same extension as the display variant first, then the other known extensions", () => {
    const candidates = deriveOriginalCropCandidates("/media/anime/2/banner/some-uuid/display.jpg");
    expect(candidates).toEqual([
      "/media/anime/2/banner/some-uuid/original.jpg",
      "/media/anime/2/banner/some-uuid/original.png",
      "/media/anime/2/banner/some-uuid/original.webp",
      "/media/anime/2/banner/some-uuid/original.gif",
    ]);
  });

  it("still orders webp first when the display variant itself is webp (e.g. an animated-source export)", () => {
    const candidates = deriveOriginalCropCandidates("/media/anime/2/cover/some-uuid/display.webp");
    expect(candidates[0]).toBe("/media/anime/2/cover/some-uuid/original.webp");
  });

  it("returns no candidates for the Jellyfin-image-proxy path (no original/display distinction there)", () => {
    expect(deriveOriginalCropCandidates("/api/v1/media/image?item_id=x&kind=primary&provider=jellyfin")).toEqual([]);
  });

  it("returns no candidates for a path that is not a display-variant file at all", () => {
    expect(deriveOriginalCropCandidates("/media/anime/2/cover/some-uuid/original.jpg")).toEqual([]);
    expect(deriveOriginalCropCandidates("/media/anime/2/cover/some-uuid/thumb.jpg")).toEqual([]);
  });
});
