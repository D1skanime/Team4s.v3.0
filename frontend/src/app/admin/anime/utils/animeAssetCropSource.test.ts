import { describe, expect, it } from "vitest";

import { resolveAnimeAssetCropSource } from "./animeAssetCropSource";

describe("resolveAnimeAssetCropSource", () => {
  it("treats a rehosted-upload path as same-origin fetchable", () => {
    const result = resolveAnimeAssetCropSource("/media/anime/7/cover/original.jpg");
    expect(result).toEqual({ fetchable: true, url: "/media/anime/7/cover/original.jpg" });
  });

  it("treats the Jellyfin-image-proxy path as same-origin fetchable (never downloaded by 'Jellyfin-Metadaten anwenden')", () => {
    const rawUrl = "/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin";
    const result = resolveAnimeAssetCropSource(rawUrl);
    expect(result).toEqual({ fetchable: true, url: rawUrl });
  });

  it("treats an absolute URL as not safely fetchable (cross-origin CORS risk) instead of attempting a broken fetch", () => {
    const result = resolveAnimeAssetCropSource("http://192.168.235.196:18092/api/v1/media/image?item_id=x&kind=primary&provider=jellyfin");
    expect(result).toEqual({ fetchable: false });
  });

  it("treats an https external provider URL as not safely fetchable", () => {
    const result = resolveAnimeAssetCropSource("https://image.tmdb.org/t/p/original/poster.jpg");
    expect(result).toEqual({ fetchable: false });
  });

  it("treats a missing or empty url as not fetchable", () => {
    expect(resolveAnimeAssetCropSource(undefined)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource(null)).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("")).toEqual({ fetchable: false });
    expect(resolveAnimeAssetCropSource("   ")).toEqual({ fetchable: false });
  });
});
