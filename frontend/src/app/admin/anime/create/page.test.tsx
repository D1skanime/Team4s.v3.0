import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAnimeCreatePage, {
  appendJellyfinLinkageToCreatePayload,
  buildManualCreateDraftSnapshot,
  buildManualCreateRedirectPath,
  createManualAnimeAndRedirect,
  formatCreatePageError,
  resolveJellyfinPreviewBaseDraft,
  resolveJellyfinReviewVisibility,
  resolveSourceActionState,
  stageManualCreateCover,
  uploadCreatedAnimeCover,
} from "./page";
import { ApiError } from "@/lib/api";
import {
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
} from "../hooks/useManualAnimeDraft";

describe("AdminAnimeCreatePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an unsaved preview with placeholder title and cover before persistence", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Fehlt: Titel, Cover");
    expect(markup).toContain("Noch keine Datei ausgewaehlt.");
    expect(markup).toContain("Anime erstellen");
    expect(markup).toContain("Noch nicht bereit");
    expect(markup).toContain("Titel *");
    expect(markup).toContain("Typ *");
    expect(markup).toContain("Beschreibung");
    expect(markup).toContain("Cover *");
    expect(markup).toContain("verifizierte V2-Upload-Seam");
    expect(markup).not.toContain("frontend/public/covers");
  });

  it("renders manual staging controls for banner, logo, background, and background-video on create", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Banner");
    expect(markup).toContain("Logo");
    expect(markup).toContain("Background");
    expect(markup).toContain("Background-Video");
    expect(markup).toContain("Asset-Upload");
  });

  it("keeps the default primary CTA copy until submit is in progress", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Anime erstellen");
    expect(markup).not.toContain("Anime wird erstellt...");
  });

  it("renders title-adjacent Jellyfin and AniSearch actions with disabled-until-meaningful-title guidance", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Jellyfin suchen");
    expect(markup).toContain("AniSearch spaeter");
    expect(markup).toContain(
      "Gib zuerst einen aussagekraeftigen Anime-Titel ein. AniSearch Sync kommt in Phase 4.",
    );
    expect(markup).not.toContain("Aus Datei hochladen");
    expect(markup).not.toContain("anime ID");
    expect(markup).not.toContain("ID-basiert");
    expect(resolveSourceActionState("").canSync).toBe(false);
    expect(resolveSourceActionState("Naruto").canSync).toBe(true);
  });

  it("keeps AniSearch in placeholder mode for phase 3", () => {
    expect(resolveSourceActionState("Naruto").helperText).toContain(
      "AniSearch Sync kommt in Phase 4.",
    );
  });

  it("builds the create redirect path for the anime overview route", () => {
    expect(buildManualCreateRedirectPath(42)).toBe(
      "/admin/anime?created=42#anime-42",
    );
  });

  it("uses createAdminAnime and redirects to the anime overview after success", async () => {
    const createAdminAnimeMock = vi.fn().mockResolvedValue({
      data: {
        id: 42,
      },
    });
    const setLocationHref = vi.fn();

    const response = await createManualAnimeAndRedirect(
      {
        title: "Serial Experiments Lain",
        type: "tv",
        content_type: "anime",
        status: "ongoing",
        cover_image: "lain.jpg",
      },
      {
        createAdminAnime: createAdminAnimeMock,
        setLocationHref,
      },
    );

    expect(createAdminAnimeMock).toHaveBeenCalledWith({
      title: "Serial Experiments Lain",
      type: "tv",
      content_type: "anime",
      status: "ongoing",
      cover_image: "lain.jpg",
    });
    expect(setLocationHref).toHaveBeenCalledWith(
      "/admin/anime?created=42#anime-42",
    );
    expect(response.data.id).toBe(42);
  });

  it("stages the draft cover locally until the anime exists", () => {
    const createObjectURL = vi.fn(() => "blob:lain-cover");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    expect(
      stageManualCreateCover(
        new File(["cover"], "lain.jpg", { type: "image/jpeg" }),
      ),
    ).toEqual({
      draftValue: "lain.jpg",
      previewUrl: "blob:lain-cover",
    });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("uploads and assigns the created anime cover through the admin upload seam", async () => {
    const uploadSpy = vi
      .spyOn(await import("@/lib/api"), "uploadAdminAnimeMedia")
      .mockResolvedValue({
        id: "42",
        status: "completed",
        url: "http://localhost:8092/media/anime/9/cover/42/original.jpg",
        files: [],
      });
    const assignSpy = vi
      .spyOn(await import("@/lib/api"), "assignAdminAnimeCoverAsset")
      .mockResolvedValue();

    await expect(
      uploadCreatedAnimeCover(
        9,
        new File(["cover"], "lain.jpg", { type: "image/jpeg" }),
        "token",
      ),
    ).resolves.toBe("42");

    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        animeID: 9,
        assetType: "poster",
        authToken: "token",
      }),
    );
    expect(assignSpy).toHaveBeenCalledWith(9, "42", "token");
  });

  it("surfaces ApiError details for operator-visible create failures", () => {
    const error = new ApiError(
      500,
      "Interner Serverfehler",
      null,
      "db_schema_mismatch",
      "Fehlende Spalte: anime.status",
    );

    expect(
      formatCreatePageError(error, "Anime konnte nicht erstellt werden."),
    ).toBe("(500) Interner Serverfehler\nFehlende Spalte: anime.status");
  });

  it("hydrates the same shared draft from a Jellyfin preview without persisting first", () => {
    const snapshot = buildManualCreateDraftSnapshot({
      title: "Nar",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "",
    });

    const hydrated = hydrateManualDraftFromJellyfinPreview(snapshot, {
      jellyfin_series_id: "series-1",
      jellyfin_series_name: "Naruto",
      jellyfin_series_path: "D:/Anime/TV/Naruto",
      folder_name_title_seed: "Naruto (2002)",
      description: "Shinobi story",
      year: 2002,
      genre: "Action, Adventure",
      tags: ["Shounen"],
      type_hint: {
        confidence: "medium",
        suggested_type: "tv",
        reasons: ["TV-Ordner erkannt."],
      },
      asset_slots: {
        cover: {
          present: true,
          kind: "cover",
          source: "jellyfin",
          url: "https://img/cover.jpg",
        },
        logo: {
          present: true,
          kind: "logo",
          source: "jellyfin",
          url: "https://img/logo.png",
        },
        banner: { present: false, kind: "banner", source: "jellyfin" },
        backgrounds: [
          {
            present: true,
            kind: "background",
            source: "jellyfin",
            index: 0,
            url: "https://img/bg-1.jpg",
          },
          {
            present: true,
            kind: "background",
            source: "jellyfin",
            index: 1,
            url: "https://img/bg-2.jpg",
          },
        ],
        background_video: {
          present: false,
          kind: "background_video",
          source: "jellyfin",
        },
      },
    });

    expect(hydrated.draft.title).toBe("Naruto (2002)");
    expect(hydrated.draft.coverImage).toBe("https://img/cover.jpg");
    expect(hydrated.draft.description).toBe("Shinobi story");
    expect(hydrated.draft.genreTokens).toEqual(["Action", "Adventure"]);
    expect(hydrated.assetSlots.logo.present).toBe(true);
    expect(hydrated.assetSlots.backgrounds).toHaveLength(2);
  });

  it("replaces stale preview-backed fields when a different Jellyfin preview is loaded", () => {
    const currentDraft = buildManualCreateDraftSnapshot({
      title: "MA",
      type: "film",
      contentType: "anime",
      status: "ongoing",
      year: "1995",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: ["Action"],
      description: "Alter Text",
      coverImage: "https://img/old-cover.jpg",
    });

    const hydrated = hydrateManualDraftFromJellyfinPreview(currentDraft, {
      jellyfin_series_id: "series-77",
      jellyfin_series_name: "Macross",
      jellyfin_series_path: "D:/Anime/Movies/Macross Flash Back 2012",
      folder_name_title_seed: "Macross Flash Back 2012",
      description: "Neuer Text aus Jellyfin",
      year: 1987,
      genre: "Music, Sci-Fi",
      tags: [],
      type_hint: {
        confidence: "high",
        suggested_type: "ova",
        reasons: ["Ordnername und Struktur deuten auf OVA hin."],
      },
      asset_slots: {
        cover: {
          present: true,
          kind: "cover",
          source: "jellyfin",
          url: "https://img/new-cover.jpg",
        },
        logo: { present: false, kind: "logo", source: "jellyfin" },
        banner: { present: false, kind: "banner", source: "jellyfin" },
        backgrounds: [],
        background_video: {
          present: false,
          kind: "background_video",
          source: "jellyfin",
        },
      },
    });

    expect(hydrated.draft.title).toBe("Macross Flash Back 2012");
    expect(hydrated.draft.description).toBe("Neuer Text aus Jellyfin");
    expect(hydrated.draft.year).toBe("1987");
    expect(hydrated.draft.genreTokens).toEqual(["Music", "Sci-Fi"]);
    expect(hydrated.draft.coverImage).toBe("https://img/new-cover.jpg");
    expect(hydrated.draft.type).toBe("ova");
  });

  it("keeps the folder-name seeded title editable after draft hydration", () => {
    const snapshot = buildManualCreateDraftSnapshot({
      title: "Nar",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "",
    });

    const hydrated = hydrateManualDraftFromJellyfinPreview(snapshot, {
      jellyfin_series_id: "series-9",
      jellyfin_series_name: "Naruto",
      jellyfin_series_path: "D:/Anime/TV/Naruto (2002)",
      folder_name_title_seed: "Naruto (2002)",
      tags: [],
      type_hint: {
        confidence: "high",
        suggested_type: "tv",
        reasons: ["Ordnername erkannt."],
      },
      asset_slots: {
        cover: { present: false, kind: "cover", source: "jellyfin" },
        logo: { present: false, kind: "logo", source: "jellyfin" },
        banner: { present: false, kind: "banner", source: "jellyfin" },
        backgrounds: [],
        background_video: {
          present: false,
          kind: "background_video",
          source: "jellyfin",
        },
      },
    });

    hydrated.draft.title = "Naruto DE";
    expect(hydrated.draft.title).toBe("Naruto DE");
  });

  it("removes imported draft assets after hydration and keeps cancellation free of create calls", () => {
    const createSpy = vi.fn();
    const draft = buildManualCreateDraftSnapshot({
      title: "Naruto",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "https://img/cover.jpg",
    });

    const removal = removeJellyfinDraftAsset(
      draft,
      {
        cover: {
          present: true,
          kind: "cover",
          source: "jellyfin",
          url: "https://img/cover.jpg",
        },
        logo: { present: false, kind: "logo", source: "jellyfin" },
        banner: { present: false, kind: "banner", source: "jellyfin" },
        backgrounds: [],
        background_video: {
          present: false,
          kind: "background_video",
          source: "jellyfin",
        },
      },
      { kind: "cover" },
    );

    expect(removal.draft.coverImage).toBe("");
    expect(removal.assetSlots.cover.present).toBe(false);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("adds Jellyfin linkage only to the explicit create payload after preview selection", () => {
    const payload = appendJellyfinLinkageToCreatePayload(
      {
        title: "Naruto",
        type: "tv",
        content_type: "anime",
        status: "ongoing",
        cover_image: "naruto.jpg",
      },
      {
        jellyfin_series_id: "series-42",
        jellyfin_series_name: "Naruto",
        jellyfin_series_path: "D:/Anime/TV/Naruto",
        tags: [],
        type_hint: {
          confidence: "high",
          suggested_type: "tv",
          reasons: ["Serienordner erkannt."],
        },
        asset_slots: {
          cover: {
            present: true,
            kind: "cover",
            source: "jellyfin",
            url: "https://img/cover.jpg",
          },
          logo: { present: false, kind: "logo", source: "jellyfin" },
          banner: { present: false, kind: "banner", source: "jellyfin" },
          backgrounds: [],
          background_video: {
            present: false,
            kind: "background_video",
            source: "jellyfin",
          },
        },
      },
    );

    expect(payload.source).toBe("jellyfin:series-42");
    expect(payload.folder_name).toBe("D:/Anime/TV/Naruto");
  });

  it("keeps manual-only create payload unchanged when no Jellyfin preview exists", () => {
    const payload = appendJellyfinLinkageToCreatePayload(
      {
        title: "Naruto",
        type: "tv",
        content_type: "anime",
        status: "ongoing",
        cover_image: "naruto.jpg",
      },
      null,
    );

    expect(payload.source).toBeUndefined();
    expect(payload.folder_name).toBeUndefined();
  });

  it("removes only the selected background from the jellyfin draft gallery", () => {
    const draft = buildManualCreateDraftSnapshot({
      title: "Naruto",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "",
    });

    const removal = removeJellyfinDraftAsset(
      draft,
      {
        cover: { present: false, kind: "cover", source: "jellyfin" },
        logo: { present: false, kind: "logo", source: "jellyfin" },
        banner: { present: false, kind: "banner", source: "jellyfin" },
        backgrounds: [
          {
            present: true,
            kind: "background",
            source: "jellyfin",
            index: 0,
            url: "https://img/bg-1.jpg",
          },
          {
            present: true,
            kind: "background",
            source: "jellyfin",
            index: 1,
            url: "https://img/bg-2.jpg",
          },
        ],
        background_video: {
          present: false,
          kind: "background_video",
          source: "jellyfin",
        },
      },
      { kind: "background", index: 0 },
    );

    expect(removal.assetSlots.backgrounds).toHaveLength(1);
    expect(removal.assetSlots.backgrounds[0].url).toBe("https://img/bg-2.jpg");
  });

  it("hides competing candidates after takeover until Jellyfin search is explicitly restarted", () => {
    expect(resolveJellyfinReviewVisibility(3, "review")).toEqual({
      showCandidateReview: true,
      showRestartAction: false,
    });
    expect(resolveJellyfinReviewVisibility(3, "hydrated")).toEqual({
      showCandidateReview: false,
      showRestartAction: true,
    });
  });

  it("keeps the first pre-preview draft snapshot as the restore baseline", () => {
    const currentDraft = buildManualCreateDraftSnapshot({
      title: "Macross",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "",
    });
    const originalSnapshot = buildManualCreateDraftSnapshot({
      title: "MA",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      description: "",
      coverImage: "",
    });

    expect(
      resolveJellyfinPreviewBaseDraft(currentDraft, originalSnapshot).title,
    ).toBe("MA");
    expect(resolveJellyfinPreviewBaseDraft(currentDraft, null).title).toBe(
      "Macross",
    );
  });
});
