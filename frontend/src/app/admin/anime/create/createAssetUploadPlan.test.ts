import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCreateAssetUploadPlan,
  stageRemoteCreateAssetCandidate,
  uploadCreatedAnimeAssets,
} from "./createAssetUploadPlan";

vi.mock("@/lib/api", () => ({
  addAdminAnimeBackgroundAsset: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  addAdminAnimeBackgroundVideoAsset: vi.fn().mockResolvedValue(undefined),
  assignAdminAnimeBackgroundVideoAsset: vi.fn().mockResolvedValue(undefined),
  assignAdminAnimeBannerAsset: vi.fn().mockResolvedValue(undefined),
  assignAdminAnimeCoverAsset: vi.fn().mockResolvedValue(undefined),
  assignAdminAnimeLogoAsset: vi.fn().mockResolvedValue(undefined),
  uploadAdminAnimeMedia: vi.fn(),
}));

describe("createAssetUploadPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds manual create staging config for all supported asset kinds", () => {
    const plan = buildCreateAssetUploadPlan();

    expect(plan.cover.label).toBe("Cover");
    expect(plan.banner.label).toBe("Banner");
    expect(plan.logo.label).toBe("Logo");
    expect(plan.background.label).toBe("Background");
    expect(plan.background_video.label).toBe("Background-Video");
  });

  it("uploads banner, logo, background, and background_video through the typed helpers after create", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.uploadAdminAnimeMedia)
      .mockResolvedValueOnce({
        id: "banner-1",
        status: "completed",
        url: "http://localhost/banner",
        files: [],
      })
      .mockResolvedValueOnce({
        id: "logo-1",
        status: "completed",
        url: "http://localhost/logo",
        files: [],
      })
      .mockResolvedValueOnce({
        id: "background-1",
        status: "completed",
        url: "http://localhost/background",
        files: [],
      })
      .mockResolvedValueOnce({
        id: "video-1",
        status: "completed",
        url: "http://localhost/video",
        files: [],
      });

    await uploadCreatedAnimeAssets(17, {
      banner: new File(["banner"], "banner.jpg", { type: "image/jpeg" }),
      logo: new File(["logo"], "logo.png", { type: "image/png" }),
      background: [
        new File(["background"], "background.jpg", { type: "image/jpeg" }),
      ],
      background_video: [
        new File(["video"], "background.mp4", {
          type: "video/mp4",
        }),
      ],
    }, "token");

    expect(api.uploadAdminAnimeMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        animeID: 17,
        assetType: "banner",
        authToken: "token",
      }),
    );
    expect(api.assignAdminAnimeBannerAsset).toHaveBeenCalledWith(
      17,
      "banner-1",
      "token",
    );
    expect(api.assignAdminAnimeLogoAsset).toHaveBeenCalledWith(
      17,
      "logo-1",
      "token",
    );
    expect(api.addAdminAnimeBackgroundAsset).toHaveBeenCalledWith(
      17,
      "background-1",
      "token",
      undefined,
    );
    expect(api.addAdminAnimeBackgroundVideoAsset).toHaveBeenCalledWith(
      17,
      "video-1",
      "token",
    );
  });

  it("keeps background additive while singular slots replace", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.uploadAdminAnimeMedia)
      .mockResolvedValueOnce({
        id: "bg-1",
        status: "completed",
        url: "http://localhost/background-1",
        files: [],
      })
      .mockResolvedValueOnce({
        id: "bg-2",
        status: "completed",
        url: "http://localhost/background-2",
        files: [],
      });

    await uploadCreatedAnimeAssets(23, {
      background: [
        new File(["one"], "one.jpg", { type: "image/jpeg" }),
        new File(["two"], "two.jpg", { type: "image/jpeg" }),
      ],
    });

    expect(api.addAdminAnimeBackgroundAsset).toHaveBeenCalledTimes(2);
    expect(api.assignAdminAnimeBannerAsset).not.toHaveBeenCalled();
    expect(api.assignAdminAnimeLogoAsset).not.toHaveBeenCalled();
    expect(api.assignAdminAnimeBackgroundVideoAsset).not.toHaveBeenCalled();
  });

  it("downloads a remote asset candidate into the normal staged upload shape", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["remote"], { type: "image/png" })),
    });
    const createObjectURL = vi.fn(() => "blob:remote-cover");

    const staged = await stageRemoteCreateAssetCandidate(
      {
        id: "zerochan-123",
        asset_kind: "cover",
        source: "zerochan",
        title: "Ao Haru Ride",
        preview_url: "https://preview.example/123.jpg",
        image_url: "https://image.example/123.png",
      },
      { fetchImpl, createObjectURL },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/admin/asset-proxy?url=https%3A%2F%2Fimage.example%2F123.png",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(staged.draftValue).toBe("cover-zerochan-zerochan-123.png");
    expect(staged.file.name).toBe("cover-zerochan-zerochan-123.png");
    expect(staged.file.type).toBe("image/png");
    expect(staged.previewUrl).toBe("blob:remote-cover");
  });
});
