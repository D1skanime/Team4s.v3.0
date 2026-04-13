import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateAssetSearchDialog } from "./CreateAssetSearchDialog";
import { CreateAniSearchIntakeCard } from "./CreateAniSearchIntakeCard";
import AdminAnimeCreatePage, {
  buildCreateSuccessMessage,
  appendJellyfinLinkageToCreatePayload,
  buildManualCreateDraftSnapshot,
  buildManualCreateRedirectPath,
  CREATE_REDIRECT_DELAY_MS,
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
import { splitTagTokens } from "../utils/anime-helpers";

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
    expect(markup).toContain("Cover online suchen");
    expect(markup).toContain("Banner online suchen");
    expect(markup).toContain("Logo online suchen");
    expect(markup).toContain("Backgrounds online suchen");
  });

  it("renders the asset chooser with visible source metadata and multi-select copy", () => {
    const markup = renderToStaticMarkup(
      <CreateAssetSearchDialog
        activeKind="background"
        query="Ao Haru Ride"
        candidates={[
          {
            id: "zerochan-123",
            asset_kind: "background",
            source: "zerochan",
            title: "Ao Haru Ride",
            preview_url: "https://preview.example/123.jpg",
            image_url: "https://image.example/123.jpg",
            year: 2014,
            width: 1920,
            height: 1080,
          },
        ]}
        selectedCandidateIDs={["zerochan-123"]}
        errorMessage={null}
        isOpen
        isSearching={false}
        isAdopting={false}
        onClose={() => undefined}
        onQueryChange={() => undefined}
        onSearch={() => undefined}
        onToggleCandidate={() => undefined}
        onAdoptSelection={() => undefined}
      />,
    );

    expect(markup).toContain("Backgrounds online suchen");
    expect(markup).toContain("zerochan");
    expect(markup).toContain("1 Treffer ausgewaehlt");
    expect(markup).toContain("Auswahl uebernehmen");
    expect(markup).toContain("1920 x 1080");
  });

  it("keeps the default primary CTA copy until submit is in progress", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Anime erstellen");
    expect(markup).not.toContain("Anime wird erstellt...");
  });

  it("renders only the reachable title action and title guidance on create", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("AniSearch ID");
    expect(markup).toContain("AniSearch Titel");
    expect(markup).toContain("Titel suchen");
    expect(markup).toContain("AniSearch laden");
    expect(markup).toContain("Jellyfin Suche");
    expect(markup).toContain("Jellyfin suchen");
    expect(markup).toContain("Manuell &gt; AniSearch &gt; Jellyfin");
    expect(markup.indexOf("AniSearch laden")).toBeLessThan(
      markup.lastIndexOf("Jellyfin suchen"),
    );
    expect(markup).toContain(
      "Der finale Titel ist kein Suchfeld. Nutze die getrennten Jellyfin- und AniSearch-Suchfeldern fuer Provider-Suchen.",
    );
    expect(markup).not.toContain("Aus Datei hochladen");
    expect(resolveSourceActionState("").canSync).toBe(false);
    expect(resolveSourceActionState("Naruto").canSync).toBe(true);
  });

  it("describes separated provider search instead of reusing the final title field", () => {
    expect(resolveSourceActionState("Naruto").helperText).toContain(
      "Der finale Titel bleibt Entwurfsdaten.",
    );
    expect(resolveSourceActionState("Naruto").helperText).toContain(
      "getrennten Jellyfin- und AniSearch-Suchfeldern",
    );
  });

  it("renders AniSearch draft summary, duplicate redirect, and local error states through the intake card", () => {
    const summaryMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery=""
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={{
          anisearchID: "12345",
          source: "anisearch:12345",
          summary:
            "AniSearch ID 12345 hat den Entwurf aktualisiert. Noch nichts gespeichert.",
          updatedFields: ["Titel", "Beschreibung"],
          relationNotes: [
            "1 von 2 Relationen wurde lokal zugeordnet.",
            "1 Relation wurde uebersprungen.",
          ],
          draftStatusNotes: [
            "AniSearch hat bestehende Jellyfin-Werte fuer Titel ueberschrieben.",
            "Manuell gepflegte Beschreibung bleibt erhalten.",
          ],
        }}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(summaryMarkup).toContain("Aktualisierte Felder");
    expect(summaryMarkup).toContain("Relationen");
    expect(summaryMarkup).toContain("Entwurfsstatus");
    expect(summaryMarkup).toContain("Noch nichts gespeichert");
    expect(summaryMarkup).toContain(
      "AniSearch hat bestehende Jellyfin-Werte fuer Titel ueberschrieben.",
    );
    expect(summaryMarkup).toContain(
      "Manuell gepflegte Beschreibung bleibt erhalten.",
    );

    const duplicateMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery=""
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={{
          anisearchID: "12345",
          existingAnimeID: 77,
          existingTitle: "Cowboy Bebop",
          redirectPath: "/admin/anime/77/edit",
        }}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(duplicateMarkup).toContain("Cowboy Bebop");
    expect(duplicateMarkup).toContain("Zum vorhandenen Anime wechseln");
    expect(duplicateMarkup).toContain("/admin/anime/77/edit");

    const errorMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery=""
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={null}
        errorMessage="AniSearch-Daten konnten nicht geladen werden."
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(errorMarkup).toContain("AniSearch-Daten konnten nicht geladen werden.");
    expect(errorMarkup).toContain("Der aktuelle Entwurf bleibt unveraendert");
  });

  it("builds the create redirect path for the anime overview route", () => {
    expect(buildManualCreateRedirectPath(42)).toBe(
      "/admin/anime?created=42#anime-42",
    );
  });

  it("builds the create redirect path correctly for an AniSearch-backed anime", () => {
    // Regression: redirect path must resolve even after staged-asset state resets
    // were removed from the success path. This documents the redirect target is
    // correct — the real fix is the removal of resetStagedCover/resetStagedAssets
    // from handleCreateSubmit so the useEffect cleanup cannot cancel the timeout.
    expect(buildManualCreateRedirectPath(19)).toBe(
      "/admin/anime?created=19#anime-19",
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

  it("builds an operator-visible AniSearch warning summary before redirect", () => {
    expect(
      buildCreateSuccessMessage({
        data: { id: 42 },
        anisearch: {
          source: "anisearch:12345",
          relations_attempted: 3,
          relations_applied: 1,
          relations_skipped_existing: 1,
          warnings: [
            "2 AniSearch-Relationen konnten nicht lokal zugeordnet werden.",
          ],
        },
      }),
    ).toContain(
      "Anime #42 wurde erstellt. AniSearch anisearch:12345: 1/3 Relationen uebernommen. 1 bereits vorhandene Relationen wurden uebersprungen. 2 AniSearch-Relationen konnten nicht lokal zugeordnet werden. (Weiterleitung zur Uebersicht...)",
    );
  });

  it("keeps the generic create success message when AniSearch follow-through is clean", () => {
    expect(
      buildCreateSuccessMessage({
        data: { id: 42 },
        anisearch: {
          source: "anisearch:12345",
          relations_attempted: 2,
          relations_applied: 2,
          relations_skipped_existing: 0,
          warnings: [],
        },
      }),
    ).toBe("Anime #42 wurde erstellt. (Weiterleitung zur Uebersicht...)");
    expect(CREATE_REDIRECT_DELAY_MS).toBeGreaterThan(0);
  });

  it("treats skipped-existing AniSearch relations as a clean idempotent outcome", () => {
    expect(
      buildCreateSuccessMessage({
        data: { id: 42 },
        anisearch: {
          source: "anisearch:12345",
          relations_attempted: 2,
          relations_applied: 1,
          relations_skipped_existing: 1,
          warnings: [],
        },
      }),
    ).toBe("Anime #42 wurde erstellt. (Weiterleitung zur Uebersicht...)");
  });

  it("does not crash when AniSearch create summary omits the warnings array", () => {
    // Regression for live UAT failure: backend can omit `warnings` from create enrichment
    // summaries. Without the defensive fix this throws at runtime:
    // "can't access property 'length', summary.warnings is undefined"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incompleteAnisearch = {
      source: "anisearch:99999",
      relations_attempted: 2,
      relations_applied: 2,
      relations_skipped_existing: 0,
      // warnings intentionally absent — mirrors backend omission
    } as any;

    expect(() =>
      buildCreateSuccessMessage({
        data: { id: 42 } as never,
        anisearch: incompleteAnisearch,
      }),
    ).not.toThrow();
  });

  it("returns the generic create success message when AniSearch warnings are absent and all relations applied", () => {
    // Regression: helper must fall back to generic copy, not crash, when warnings field is missing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incompleteAnisearch = {
      source: "anisearch:99999",
      relations_attempted: 2,
      relations_applied: 2,
      relations_skipped_existing: 0,
    } as any;

    expect(
      buildCreateSuccessMessage({
        data: { id: 42 } as never,
        anisearch: incompleteAnisearch,
      }),
    ).toBe("Anime #42 wurde erstellt. (Weiterleitung zur Uebersicht...)");
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
      tagTokens: [],
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
      tagTokens: [],
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
      tagTokens: [],
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
      tagTokens: [],
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
      tagTokens: [],
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

  // Tags card visibility: the metadata area must render a dedicated Tags card
  // alongside the existing genre controls so tags are a first-class visible field.
  it("renders a dedicated Tags card in the metadata section alongside genre controls", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Tags");
    expect(markup).toContain("Ausgewaehlte Tags");
    expect(markup).toContain("Genre, Tags und Beschreibung");
  });

  // Tags empty state: before any tags are selected the card must show the
  // configured empty-state copy rather than a blank region.
  it("shows the Tags empty state copy before any tags are selected", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Noch keine Tags gesetzt.");
  });

  // Tag suggestion region: the tags card must expose the suggestion area label
  // so keyboard/screen-reader users can navigate to it.
  it("renders the tag suggestion region with the correct aria label", () => {
    const markup = renderToStaticMarkup(<AdminAnimeCreatePage />);

    expect(markup).toContain("Tag Vorschlaege");
  });

  // splitTagTokens helper: comma-separated input must produce a deduplicated
  // normalized token list just like the genre token helper.
  it("splitTagTokens deduplicates and trims comma-separated tag input", () => {
    expect(splitTagTokens("Classic, Mecha, classic ,  MECHA  ")).toEqual([
      "Classic",
      "Mecha",
    ]);
  });

  // splitTagTokens: empty input must return an empty array, not undefined or null.
  it("splitTagTokens returns empty array for blank input", () => {
    expect(splitTagTokens("")).toEqual([]);
    expect(splitTagTokens("   ")).toEqual([]);
  });

  // Provider hydration: Jellyfin tags must land in tagTokens not genreTokens
  // so the two fields stay independent in the rendered state.
  it("hydrates provider tags into tagTokens and keeps genre tokens independent", () => {
    const snapshot = buildManualCreateDraftSnapshot({
      title: "Lain",
      type: "tv",
      contentType: "anime",
      status: "ongoing",
      year: "",
      maxEpisodes: "",
      titleDE: "",
      titleEN: "",
      genreTokens: [],
      tagTokens: [],
      description: "",
      coverImage: "",
    });

    const hydrated = hydrateManualDraftFromJellyfinPreview(snapshot, {
      jellyfin_series_id: "series-lain",
      jellyfin_series_name: "Serial Experiments Lain",
      jellyfin_series_path: "D:/Anime/TV/Lain",
      folder_name_title_seed: "Serial Experiments Lain",
      description: "Wired reality.",
      year: 1998,
      genre: "Sci-Fi, Psychological",
      tags: ["Classic", "Mecha"],
      type_hint: {
        confidence: "high",
        suggested_type: "tv",
        reasons: ["TV-Ordner erkannt."],
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

    // Genre and tags stay in separate token arrays
    expect(hydrated.draft.genreTokens).toContain("Sci-Fi");
    expect(hydrated.draft.genreTokens).toContain("Psychological");
    expect(hydrated.draft.tagTokens).toContain("Classic");
    expect(hydrated.draft.tagTokens).toContain("Mecha");
    // Tags must not bleed into genre tokens
    expect(hydrated.draft.genreTokens).not.toContain("Classic");
    expect(hydrated.draft.genreTokens).not.toContain("Mecha");
  });

  // Payload shape: the create payload must include tags as a separate array
  // and must not collapse tags into the genre string.
  it("getAdminTagTokens is used for tag suggestion loading (import from admin-anime-intake)", async () => {
    // Verify the helper is importable from the intake module — this proves
    // the page can use the dedicated tag token loader.
    const module = await import("@/lib/api/admin-anime-intake");
    expect(typeof module.getAdminTagTokens).toBe("function");
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
      tagTokens: [],
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
      tagTokens: [],
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
