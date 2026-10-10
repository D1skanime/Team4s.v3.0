"use client";

// useAdminAnimeCreateController: central create-route orchestration extracted
// from page.tsx so the page can stay below the 700-line guardrail while the
// mutable create, asset, and Jellyfin state remains in one readable place.

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { useAuthSession } from "@/lib/useAuthSession";
import { AnimeStatus, ContentType } from "@/types/anime";
import type {
  AdminAnimeAniSearchSearchCandidate,
  AdminAnimeAssetKind,
  AdminAnimeAssetSearchCandidate,
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
  AnimeType,
} from "@/types/admin";

import {
  resolveJellyfinReviewVisibility,
  resolveSourceActionState,
} from "../createPageHelpers";
import type { CreateAssetUploadDraftValue } from "../createAssetUploadPlan";
import {
  type CreateAniSearchConflictState,
  type CreateAniSearchDraftState,
} from "../createAniSearchControllerHelpers";
import {
  stageManualCreateAsset,
} from "../createAssetUploadPlan";
import {
  CreateManualStagedAssets,
  CreateSingleAssetKind,
  createEmptyManualStagedAssets,
  revokeStagedAssetPreview,
  revokeStagedAssetPreviews,
} from "../createStagedAssets";
import { useAnimeEditor } from "../../hooks/useAnimeEditor";
import { useGenreTagAutocomplete } from "../../hooks/useGenreTagAutocomplete";
import {
  buildManualCreateDraftSnapshot,
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
  resolveManualCreateState,
  type JellyfinDraftAssetTarget,
  type ManualAnimeDraftValues,
} from "../../hooks/useManualAnimeDraft";
import { useJellyfinIntake } from "../../hooks/useJellyfinIntake";
import { deriveJellyfinIntakeSearchState } from "../../hooks/useJellyfinIntake";
import {
  normalizeOptionalString,
  splitGenreTokens,
  splitTagTokens,
} from "../../utils/anime-helpers";
import { resolveJellyfinIntakeAssetUrl } from "../../utils/jellyfin-intake-assets";
import { useJellyfinIntakeActions } from "./admin-anime-create/useJellyfinIntakeActions";
import { useAniSearchIntakeActions } from "./admin-anime-create/useAniSearchIntakeActions";
import { useAssetStagingActions } from "./admin-anime-create/useAssetStagingActions";
import { useCreateSubmitAction } from "./admin-anime-create/useCreateSubmitAction";

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

export function resolveCreateCoverState(params: {
  coverImage: string;
  stagedCover: CreateAssetUploadDraftValue | null;
  jellyfinAssetSlots: AdminJellyfinIntakeAssetSlots | null;
}): {
  hasCover: boolean;
  payloadCoverImage: string;
} {
  if (params.stagedCover) {
    return {
      hasCover: true,
      payloadCoverImage: "",
    };
  }

  const manualCoverImage = normalizeOptionalString(params.coverImage) ?? "";
  if (manualCoverImage) {
    return {
      hasCover: true,
      payloadCoverImage: manualCoverImage,
    };
  }

  const jellyfinCoverImage =
    params.jellyfinAssetSlots?.cover.present && params.jellyfinAssetSlots.cover.url
      ? normalizeOptionalString(
          resolveJellyfinIntakeAssetUrl(params.jellyfinAssetSlots.cover.url) ?? "",
        ) ?? ""
      : "";

  return {
    hasCover: Boolean(jellyfinCoverImage),
    payloadCoverImage: jellyfinCoverImage,
  };
}

// D-13 (174-10): moved to the AniSearch-intake sub-hook alongside its only
// caller (handleAniSearchCandidateSearch); re-exported here so the facade's
// existing re-export path stays unchanged for callers/tests.
export { resolveAniSearchCandidateSearchFeedback } from "./admin-anime-create/useAniSearchIntakeActions";

// D-13 (174-11): moved to the submit sub-hook alongside its only caller
// (submitCreate); re-exported here so the facade's existing re-export path
// stays unchanged for callers/tests.
export { extractAniSearchCreateConflict } from "./admin-anime-create/useCreateSubmitAction";

export interface UseAdminAnimeCreateControllerOptions {
  /** D-10/D-11: markiert den Create-Vorgang als Discovery-gestuetzt (aus dem Bibliotheks-Hand-off). */
  isDiscoveryFlow?: boolean;
  /** D-11: `return`-Query-Param, das an den Post-Create-Redirect angehaengt wird, wenn isDiscoveryFlow gesetzt ist. */
  returnURL?: string;
}

export function useAdminAnimeCreateController(
  options?: UseAdminAnimeCreateControllerOptions,
) {
  const isDiscoveryFlow = options?.isDiscoveryFlow ?? false;
  const discoveryReturnURL = options?.returnURL;
  const { hasAccessToken: hasAuthToken, isClientInitialized: isAuthStateHydrated } = useAuthSession();
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aniSearchErrorMessage, setAniSearchErrorMessage] =
    useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const [genreSuggestionLimit, setGenreSuggestionLimit] = useState(DEFAULT_GENRE_LIMIT);
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
  const [hasAdoptedJellyfinPreview, setHasAdoptedJellyfinPreview] =
    useState(false);
  const [jellyfinDraftSnapshot, setJellyfinDraftSnapshot] =
    useState<ManualAnimeDraftValues | null>(null);
  // GAP-18: anders als jellyfinDraftSnapshot (der PRE-Hydration-Stand für
  // "Verwerfen") ist dies der Entwurfs-Stand DIREKT NACH der
  // Jellyfin-Übernahme — verwendet ausschließlich zur
  // AniSearch-Präzedenzprüfung (resolveAniSearchProtectedFields).
  const [jellyfinHydratedDraftSnapshot, setJellyfinHydratedDraftSnapshot] =
    useState<ManualAnimeDraftValues | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundVideoFileInputRef = useRef<HTMLInputElement | null>(null);
  const createRedirectTimeoutRef = useRef<number | null>(null);

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

  const autocomplete = useGenreTagAutocomplete({
    genreDraft: createGenreDraft,
    selectedGenreTokens: createGenreTokens,
    tagDraft: createTagDraft,
    selectedTagTokens: createTagTokens,
    genreSuggestionLimit,
    tagSuggestionLimit,
    enabled: hasAuthToken,
  });

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
      source:
        aniSearchDraftResult?.draft.source?.trim() ||
        (jellyfinPreview ? `jellyfin:${jellyfinPreview.jellyfin_series_id.trim()}` : ""),
      folderName:
        aniSearchDraftResult?.draft.folder_name?.trim() ||
        jellyfinPreview?.jellyfin_series_path?.trim() ||
        "",
    }),
    [
      aniSearchDraftResult?.draft.folder_name,
      aniSearchDraftResult?.draft.source,
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
      jellyfinPreview,
    ],
  );

  const manualDraftState = useMemo(
    () =>
      resolveManualCreateState({
        title: createTitle,
        cover_image: resolveCreateCoverState({
          coverImage: createCoverImage,
          stagedCover,
          jellyfinAssetSlots,
        }).hasCover
          ? "present"
          : "",
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
      jellyfinAssetSlots,
      stagedCover,
    ],
  );

  const coverState = useMemo(
    () =>
      resolveCreateCoverState({
        coverImage: createCoverImage,
        stagedCover,
        jellyfinAssetSlots,
      }),
    [createCoverImage, jellyfinAssetSlots, stagedCover],
  );

  const missingFields = useMemo(() => {
    const fields: string[] = [];
    if (!createTitle.trim()) fields.push("Titel");
    if (!coverState.hasCover) fields.push("Cover");
    return fields;
  }, [coverState.hasCover, createTitle]);

  const createGenreValue = useMemo(
    () => createGenreTokens.join(", "),
    [createGenreTokens],
  );

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
    setSuccessMessage(`${staged.draftValue} für ${kind} vorbereitet.`);
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

  function addStagedBackgroundVideo(file: File) {
    const staged = stageManualCreateAsset(file);
    setStagedAssets((current) => ({
      ...current,
      background_video: [...current.background_video, staged],
    }));
    setShowValidationSummary(false);
    setSuccessMessage(`Background-Video vorbereitet: ${staged.draftValue}`);
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

  function removeStagedBackgroundVideo(index: number) {
    setStagedAssets((current) => {
      const next = [...current.background_video];
      const [removed] = next.splice(index, 1);
      revokeStagedAssetPreview(removed || null);
      return { ...current, background_video: next };
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

  const { handleCreateSubmit } = useCreateSubmitAction({
    hasAuthToken,
    isDiscoveryFlow,
    discoveryReturnURL,
    manualDraftCanSubmit: manualDraftState.canSubmit,
    createTitle,
    createType,
    createContentType,
    createStatus,
    createYear,
    createMaxEpisodes,
    createTitleDE,
    createTitleEN,
    createGenreValue,
    createTagTokens,
    createDescription,
    stagedCover,
    stagedAssets,
    coverPayloadCoverImage: coverState.payloadCoverImage,
    jellyfinAssetSlots,
    aniSearchDraftResult,
    jellyfinPreview,
    createRedirectTimeoutRef,
    setIsSubmittingCreate,
    setErrorMessage,
    setSuccessMessage,
    setLastRequest,
    setLastResponse,
    setShowValidationSummary,
    setAniSearchConflict,
    clearMessages,
  });

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

  function handleBackgroundVideoInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearMessages();
    addStagedBackgroundVideo(file);
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

  const { handleJellyfinSearch, handleJellyfinCandidateReview, handleJellyfinCandidateAdopt } =
    useJellyfinIntakeActions({
      jellyfinIntake,
      manualDraftValues,
      jellyfinDraftSnapshot,
      aniSearchDraftResult,
      setJellyfinDraftSnapshot,
      setJellyfinPreview,
      setHasAdoptedJellyfinPreview,
      setShowValidationSummary,
      setJellyfinHydratedDraftSnapshot,
      setJellyfinAssetSlots,
      setSuccessMessage,
      setErrorMessage,
      setAniSearchConflict,
      clearMessages,
      clearAniSearchMessage,
      applyManualDraftValues,
    });

  function handleJellyfinCandidateSelect(candidateID: string) {
    clearMessages();
    clearAniSearchMessage();
    setAniSearchConflict(null);
    jellyfinIntake.reviewCandidate(candidateID);
    setSuccessMessage(
      "Treffer ausgewählt. Lade jetzt die Jellyfin-Vorschau, wenn dieser Ordner wirklich passt.",
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

  function handleJellyfinAdopt() {
    if (!jellyfinPreview) return;
    const hydrated = hydrateManualDraftFromJellyfinPreview(
      manualDraftValues,
      jellyfinPreview,
      aniSearchDraftResult ? { mode: "fill" } : undefined,
    );
    applyManualDraftValues(hydrated.draft);
    setJellyfinHydratedDraftSnapshot(buildManualCreateDraftSnapshot(hydrated.draft));
    setJellyfinAssetSlots(hydrated.assetSlots);
    setHasAdoptedJellyfinPreview(true);
    setShowValidationSummary(false);
    setSuccessMessage("Jellyfin-Assets wurden zur Prüfung übernommen.");
  }

  function handleDiscardJellyfinPreview() {
    if (jellyfinDraftSnapshot) applyManualDraftValues(jellyfinDraftSnapshot);
    setJellyfinPreview(null);
    setJellyfinAssetSlots(null);
    setHasAdoptedJellyfinPreview(false);
    setJellyfinDraftSnapshot(null);
    setJellyfinHydratedDraftSnapshot(null);
    setAniSearchConflict(null);
    jellyfinIntake.resetReview();
    clearMessages();
    clearAniSearchMessage();
    setSuccessMessage("Jellyfin-Auswahl verworfen. Der Anime wurde noch nicht erstellt.");
  }

  const {
    handleAniSearchDraftLoad,
    handleAniSearchCandidateSearch,
    handleAniSearchCandidateSelect,
  } = useAniSearchIntakeActions({
    hasAuthToken,
    manualDraftValues,
    jellyfinDraftSnapshot,
    jellyfinHydratedDraftSnapshot,
    createAniSearchID,
    createAniSearchSearchQuery,
    setLastRequest,
    setLastResponse,
    setAniSearchErrorMessage,
    setIsLoadingAniSearchDraft,
    setAniSearchConflict,
    setAniSearchDraftResult,
    setShowValidationSummary,
    setIsSearchingAniSearchCandidates,
    setAniSearchCandidates,
    setSuccessMessage,
    setCreateAniSearchID,
    setCreateAniSearchSearchQuery,
    clearMessages,
    clearAniSearchState,
    applyManualDraftValues,
  });

  const assetSearchPageLimit = activeAssetSearchKind === "background" ? 12 : 8;

  const {
    handleCoverUpload,
    handleAssetCandidateSearch,
    handleLoadMoreAssets,
    handleAssetCandidateAdoption,
  } = useAssetStagingActions({
    activeAssetSearchKind,
    assetSearchQuery,
    assetSearchCandidates,
    assetSearchSelectedIDs,
    assetSearchPage,
    isSearchingAssetCandidates,
    hasAuthToken,
    assetSearchPageLimit,
    setAssetSearchErrorMessage,
    setAssetSearchHasMore,
    setLastRequest,
    setLastResponse,
    setIsSearchingAssetCandidates,
    setAssetSearchPage,
    setAssetSearchCandidates,
    setAssetSearchSelectedIDs,
    setIsAdoptingAssetCandidates,
    setIsUploadingCover,
    setStagedCover,
    setStagedAssets,
    setCreateCoverImage,
    setShowValidationSummary,
    setSuccessMessage,
    setErrorMessage,
    clearMessages,
    clearAniSearchMessage,
    resetStagedCover,
    closeAssetSearch,
  });

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
      folderPath: jellyfinPreview?.jellyfin_series_path?.trim() ?? "",
      hasAdoptedPreview: hasAdoptedJellyfinPreview,
      hasSelectedPreview: hasSelectedJellyfinPreview,
      intake: jellyfinIntake,
      preview: jellyfinPreview,
      reviewVisibility: jellyfinReviewVisibility,
      searchState: jellyfinSearchState,
      selectedDraftAssetCount,
      showResults: showJellyfinResults,
    },
    manualDraft: {
      hasCover: coverState.hasCover,
      missingFields: showValidationSummary ? missingFields : [],
      readinessLabel,
      sourceActionState,
      stagedAssets,
      stagedCover,
      suggestions: {
        genre: {
          canLoadMore: genreSuggestionLimit < 1000,
          canResetLimit: genreSuggestionLimit > DEFAULT_GENRE_LIMIT,
          error: autocomplete.genreTokensError,
          isLoading: autocomplete.isLoadingGenreTokens,
          loadedCount: autocomplete.genreTokens.length,
          options: autocomplete.genreSuggestions,
          total: autocomplete.genreSuggestionsTotal,
        },
        tag: {
          canLoadMore: tagSuggestionLimit < 1000,
          canResetLimit: tagSuggestionLimit > DEFAULT_TAG_LIMIT,
          error: autocomplete.tagTokensError,
          isLoading: autocomplete.isLoadingTagTokens,
          loadedCount: autocomplete.tagTokens.length,
          options: autocomplete.tagSuggestions,
          total: autocomplete.tagSuggestionsTotal,
        },
      },
      values: {
        contentType: createContentType,
        coverImage: createCoverImage,
        description: createDescription,
        folderName: manualDraftValues.folderName,
        genreDraft: createGenreDraft,
        genreTokens: createGenreTokens,
        maxEpisodes: createMaxEpisodes,
        source: manualDraftValues.source,
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
      handleBackgroundVideoInputChange,
      handleAniSearchCandidateSearch,
      handleAniSearchCandidateSelect,
      handleAniSearchDraftLoad,
      handleCoverUpload,
      handleCreateSubmit,
      handleDiscardJellyfinPreview,
      handleJellyfinAdopt,
      handleJellyfinCandidateAdopt,
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
      removeBackgroundVideo: removeStagedBackgroundVideo,
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
          "Jellyfin-Suche wieder geöffnet.",
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
