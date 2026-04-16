"use client";

// useAdminAnimeCreateController: central create-route orchestration extracted
// from page.tsx so the page can stay below the 700-line guardrail while the
// mutable create, asset, and Jellyfin state remains in one readable place.

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  createAdminAnime,
  getAdminGenreTokens,
  getRuntimeAuthToken,
} from "@/lib/api";
import {
  createAdminAnimeFromJellyfinDraft,
  getAdminTagTokens,
  loadAdminAnimeCreateAniSearchDraft,
  searchAdminAnimeCreateAssetCandidates,
  searchAdminAnimeCreateAniSearchCandidates,
} from "@/lib/api/admin-anime-intake";
import { AnimeStatus, ContentType } from "@/types/anime";
import type {
  AdminAnimeAniSearchSearchCandidate,
  AdminAnimeAssetKind,
  AdminAnimeAssetSearchCandidate,
  AdminAnimeCreateRequest,
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
  AnimeType,
  GenreToken,
  TagToken,
} from "@/types/admin";

import {
  appendCreateSourceLinkageToPayload,
  buildCreateSuccessMessage,
  buildManualCreateRedirectPath,
  CREATE_REDIRECT_DELAY_MS,
  createManualAnimeAndRedirect,
  formatCreatePageError,
  resolveCreateAniSearchDraftMergeInputs,
  resolveJellyfinPreviewBaseDraft,
  resolveJellyfinReviewVisibility,
  resolveSourceActionState,
} from "./createPageHelpers";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";
import {
  applyCreateAniSearchControllerResult,
  type CreateAniSearchConflictState,
  type CreateAniSearchDraftState,
} from "./createAniSearchControllerHelpers";
import {
  stageRemoteCreateAssetCandidate,
  stageManualCreateAsset,
  uploadCreatedAnimeAssets,
} from "./createAssetUploadPlan";
import {
  CreateManualStagedAssets,
  CreateSingleAssetKind,
  createEmptyManualStagedAssets,
  revokeStagedAssetPreview,
  revokeStagedAssetPreviews,
} from "./createStagedAssets";
import { useAnimeEditor } from "../hooks/useAnimeEditor";
import {
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
  resolveManualCreateState,
  type JellyfinDraftAssetTarget,
  type ManualAnimeDraftValues,
} from "../hooks/useManualAnimeDraft";
import { useJellyfinIntake } from "../hooks/useJellyfinIntake";
import { deriveJellyfinIntakeSearchState } from "../hooks/useJellyfinIntake";
import {
  normalizeOptionalString,
  parsePositiveInt,
  splitGenreTokens,
  splitTagTokens,
} from "../utils/anime-helpers";

const DEFAULT_GENRE_LIMIT = 40;
const DEFAULT_TAG_LIMIT = 40;
type CreateSearchableAssetKind = Extract<
  AdminAnimeAssetKind,
  "cover" | "banner" | "logo" | "background"
>;

function countIncomingDraftAssets(
  assetSlots: AdminJellyfinIntakeAssetSlots | null,
): number {
  if (!assetSlots) return 0;

  let total = 0;
  if (assetSlots.cover.present) total += 1;
  if (assetSlots.logo.present) total += 1;
  if (assetSlots.banner.present) total += 1;
  if (assetSlots.background_video.present) total += 1;
  total += assetSlots.backgrounds.length;
  return total;
}

export function resolveAniSearchCandidateSearchFeedback(
  response: AdminAnimeAniSearchSearchCandidateResponse,
): {
  candidates: AdminAnimeAniSearchSearchCandidate[];
  errorMessage: string | null;
  filteredExistingCount: number;
  successMessage: string | null;
} {
  const candidates = Array.isArray(response.data) ? response.data : [];
  const filteredExistingCount =
    typeof response.filtered_existing_count === "number"
      ? response.filtered_existing_count
      : 0;

  if (candidates.length === 0 && filteredExistingCount > 0) {
    return {
      candidates,
      errorMessage: `Alle ${filteredExistingCount} gefundenen AniSearch-Treffer sind bereits als Anime erfasst und wurden ausgeblendet.`,
      filteredExistingCount,
      successMessage: null,
    };
  }

  if (candidates.length === 0) {
    return {
      candidates,
      errorMessage:
        "Keine AniSearch-Treffer gefunden. Bitte pruefe den Titel oder nutze die ID direkt.",
      filteredExistingCount,
      successMessage: null,
    };
  }

  return {
    candidates,
    errorMessage: null,
    filteredExistingCount,
    successMessage: `${candidates.length} AniSearch-Treffer gefunden. Waehle jetzt den passenden Eintrag aus.`,
  };
}

type AdminAnimeAniSearchSearchCandidateResponse = {
  data: AdminAnimeAniSearchSearchCandidate[];
  filtered_existing_count?: number;
};

export function useAdminAnimeCreateController() {
  const [isAuthStateHydrated, setIsAuthStateHydrated] = useState(false);
  const [authStateVersion, setAuthStateVersion] = useState(0);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aniSearchErrorMessage, setAniSearchErrorMessage] =
    useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([]);
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false);
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null);
  const [genreSuggestionLimit, setGenreSuggestionLimit] = useState(DEFAULT_GENRE_LIMIT);

  const [tagTokens, setTagTokens] = useState<TagToken[]>([]);
  const [isLoadingTagTokens, setIsLoadingTagTokens] = useState(false);
  const [tagTokensError, setTagTokensError] = useState<string | null>(null);
  const [tagSuggestionLimit, setTagSuggestionLimit] = useState(DEFAULT_TAG_LIMIT);

  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<AnimeType>("tv");
  const [createContentType, setCreateContentType] = useState<ContentType>("anime");
  const [createStatus, setCreateStatus] = useState<AnimeStatus>("ongoing");
  const [createYear, setCreateYear] = useState("");
  const [createMaxEpisodes, setCreateMaxEpisodes] = useState("");
  const [createTitleDE, setCreateTitleDE] = useState("");
  const [createTitleEN, setCreateTitleEN] = useState("");
  const [createGenreDraft, setCreateGenreDraft] = useState("");
  const [createGenreTokens, setCreateGenreTokens] = useState<string[]>([]);
  const [createTagDraft, setCreateTagDraft] = useState("");
  const [createTagTokens, setCreateTagTokens] = useState<string[]>([]);
  const [createDescription, setCreateDescription] = useState("");
  const [createCoverImage, setCreateCoverImage] = useState("");
  const [createAniSearchID, setCreateAniSearchID] = useState("");
  const [createAniSearchSearchQuery, setCreateAniSearchSearchQuery] = useState("");
  const [isLoadingAniSearchDraft, setIsLoadingAniSearchDraft] = useState(false);
  const [isSearchingAniSearchCandidates, setIsSearchingAniSearchCandidates] =
    useState(false);
  const [aniSearchCandidates, setAniSearchCandidates] = useState<
    AdminAnimeAniSearchSearchCandidate[]
  >([]);
  const [aniSearchFilteredExistingCount, setAniSearchFilteredExistingCount] =
    useState(0);
  const [aniSearchDraftResult, setAniSearchDraftResult] =
    useState<CreateAniSearchDraftState | null>(null);
  const [aniSearchConflict, setAniSearchConflict] =
    useState<CreateAniSearchConflictState | null>(null);

  const [stagedCover, setStagedCover] =
    useState<CreateAssetUploadDraftValue | null>(null);
  const [stagedAssets, setStagedAssets] = useState<CreateManualStagedAssets>(
    createEmptyManualStagedAssets,
  );
  const [activeAssetSearchKind, setActiveAssetSearchKind] =
    useState<CreateSearchableAssetKind | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetSearchCandidates, setAssetSearchCandidates] = useState<
    AdminAnimeAssetSearchCandidate[]
  >([]);
  const [assetSearchSelectedIDs, setAssetSearchSelectedIDs] = useState<string[]>(
    [],
  );
  const [assetSearchErrorMessage, setAssetSearchErrorMessage] =
    useState<string | null>(null);
  const [assetSearchPage, setAssetSearchPage] = useState(1);
  const [assetSearchHasMore, setAssetSearchHasMore] = useState(false);
  const [isSearchingAssetCandidates, setIsSearchingAssetCandidates] =
    useState(false);
  const [isAdoptingAssetCandidates, setIsAdoptingAssetCandidates] =
    useState(false);

  const [jellyfinPreview, setJellyfinPreview] =
    useState<AdminAnimeJellyfinIntakePreviewResult | null>(null);
  const [jellyfinAssetSlots, setJellyfinAssetSlots] =
    useState<AdminJellyfinIntakeAssetSlots | null>(null);
  const [jellyfinDraftSnapshot, setJellyfinDraftSnapshot] =
    useState<ManualAnimeDraftValues | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundVideoFileInputRef = useRef<HTMLInputElement | null>(null);
  const createRedirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const syncAuthState = () => setAuthStateVersion((v) => v + 1);
    syncAuthState();
    setIsAuthStateHydrated(true);
    window.addEventListener("focus", syncAuthState);
    window.addEventListener("storage", syncAuthState);
    document.addEventListener("visibilitychange", syncAuthState);

    return () => {
      window.removeEventListener("focus", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
      document.removeEventListener("visibilitychange", syncAuthState);
    };
  }, []);

  useEffect(
    () => () => {
      if (createRedirectTimeoutRef.current !== null) {
        window.clearTimeout(createRedirectTimeoutRef.current);
      }
      revokeStagedAssetPreview(stagedCover);
      revokeStagedAssetPreviews(stagedAssets);
    },
    [stagedAssets, stagedCover],
  );

  const authToken = useMemo(() => getRuntimeAuthToken(), [authStateVersion]);
  const hasAuthToken = authToken.length > 0;

  useEffect(() => {
    if (!hasAuthToken) return;

    setIsLoadingGenreTokens(true);
    setGenreTokensError(null);
    getAdminGenreTokens({ limit: 1000 }, authToken)
      .then((response) => setGenreTokens(response.data))
      .catch((error) => {
        setGenreTokensError(
          error instanceof ApiError
            ? `(${error.status}) ${error.message}`
            : "Genre-Vorschlaege konnten nicht geladen werden.",
        );
      })
      .finally(() => setIsLoadingGenreTokens(false));
  }, [authToken, hasAuthToken]);

  useEffect(() => {
    if (!hasAuthToken) return;

    setIsLoadingTagTokens(true);
    setTagTokensError(null);
    getAdminTagTokens({ limit: 1000 }, authToken)
      .then((response) => setTagTokens(response.data))
      .catch((error) => {
        setTagTokensError(
          error instanceof ApiError
            ? `(${error.status}) ${error.message}`
            : "Tag-Vorschlaege konnten nicht geladen werden.",
        );
      })
      .finally(() => setIsLoadingTagTokens(false));
  }, [authToken, hasAuthToken]);

  const jellyfinIntake = useJellyfinIntake();

  const sourceActionState = useMemo(
    () => resolveSourceActionState(jellyfinIntake.query),
    [jellyfinIntake.query],
  );
  const jellyfinSearchState = useMemo(
    () => deriveJellyfinIntakeSearchState(jellyfinIntake.query),
    [jellyfinIntake.query],
  );

  const manualDraftValues = useMemo<ManualAnimeDraftValues>(
    () => ({
      title: createTitle,
      type: createType,
      contentType: createContentType,
      status: createStatus,
      year: createYear,
      maxEpisodes: createMaxEpisodes,
      titleDE: createTitleDE,
      titleEN: createTitleEN,
      genreTokens: createGenreTokens,
      tagTokens: createTagTokens,
      description: createDescription,
      coverImage: createCoverImage,
    }),
    [
      createContentType,
      createCoverImage,
      createDescription,
      createGenreTokens,
      createMaxEpisodes,
      createStatus,
      createTagTokens,
      createTitle,
      createTitleDE,
      createTitleEN,
      createType,
      createYear,
    ],
  );

  const manualDraftState = useMemo(
    () =>
      resolveManualCreateState({
        title: createTitle,
        cover_image: createCoverImage,
        year: createYear,
        max_episodes: createMaxEpisodes,
        title_de: createTitleDE,
        title_en: createTitleEN,
        genre: createGenreTokens,
        description: createDescription,
      }),
    [
      createCoverImage,
      createDescription,
      createGenreTokens,
      createMaxEpisodes,
      createTitle,
      createTitleDE,
      createTitleEN,
      createYear,
    ],
  );

  const missingFields = useMemo(() => {
    const fields: string[] = [];
    if (!createTitle.trim()) fields.push("Titel");
    if (!createCoverImage.trim()) fields.push("Cover");
    return fields;
  }, [createCoverImage, createTitle]);

  const createGenreValue = useMemo(
    () => createGenreTokens.join(", "),
    [createGenreTokens],
  );

  const genreSuggestions = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase();
    const selected = new Set(createGenreTokens.map((t) => t.toLowerCase()));
    const filtered = genreTokens.filter((t) => {
      if (selected.has(t.name.toLowerCase())) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    });
    const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit;
    return filtered.slice(0, limit);
  }, [createGenreDraft, createGenreTokens, genreSuggestionLimit, genreTokens]);

  const genreSuggestionsTotal = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase();
    const selected = new Set(createGenreTokens.map((t) => t.toLowerCase()));
    return genreTokens.filter((t) => {
      if (selected.has(t.name.toLowerCase())) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    }).length;
  }, [createGenreDraft, createGenreTokens, genreTokens]);

  const tagSuggestions = useMemo(() => {
    const q = createTagDraft.trim().toLowerCase();
    const selected = new Set(createTagTokens.map((t) => t.toLowerCase()));
    const filtered = tagTokens.filter((t) => {
      if (selected.has(t.name.toLowerCase())) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    });
    const limit = q ? Math.max(80, tagSuggestionLimit) : tagSuggestionLimit;
    return filtered.slice(0, limit);
  }, [createTagDraft, createTagTokens, tagSuggestionLimit, tagTokens]);

  const tagSuggestionsTotal = useMemo(() => {
    const q = createTagDraft.trim().toLowerCase();
    const selected = new Set(createTagTokens.map((t) => t.toLowerCase()));
    return tagTokens.filter((t) => {
      if (selected.has(t.name.toLowerCase())) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    }).length;
  }, [createTagDraft, createTagTokens, tagTokens]);

  const hasSelectedJellyfinPreview = Boolean(jellyfinPreview);
  const readinessLabel =
    missingFields.length > 0
      ? `Fehlt: ${missingFields.join(", ")}`
      : "Bereit zum Anlegen";
  const jellyfinReviewVisibility = useMemo(
    () =>
      resolveJellyfinReviewVisibility(
        jellyfinIntake.candidates.length,
        jellyfinIntake.reviewState.mode,
      ),
    [jellyfinIntake.candidates.length, jellyfinIntake.reviewState.mode],
  );
  const selectedDraftAssetCount = useMemo(
    () => countIncomingDraftAssets(jellyfinAssetSlots),
    [jellyfinAssetSlots],
  );
  const showJellyfinResults = jellyfinReviewVisibility.showCandidateReview;
  const showDebugPanel =
    process.env.NODE_ENV !== "production" && (lastRequest || lastResponse);

  const editor = useAnimeEditor("create", {
    isDirty: manualDraftState.key !== "empty",
    canSubmit: manualDraftState.canSubmit,
    isSubmitting: isSubmittingCreate,
    formID: "anime-create-form",
    submitButtonType: "submit",
    submitLabel: isSubmittingCreate ? "Anime wird erstellt..." : "Anime erstellen",
    savedStateTitle: "Noch nicht bereit",
    savedStateMessage: "Titel und Cover fehlen noch.",
    dirtyStateTitle:
      manualDraftState.key === "ready" ? "Bereit zum Anlegen" : "Fehlt noch",
    dirtyStateMessage:
      manualDraftState.key === "ready"
        ? "Titel und Cover sind gesetzt."
        : "Titel und Cover fehlen noch.",
  });

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function clearAniSearchMessage() {
    setAniSearchErrorMessage(null);
  }

  function clearAssetSearchState() {
    setAssetSearchCandidates([]);
    setAssetSearchSelectedIDs([]);
    setAssetSearchErrorMessage(null);
  }

  function clearAniSearchState() {
    setAniSearchDraftResult(null);
    setAniSearchConflict(null);
    setAniSearchCandidates([]);
    setAniSearchFilteredExistingCount(0);
    clearAniSearchMessage();
  }

  function closeAssetSearch() {
    setActiveAssetSearchKind(null);
    clearAssetSearchState();
  }

  function resetStagedCover() {
    revokeStagedAssetPreview(stagedCover);
    setStagedCover(null);
  }

  function resetStagedAssets() {
    setStagedAssets((current) => {
      revokeStagedAssetPreviews(current);
      return createEmptyManualStagedAssets();
    });
  }

  function replaceStagedSingleAsset(kind: CreateSingleAssetKind, file: File) {
    const staged = stageManualCreateAsset(file);
    setStagedAssets((current) => {
      revokeStagedAssetPreview(current[kind]);
      return { ...current, [kind]: staged };
    });
    setShowValidationSummary(false);
    setSuccessMessage(`${staged.draftValue} fuer ${kind} vorbereitet.`);
  }

  function addStagedBackground(file: File) {
    const staged = stageManualCreateAsset(file);
    setStagedAssets((current) => ({
      ...current,
      background: [...current.background, staged],
    }));
    setShowValidationSummary(false);
    setSuccessMessage(`Background vorbereitet: ${staged.draftValue}`);
  }

  function removeStagedSingleAsset(kind: CreateSingleAssetKind) {
    setStagedAssets((current) => {
      revokeStagedAssetPreview(current[kind]);
      return { ...current, [kind]: null };
    });
  }

  function removeStagedBackground(index: number) {
    setStagedAssets((current) => {
      const next = [...current.background];
      const [removed] = next.splice(index, 1);
      revokeStagedAssetPreview(removed || null);
      return { ...current, background: next };
    });
  }

  function buildAssetSearchSeedQuery() {
    return (
      createTitle.trim() ||
      createAniSearchSearchQuery.trim() ||
      jellyfinIntake.query.trim() ||
      jellyfinPreview?.jellyfin_series_name?.trim() ||
      ""
    );
  }

  function openAssetSearch(kind: CreateSearchableAssetKind) {
    clearMessages();
    setActiveAssetSearchKind(kind);
    setAssetSearchQuery(buildAssetSearchSeedQuery());
    clearAssetSearchState();
  }

  function applyManualDraftValues(values: ManualAnimeDraftValues) {
    resetStagedCover();
    setCreateTitle(values.title);
    setCreateType(values.type);
    setCreateContentType(values.contentType);
    setCreateStatus(values.status);
    setCreateYear(values.year);
    setCreateMaxEpisodes(values.maxEpisodes);
    setCreateTitleDE(values.titleDE);
    setCreateTitleEN(values.titleEN);
    setCreateGenreTokens(values.genreTokens);
    setCreateTagTokens(values.tagTokens);
    setCreateDescription(values.description);
    setCreateCoverImage(values.coverImage);
  }

  function addCreateGenreTokens(raw: string) {
    const tokens = splitGenreTokens(raw);
    if (tokens.length === 0) return;

    setCreateGenreTokens((current) => {
      const index = new Set(current.map((t) => t.toLowerCase()));
      const next = [...current];
      for (const token of tokens) {
        const key = token.toLowerCase();
        if (index.has(key)) continue;
        index.add(key);
        next.push(token);
      }
      return next;
    });
  }

  function addCreateTagTokens(raw: string) {
    const tokens = splitTagTokens(raw);
    if (tokens.length === 0) return;

    setCreateTagTokens((current) => {
      const index = new Set(current.map((t) => t.toLowerCase()));
      const next = [...current];
      for (const token of tokens) {
        const key = token.toLowerCase();
        if (index.has(key)) continue;
        index.add(key);
        next.push(token);
      }
      return next;
    });
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setLastRequest(null);
    setLastResponse(null);
    setShowValidationSummary(true);
    if (createRedirectTimeoutRef.current !== null) {
      window.clearTimeout(createRedirectTimeoutRef.current);
      createRedirectTimeoutRef.current = null;
    }

    const runtimeAuthToken = getRuntimeAuthToken();
    if (!runtimeAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }
    if (!manualDraftState.canSubmit) {
      setErrorMessage("Titel und Cover sind erforderlich");
      return;
    }

    const payload: AdminAnimeCreateRequest = {
      title: createTitle.trim(),
      type: createType,
      content_type: createContentType,
      status: createStatus,
    };

    const trimmedCoverImage = createCoverImage.trim();
    if (!stagedCover?.file && trimmedCoverImage) {
      payload.cover_image = trimmedCoverImage;
    }

    if (jellyfinAssetSlots?.banner?.present && jellyfinAssetSlots.banner.url && !stagedAssets.banner) {
      payload.banner_image = jellyfinAssetSlots.banner.url;
    }
    if (jellyfinAssetSlots?.logo?.present && jellyfinAssetSlots.logo.url && !stagedAssets.logo) {
      payload.logo_image = jellyfinAssetSlots.logo.url;
    }
    if (jellyfinAssetSlots?.background_video?.present && jellyfinAssetSlots.background_video.url && !stagedAssets.background_video) {
      payload.background_video_url = jellyfinAssetSlots.background_video.url;
    }
    const jellyfinBackgroundURLs = (jellyfinAssetSlots?.backgrounds ?? [])
      .filter((slot) => slot.present && slot.url)
      .map((slot) => slot.url as string);
    if (jellyfinBackgroundURLs.length > 0) {
      payload.background_image_urls = jellyfinBackgroundURLs;
    }

    if (createYear.trim()) {
      const year = parsePositiveInt(createYear);
      if (!year) {
        setErrorMessage("year muss groesser als 0 sein");
        return;
      }
      payload.year = year;
    }

    if (createMaxEpisodes.trim()) {
      const maxEpisodes = parsePositiveInt(createMaxEpisodes);
      if (!maxEpisodes) {
        setErrorMessage("max_episodes muss groesser als 0 sein");
        return;
      }
      payload.max_episodes = maxEpisodes;
    }

    payload.title_de = normalizeOptionalString(createTitleDE);
    payload.title_en = normalizeOptionalString(createTitleEN);
    payload.genre = normalizeOptionalString(createGenreValue);
    if (createTagTokens.length > 0) payload.tags = [...createTagTokens];
    payload.description = normalizeOptionalString(createDescription);

    try {
      setIsSubmittingCreate(true);
      setLastRequest(JSON.stringify(payload, null, 2));

      const response = await createManualAnimeAndRedirect(
        appendCreateSourceLinkageToPayload(payload, {
          aniSearchDraftResult,
          jellyfinPreview,
        }),
        {
          createAdminAnime: jellyfinPreview
            ? createAdminAnimeFromJellyfinDraft
            : createAdminAnime,
          authToken: runtimeAuthToken,
          setLocationHref: () => undefined,
        },
      );

      await uploadCreatedAnimeAssets(
        response.data.id,
        {
          cover: stagedCover,
          banner: stagedAssets.banner,
          logo: stagedAssets.logo,
          background: stagedAssets.background,
          background_video: stagedAssets.background_video,
        },
        runtimeAuthToken,
      );

      setSuccessMessage(buildCreateSuccessMessage(response));
      setLastResponse(JSON.stringify(response, null, 2));
      createRedirectTimeoutRef.current = window.setTimeout(() => {
        window.location.href = buildManualCreateRedirectPath(response.data.id);
      }, CREATE_REDIRECT_DELAY_MS);
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(error, "Anime konnte nicht erstellt werden."),
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  }

  async function handleCoverUpload(file: File) {
    clearMessages();
    clearAniSearchMessage();
    setIsUploadingCover(true);

    try {
      resetStagedCover();
      const staged = stageManualCreateAsset(file);
      setStagedCover(staged);
      setCreateCoverImage(staged.draftValue);
      setShowValidationSummary(false);
      setSuccessMessage(`Cover vorbereitet: ${file.name}`);
    } catch (error) {
      setErrorMessage(formatCreatePageError(error, "Cover Upload fehlgeschlagen."));
    } finally {
      setIsUploadingCover(false);
    }
  }

  function handleSingleAssetInputChange(
    kind: CreateSingleAssetKind,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearMessages();
    replaceStagedSingleAsset(kind, file);
    event.target.value = "";
  }

  function handleBackgroundInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearMessages();
    addStagedBackground(file);
    event.target.value = "";
  }

  function openAssetFileDialog(
    kind: "cover" | "banner" | "logo" | "background" | "background_video",
  ) {
    const refMap = {
      cover: coverFileInputRef,
      banner: bannerFileInputRef,
      logo: logoFileInputRef,
      background: backgroundFileInputRef,
      background_video: backgroundVideoFileInputRef,
    };
    refMap[kind].current?.click();
  }

  async function handleJellyfinSearch() {
    clearMessages();
    clearAniSearchMessage();
    setAniSearchConflict(null);

    try {
      await jellyfinIntake.search();
      if (jellyfinIntake.candidates.length === 0) {
        setSuccessMessage(
          "Jellyfin-Suche abgeschlossen. Falls keine Karten erscheinen, pruefe Titel oder Ordnernamen.",
        );
      }
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(error, "Jellyfin-Daten konnten nicht geladen werden."),
      );
    }
  }

  async function handleJellyfinCandidateReview(candidateID: string) {
    clearMessages();
    clearAniSearchMessage();
    setAniSearchConflict(null);
    jellyfinIntake.reviewCandidate(candidateID);

    try {
      const preview = await jellyfinIntake.loadPreview(candidateID);
      if (!preview) {
        setErrorMessage("Jellyfin-Vorschau konnte nicht geladen werden.");
        return;
      }

      setJellyfinDraftSnapshot(
        resolveJellyfinPreviewBaseDraft(manualDraftValues, jellyfinDraftSnapshot),
      );

      const hydrated = hydrateManualDraftFromJellyfinPreview(
        manualDraftValues,
        preview,
        aniSearchDraftResult ? { mode: "fill" } : undefined,
      );
      applyManualDraftValues(hydrated.draft);
      setJellyfinPreview(preview);
      setJellyfinAssetSlots(hydrated.assetSlots);
      setShowValidationSummary(false);
      setSuccessMessage(
        `Jellyfin-Vorschau fuer ${preview.jellyfin_series_name} geladen.`,
      );
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(error, "Jellyfin-Vorschau konnte nicht geladen werden."),
      );
    }
  }

  function handleJellyfinCandidateSelect(candidateID: string) {
    clearMessages();
    clearAniSearchMessage();
    setAniSearchConflict(null);
    jellyfinIntake.reviewCandidate(candidateID);
    setSuccessMessage(
      "Treffer ausgewaehlt. Lade jetzt die Jellyfin-Vorschau, wenn dieser Ordner wirklich passt.",
    );
  }

  function handleRemoveJellyfinAsset(target: JellyfinDraftAssetTarget) {
    if (!jellyfinAssetSlots) return;

    const next = removeJellyfinDraftAsset(
      manualDraftValues,
      jellyfinAssetSlots,
      target,
    );
    applyManualDraftValues(next.draft);
    setJellyfinAssetSlots(next.assetSlots);
    setShowValidationSummary(false);
  }

  function handleDiscardJellyfinPreview() {
    if (jellyfinDraftSnapshot) applyManualDraftValues(jellyfinDraftSnapshot);
    setJellyfinPreview(null);
    setJellyfinAssetSlots(null);
    setJellyfinDraftSnapshot(null);
    setAniSearchConflict(null);
    jellyfinIntake.resetReview();
    clearMessages();
    clearAniSearchMessage();
    setSuccessMessage("Jellyfin-Vorschau verworfen. Der Entwurf bleibt ungespeichert.");
  }

  async function loadAniSearchDraftByID(anisearchID: string) {
    clearMessages();
    clearAniSearchState();
    setLastRequest(null);
    setLastResponse(null);

    if (!anisearchID) {
      setAniSearchErrorMessage("Bitte zuerst eine AniSearch-ID eingeben.");
      return;
    }

    const runtimeAuthToken = getRuntimeAuthToken();
    if (!runtimeAuthToken) {
      setAniSearchErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }

    const requestPayload = {
      anisearch_id: anisearchID,
      draft: resolveCreateAniSearchDraftMergeInputs({
        currentDraft: manualDraftValues,
        jellyfinSnapshot: jellyfinDraftSnapshot,
      }).requestDraft,
    };

    try {
      setIsLoadingAniSearchDraft(true);
      setLastRequest(JSON.stringify(requestPayload, null, 2));

      const response = await loadAdminAnimeCreateAniSearchDraft(
        requestPayload,
        runtimeAuthToken,
      );
      const resolved = applyCreateAniSearchControllerResult({
        currentDraft: manualDraftValues,
        jellyfinSnapshot: jellyfinDraftSnapshot,
        result: response.data,
      });

      setLastResponse(JSON.stringify(response, null, 2));

      if (resolved.redirect) {
        setAniSearchConflict(resolved.redirect);
        window.location.href = resolved.redirect.redirectPath;
        return;
      }

      applyManualDraftValues(resolved.nextDraft);
      setAniSearchDraftResult(resolved.draftResult);
      setShowValidationSummary(false);
    } catch (error) {
      setAniSearchErrorMessage(
        formatCreatePageError(error, "AniSearch-Daten konnten nicht geladen werden."),
      );
      } finally {
        setIsLoadingAniSearchDraft(false);
      }
    }

  async function handleAniSearchDraftLoad() {
    await loadAniSearchDraftByID(createAniSearchID.trim());
  }

  async function handleAniSearchCandidateSearch() {
    clearMessages();
    clearAniSearchState();
    setLastRequest(null);
    setLastResponse(null);

    const query = createAniSearchSearchQuery.trim();
    if (!query) {
      setAniSearchErrorMessage("Bitte zuerst einen AniSearch-Titel eingeben.");
      return;
    }

    const runtimeAuthToken = getRuntimeAuthToken();
    if (!runtimeAuthToken) {
      setAniSearchErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }

    try {
      setIsSearchingAniSearchCandidates(true);
      const response = await searchAdminAnimeCreateAniSearchCandidates(
        query,
        { limit: 12 },
        runtimeAuthToken,
      );
      const feedback = resolveAniSearchCandidateSearchFeedback(response);
      setLastResponse(JSON.stringify(response, null, 2));
      setAniSearchCandidates(feedback.candidates);
      setAniSearchFilteredExistingCount(feedback.filteredExistingCount);
      setAniSearchErrorMessage(feedback.errorMessage);
      if (feedback.successMessage) {
        setSuccessMessage(feedback.successMessage);
      }
    } catch (error) {
      setAniSearchErrorMessage(
        formatCreatePageError(error, "AniSearch-Treffer konnten nicht geladen werden."),
      );
    } finally {
      setIsSearchingAniSearchCandidates(false);
    }
  }

  async function handleAniSearchCandidateSelect(
    candidate: AdminAnimeAniSearchSearchCandidate,
  ) {
    setCreateAniSearchID(candidate.anisearch_id);
    setCreateAniSearchSearchQuery(candidate.title);
    await loadAniSearchDraftByID(candidate.anisearch_id);
  }

  const assetSearchPageLimit = activeAssetSearchKind === "background" ? 12 : 8;

  async function handleAssetCandidateSearch() {
    clearMessages();
    setAssetSearchErrorMessage(null);
    setAssetSearchHasMore(false);
    setLastRequest(null);
    setLastResponse(null);

    const query = assetSearchQuery.trim();
    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage("Bitte zuerst einen Asset-Slot waehlen.");
      return;
    }
    if (!query) {
      setAssetSearchErrorMessage("Bitte zuerst einen Suchbegriff eingeben.");
      return;
    }

    const runtimeAuthToken = getRuntimeAuthToken();
    if (!runtimeAuthToken) {
      setAssetSearchErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }

    try {
      setIsSearchingAssetCandidates(true);
      setAssetSearchPage(1);
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query,
          limit: assetSearchPageLimit,
          page: 1,
        },
        runtimeAuthToken,
      );
      setLastResponse(JSON.stringify(response, null, 2));
      setAssetSearchCandidates(response.data);
      setAssetSearchSelectedIDs([]);
      setAssetSearchHasMore(response.data.length >= assetSearchPageLimit);
      if (response.data.length === 0) {
        setAssetSearchErrorMessage(
          "Keine passenden Assets gefunden. Bitte pruefe Titel oder Quelle.",
        );
        return;
      }
      setSuccessMessage(
        `${response.data.length} Asset-Treffer gefunden. Waehle jetzt die passenden Bilder aus.`,
      );
    } catch (error) {
      setAssetSearchErrorMessage(
        formatCreatePageError(error, "Asset-Treffer konnten nicht geladen werden."),
      );
    } finally {
      setIsSearchingAssetCandidates(false);
    }
  }

  async function handleLoadMoreAssets() {
    if (!activeAssetSearchKind || isSearchingAssetCandidates) return;
    const query = assetSearchQuery.trim();
    if (!query) return;
    const runtimeAuthToken = getRuntimeAuthToken();
    if (!runtimeAuthToken) return;

    const nextPage = assetSearchPage + 1;
    try {
      setIsSearchingAssetCandidates(true);
      setAssetSearchErrorMessage(null);
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query,
          limit: assetSearchPageLimit,
          page: nextPage,
        },
        runtimeAuthToken,
      );
      setAssetSearchPage(nextPage);
      setAssetSearchCandidates((current) => [...current, ...response.data]);
      setAssetSearchHasMore(response.data.length >= assetSearchPageLimit);
      if (response.data.length === 0) {
        setAssetSearchErrorMessage("Keine weiteren Treffer gefunden.");
      }
    } catch (error) {
      setAssetSearchErrorMessage(
        formatCreatePageError(error, "Weitere Treffer konnten nicht geladen werden."),
      );
    } finally {
      setIsSearchingAssetCandidates(false);
    }
  }

  function toggleAssetCandidateSelection(candidateID: string) {
    if (activeAssetSearchKind === "background") {
      setAssetSearchSelectedIDs((current) =>
        current.includes(candidateID)
          ? current.filter((id) => id !== candidateID)
          : [...current, candidateID],
      );
      return;
    }

    setAssetSearchSelectedIDs((current) =>
      current[0] === candidateID ? [] : [candidateID],
    );
  }

  async function handleAssetCandidateAdoption() {
    clearMessages();
    setAssetSearchErrorMessage(null);

    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage("Bitte zuerst einen Asset-Slot waehlen.");
      return;
    }
    if (assetSearchSelectedIDs.length === 0) {
      setAssetSearchErrorMessage("Bitte zuerst mindestens einen Treffer auswaehlen.");
      return;
    }

    const selectedCandidates = assetSearchCandidates.filter((candidate) =>
      assetSearchSelectedIDs.includes(candidate.id),
    );

    try {
      setIsAdoptingAssetCandidates(true);
      const stagedCandidates = await Promise.all(
        selectedCandidates.map((candidate) =>
          stageRemoteCreateAssetCandidate(candidate),
        ),
      );

      if (activeAssetSearchKind === "cover") {
        resetStagedCover();
        const [nextCover] = stagedCandidates;
        if (nextCover) {
          setStagedCover(nextCover);
          setCreateCoverImage(nextCover.draftValue);
        }
      } else if (activeAssetSearchKind === "background") {
        setStagedAssets((current) => ({
          ...current,
          background: [...current.background, ...stagedCandidates],
        }));
      } else {
        const [nextAsset] = stagedCandidates;
        if (nextAsset) {
          setStagedAssets((current) => {
            revokeStagedAssetPreview(current[activeAssetSearchKind]);
            return { ...current, [activeAssetSearchKind]: nextAsset };
          });
        }
      }

      setShowValidationSummary(false);
      setSuccessMessage(
        activeAssetSearchKind === "background"
          ? `${stagedCandidates.length} Background(s) vorgemerkt.`
          : `${activeAssetSearchKind} erfolgreich vorgemerkt.`,
      );
      closeAssetSearch();
    } catch (error) {
      setAssetSearchErrorMessage(
        formatCreatePageError(
          error,
          "Das gewaehlte Asset konnte nicht uebernommen werden.",
        ),
      );
    } finally {
      setIsAdoptingAssetCandidates(false);
    }
  }

  return {
    assetSearch: {
      activeKind: activeAssetSearchKind,
      candidates: assetSearchCandidates,
      errorMessage: assetSearchErrorMessage,
      hasMore: assetSearchHasMore,
      isAdopting: isAdoptingAssetCandidates,
      isOpen: activeAssetSearchKind !== null,
      isSearching: isSearchingAssetCandidates,
      query: assetSearchQuery,
      selectedCandidateIDs: assetSearchSelectedIDs,
    },
    auth: { hasAuthToken, isHydrated: isAuthStateHydrated },
    anisearch: {
      candidates: aniSearchCandidates,
      conflict: aniSearchConflict,
      errorMessage: aniSearchErrorMessage,
      filteredExistingCount: aniSearchFilteredExistingCount,
      input: createAniSearchID,
      isLoading: isLoadingAniSearchDraft,
      isSearchingCandidates: isSearchingAniSearchCandidates,
      result: aniSearchDraftResult,
      searchQuery: createAniSearchSearchQuery,
    },
    debug: { lastRequest, lastResponse, showDebugPanel },
    editor,
    errorMessage,
    fileInputRefs: {
      cover: coverFileInputRef,
      banner: bannerFileInputRef,
      logo: logoFileInputRef,
      background: backgroundFileInputRef,
      background_video: backgroundVideoFileInputRef,
    },
    jellyfin: {
      draftAssets: jellyfinAssetSlots,
      hasSelectedPreview: hasSelectedJellyfinPreview,
      intake: jellyfinIntake,
      preview: jellyfinPreview,
      reviewVisibility: jellyfinReviewVisibility,
      searchState: jellyfinSearchState,
      selectedDraftAssetCount,
      showResults: showJellyfinResults,
    },
    manualDraft: {
      missingFields: showValidationSummary ? missingFields : [],
      readinessLabel,
      sourceActionState,
      stagedAssets,
      stagedCover,
      suggestions: {
        genre: {
          canLoadMore: genreSuggestionLimit < 1000,
          canResetLimit: genreSuggestionLimit > DEFAULT_GENRE_LIMIT,
          error: genreTokensError,
          isLoading: isLoadingGenreTokens,
          loadedCount: genreTokens.length,
          options: genreSuggestions,
          total: genreSuggestionsTotal,
        },
        tag: {
          canLoadMore: tagSuggestionLimit < 1000,
          canResetLimit: tagSuggestionLimit > DEFAULT_TAG_LIMIT,
          error: tagTokensError,
          isLoading: isLoadingTagTokens,
          loadedCount: tagTokens.length,
          options: tagSuggestions,
          total: tagSuggestionsTotal,
        },
      },
      values: {
        contentType: createContentType,
        coverImage: createCoverImage,
        description: createDescription,
        genreDraft: createGenreDraft,
        genreTokens: createGenreTokens,
        maxEpisodes: createMaxEpisodes,
        status: createStatus,
        tagDraft: createTagDraft,
        tagTokens: createTagTokens,
        title: createTitle,
        titleDE: createTitleDE,
        titleEN: createTitleEN,
        type: createType,
        year: createYear,
      },
    },
    status: {
      isSubmittingCreate,
      isUploadingCover,
      successMessage,
    },
    handlers: {
      addDraftGenre: () => {
        addCreateGenreTokens(createGenreDraft);
        setCreateGenreDraft("");
      },
      addDraftTag: () => {
        addCreateTagTokens(createTagDraft);
        setCreateTagDraft("");
      },
        addGenreSuggestion: addCreateGenreTokens,
        addTagSuggestion: addCreateTagTokens,
        clearAniSearchState,
      closeAssetSearch,
      handleAssetCandidateAdoption,
      handleAssetCandidateSearch,
      handleLoadMoreAssets,
      handleBackgroundInputChange,
      handleAniSearchCandidateSearch,
      handleAniSearchCandidateSelect,
      handleAniSearchDraftLoad,
      handleCoverUpload,
      handleCreateSubmit,
      handleDiscardJellyfinPreview,
      handleJellyfinCandidateReview,
      handleJellyfinCandidateSelect,
      handleJellyfinSearch,
      handleRemoveJellyfinAsset,
      handleSingleAssetInputChange,
      increaseGenreLimit: () =>
        setGenreSuggestionLimit((current) => Math.min(1000, current + 40)),
      increaseTagLimit: () =>
        setTagSuggestionLimit((current) => Math.min(1000, current + 40)),
      openAssetSearch,
      openAssetFileDialog,
      removeBackground: removeStagedBackground,
      removeGenreToken: (name: string) =>
        setCreateGenreTokens((current) =>
          current.filter((t) => t.toLowerCase() !== name.toLowerCase()),
        ),
      removeSingleAsset: removeStagedSingleAsset,
      removeTagToken: (name: string) =>
        setCreateTagTokens((current) =>
          current.filter((t) => t.toLowerCase() !== name.toLowerCase()),
        ),
      resetGenreLimit: () => setGenreSuggestionLimit(DEFAULT_GENRE_LIMIT),
      resetTagLimit: () => setTagSuggestionLimit(DEFAULT_TAG_LIMIT),
      restartJellyfinReview: () => {
        jellyfinIntake.restartReview();
        clearMessages();
        clearAniSearchMessage();
        setAniSearchConflict(null);
        setSuccessMessage(
          "Jellyfin-Suche wieder geoeffnet. Der aktuelle Entwurf bleibt bearbeitbar.",
        );
        },
      setAssetSearchQuery,
      setJellyfinQuery: jellyfinIntake.setQuery,
      setAniSearchID: setCreateAniSearchID,
      setAniSearchSearchQuery: setCreateAniSearchSearchQuery,
        setContentType: setCreateContentType,
      setCoverImage: (value: string) => {
        resetStagedCover();
        setCreateCoverImage(value);
        if (showValidationSummary) setShowValidationSummary(false);
      },
      setDescription: setCreateDescription,
      setDraftGenre: setCreateGenreDraft,
      setDraftTag: setCreateTagDraft,
      setMaxEpisodes: setCreateMaxEpisodes,
      setStatus: setCreateStatus,
      setTitle: (value: string) => {
        setCreateTitle(value);
        setAniSearchConflict(null);
        clearAniSearchMessage();
        if (showValidationSummary) setShowValidationSummary(false);
      },
      setTitleDE: setCreateTitleDE,
      setTitleEN: setCreateTitleEN,
      setType: setCreateType,
      setYear: setCreateYear,
      toggleAssetCandidateSelection,
    },
  };
}
