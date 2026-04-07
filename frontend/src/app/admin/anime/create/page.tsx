"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  createAdminAnime,
  getAdminGenreTokens,
  getRuntimeAuthToken,
} from "@/lib/api";
import {
  createAdminAnimeFromJellyfinDraft,
  enrichAdminAnimeDraftFromAniSearch,
} from "@/lib/api/admin-anime-intake";
import { ContentType, AnimeStatus } from "@/types/anime";
import {
  AdminAnimeAssetKind,
  AdminAnimeCreateRequest,
  AnimeType,
  GenreToken,
} from "@/types/admin";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";
import {
  stageManualCreateAsset,
  uploadCreatedAnimeAssets,
} from "./createAssetUploadPlan";
export {
  stageManualCreateCover,
  uploadCreatedAnimeCover,
} from "./createAssetUploadPlan";
import { JellyfinCandidateReview } from "../components/JellyfinIntake/JellyfinCandidateReview";
import { JellyfinDraftAssets } from "../components/ManualCreate/JellyfinDraftAssets";
import { ManualCreateAniSearchPanel } from "../components/ManualCreate/ManualCreateAniSearchPanel";
import { ManualCreateWorkspace } from "../components/ManualCreate/ManualCreateWorkspace";
import { useAnimeEditor } from "../hooks/useAnimeEditor";
import {
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
  resolveManualCreateState,
  type JellyfinDraftAssetTarget,
  type ManualAnimeDraftValues,
} from "../hooks/useManualAnimeDraft";
import { useJellyfinIntake } from "../hooks/useJellyfinIntake";
import {
  normalizeOptionalString,
  parsePositiveInt,
  splitGenreTokens,
} from "../utils/anime-helpers";
import {
  formatJellyfinTypeHintConfidence,
  formatJellyfinTypeHintLabel,
  formatJellyfinTypeHintReasoning,
} from "../utils/jellyfin-intake-type-hint";
import type {
  AdminAnimeAniSearchEnrichmentDraftResult,
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
} from "@/types/admin";
import {
  buildAniSearchEnrichmentRequest,
  buildAniSearchRedirectPath,
  formatAniSearchSuccessMessage,
  hydrateAniSearchEnrichmentResult,
  isAniSearchLoadReady,
  isAniSearchRedirectResult,
} from "./anisearchCreateEnrichment";

export function buildManualCreateRedirectPath(id: number): string {
  return `/admin/anime?created=${id}#anime-${id}`;
}

export function appendJellyfinLinkageToCreatePayload(
  payload: AdminAnimeCreateRequest,
  preview: AdminAnimeJellyfinIntakePreviewResult | null,
): AdminAnimeCreateRequest {
  if (!preview) {
    return payload;
  }

  const source = `jellyfin:${preview.jellyfin_series_id.trim()}`;
  const folderName = preview.jellyfin_series_path?.trim();

  return {
    ...payload,
    source,
    folder_name: folderName || undefined,
  };
}

export async function createManualAnimeAndRedirect(
  payload: AdminAnimeCreateRequest,
  deps: {
    createAdminAnime: (
      payload: AdminAnimeCreateRequest,
      authToken?: string,
    ) => Promise<{ data: { id: number } }>;
    setLocationHref: (value: string) => void;
    authToken?: string;
  },
) {
  const response = deps.authToken
    ? await deps.createAdminAnime(payload, deps.authToken)
    : await deps.createAdminAnime(payload);
  deps.setLocationHref(buildManualCreateRedirectPath(response.data.id));
  return response;
}

export function formatCreatePageError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    const details = (error.details || "").trim();
    return details
      ? `(${error.status}) ${error.message}\n${details}`
      : `(${error.status}) ${error.message}`;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

const DEFAULT_GENRE_LIMIT = 40;

export function resolveJellyfinReviewVisibility(
  candidateCount: number,
  reviewMode: "idle" | "review" | "hydrated",
) {
  const hasCandidates = candidateCount > 0;

  return {
    showCandidateReview: hasCandidates && reviewMode !== "hydrated",
    showRestartAction: hasCandidates && reviewMode === "hydrated",
  };
}

export function resolveSourceActionState(title: string) {
  const trimmed = title.trim();
  const meaningful = trimmed.length >= 2 && /[\p{L}\p{N}]/u.test(trimmed);
  return {
    canSync: meaningful,
    helperText: meaningful
      ? "Jellyfin nutzt den aktuellen Titel als Suchanfrage."
      : "Gib zuerst einen aussagekraeftigen Anime-Titel ein.",
  };
}

export function buildManualCreateDraftSnapshot(
  values: ManualAnimeDraftValues,
): ManualAnimeDraftValues {
  return {
    ...values,
    genreTokens: [...values.genreTokens],
    tagTokens: [...values.tagTokens],
  };
}

export function resolveJellyfinPreviewBaseDraft(
  currentDraft: ManualAnimeDraftValues,
  existingSnapshot: ManualAnimeDraftValues | null,
): ManualAnimeDraftValues {
  return existingSnapshot
    ? buildManualCreateDraftSnapshot(existingSnapshot)
    : buildManualCreateDraftSnapshot(currentDraft);
}

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

type CreateSingleAssetKind = Exclude<AdminAnimeAssetKind, "cover" | "background">;

interface CreateManualStagedAssets {
  banner: CreateAssetUploadDraftValue | null;
  logo: CreateAssetUploadDraftValue | null;
  background: CreateAssetUploadDraftValue[];
  background_video: CreateAssetUploadDraftValue | null;
}

function createEmptyManualStagedAssets(): CreateManualStagedAssets {
  return {
    banner: null,
    logo: null,
    background: [],
    background_video: null,
  };
}

function revokeStagedAssetPreview(asset: CreateAssetUploadDraftValue | null) {
  if (asset?.previewUrl) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

function revokeStagedAssetPreviews(assets: CreateManualStagedAssets) {
  revokeStagedAssetPreview(assets.banner);
  revokeStagedAssetPreview(assets.logo);
  revokeStagedAssetPreview(assets.background_video);
  for (const entry of assets.background) {
    revokeStagedAssetPreview(entry);
  }
}

export default function AdminAnimeCreatePage() {
  const [authToken, setAuthToken] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([]);
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false);
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null);
  const [genreSuggestionLimit, setGenreSuggestionLimit] =
    useState(DEFAULT_GENRE_LIMIT);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<AnimeType>("tv");
  const [createContentType, setCreateContentType] =
    useState<ContentType>("anime");
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
  const [stagedCover, setStagedCover] =
    useState<CreateAssetUploadDraftValue | null>(null);
  const [stagedAssets, setStagedAssets] = useState<CreateManualStagedAssets>(
    createEmptyManualStagedAssets,
  );
  const [jellyfinPreview, setJellyfinPreview] =
    useState<AdminAnimeJellyfinIntakePreviewResult | null>(null);
  const [jellyfinAssetSlots, setJellyfinAssetSlots] =
    useState<AdminJellyfinIntakeAssetSlots | null>(null);
  const [aniSearchID, setAniSearchID] = useState("");
  const [aniSearchSource, setAniSearchSource] = useState<string | null>(null);
  const [aniSearchStatusText, setAniSearchStatusText] = useState<string | null>(
    null,
  );
  const [aniSearchRelationSummary, setAniSearchRelationSummary] = useState<
    string | null
  >(null);
  const [isLoadingAniSearch, setIsLoadingAniSearch] = useState(false);
  const [jellyfinDraftSnapshot, setJellyfinDraftSnapshot] =
    useState<ManualAnimeDraftValues | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundVideoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAuthToken(getRuntimeAuthToken());
  }, []);

  useEffect(() => {
    return () => {
      revokeStagedAssetPreview(stagedCover);
      revokeStagedAssetPreviews(stagedAssets);
    };
  }, [stagedAssets, stagedCover]);

  const hasAuthToken = authToken.length > 0;

  useEffect(() => {
    if (!hasAuthToken) return;

    setIsLoadingGenreTokens(true);
    setGenreTokensError(null);
    getAdminGenreTokens({ limit: 1000 }, authToken)
      .then((response) => setGenreTokens(response.data))
      .catch((error) => {
        if (error instanceof ApiError)
          setGenreTokensError(`(${error.status}) ${error.message}`);
        else
          setGenreTokensError(
            "Genre-Vorschlaege konnten nicht geladen werden.",
          );
      })
      .finally(() => setIsLoadingGenreTokens(false));
  }, [authToken, hasAuthToken]);

  const jellyfinIntake = useJellyfinIntake(authToken);

  useEffect(() => {
    jellyfinIntake.setQuery(createTitle);
  }, [createTitle, jellyfinIntake.setQuery]);

  const sourceActionState = useMemo(
    () => resolveSourceActionState(createTitle),
    [createTitle],
  );
  const canLoadAniSearch = useMemo(
    () => isAniSearchLoadReady(aniSearchID),
    [aniSearchID],
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
      createTagTokens,
      createMaxEpisodes,
      createStatus,
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

  const selectedDraftAssetCount = useMemo(
    () => countIncomingDraftAssets(jellyfinAssetSlots),
    [jellyfinAssetSlots],
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
  const showJellyfinResults = jellyfinReviewVisibility.showCandidateReview;
  const showDebugPanel =
    process.env.NODE_ENV !== "production" && (lastRequest || lastResponse);
  const editor = useAnimeEditor("create", {
    isDirty: manualDraftState.key !== "empty",
    canSubmit: manualDraftState.canSubmit,
    isSubmitting: isSubmittingCreate,
    formID: "anime-create-form",
    submitButtonType: "submit",
    submitLabel: isSubmittingCreate
      ? "Anime wird erstellt..."
      : "Anime erstellen",
    savedStateTitle: "Noch nicht bereit",
    savedStateMessage: "Titel und Cover fehlen noch.",
    dirtyStateTitle:
      manualDraftState.key === "ready" ? "Bereit zum Anlegen" : "Fehlt noch",
    dirtyStateMessage:
      manualDraftState.key === "ready"
        ? "Titel und Cover sind gesetzt."
        : "Titel und Cover fehlen noch.",
  });

  const createGenreValue = useMemo(
    () => createGenreTokens.join(", "),
    [createGenreTokens],
  );

  const genreSuggestions = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase();
    const selected = new Set(
      createGenreTokens.map((token) => token.toLowerCase()),
    );
    const filtered = genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false;
      if (!q) return true;
      return token.name.toLowerCase().includes(q);
    });
    const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit;
    return filtered.slice(0, limit);
  }, [createGenreDraft, createGenreTokens, genreSuggestionLimit, genreTokens]);

  const genreSuggestionsTotal = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase();
    const selected = new Set(
      createGenreTokens.map((token) => token.toLowerCase()),
    );
    return genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false;
      if (!q) return true;
      return token.name.toLowerCase().includes(q);
    }).length;
  }, [createGenreDraft, createGenreTokens, genreTokens]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
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
      const previous = current[kind];
      revokeStagedAssetPreview(previous);
      return {
        ...current,
        [kind]: staged,
      };
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
      return {
        ...current,
        [kind]: null,
      };
    });
  }

  function removeStagedBackground(index: number) {
    setStagedAssets((current) => {
      const next = [...current.background];
      const [removed] = next.splice(index, 1);
      revokeStagedAssetPreview(removed || null);
      return {
        ...current,
        background: next,
      };
    });
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

  async function handleAniSearchLoad() {
    clearMessages();

    if (!hasAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }

    if (!canLoadAniSearch) {
      setErrorMessage("Eine explizite AniSearch-ID ist erforderlich.");
      return;
    }

    try {
      setIsLoadingAniSearch(true);
      // Use pre-Jellyfin snapshot as base so AniSearch can override Jellyfin-filled
      // fields. Priority: Manual (1) > AniSearch (2) > Jellyfin (3).
      const aniSearchBaseDraft = jellyfinDraftSnapshot ?? manualDraftValues;
      const response = await enrichAdminAnimeDraftFromAniSearch(
        buildAniSearchEnrichmentRequest(aniSearchID, aniSearchBaseDraft),
        authToken,
      );

      if (response.data.mode === "redirect") {
        const redirectPath = buildAniSearchRedirectPath(response.data);
        setSuccessMessage(
          `AniSearch-ID ist bereits mit ${response.data.existing_title} verknuepft. Weiterleitung...`,
        );
        if (redirectPath) {
          window.location.href = redirectPath;
        }
        return;
      }

      const hydrated = hydrateAniSearchEnrichmentResult(
        aniSearchBaseDraft,
        response.data as AdminAnimeAniSearchEnrichmentDraftResult,
      );
      applyManualDraftValues(hydrated.draft);
      setAniSearchSource(hydrated.source || null);
      setAniSearchStatusText(
        hydrated.manualFieldsKept.length > 0
          ? `Manuell geschuetzt: ${hydrated.manualFieldsKept.join(", ")}`
          : "Manuelle Werte wurden nicht ueberschrieben.",
      );
      setAniSearchRelationSummary(hydrated.relationSummary);
      if (hydrated.assetSlots) {
        setJellyfinAssetSlots(hydrated.assetSlots);
      }
      setShowValidationSummary(false);
      setSuccessMessage(formatAniSearchSuccessMessage(hydrated));
    } catch (error) {
      setAniSearchStatusText(null);
      setAniSearchRelationSummary(null);
      setErrorMessage(
        formatCreatePageError(
          error,
          "AniSearch-Anreicherung konnte nicht geladen werden.",
        ),
      );
    } finally {
      setIsLoadingAniSearch(false);
    }
  }

  function addCreateGenreTokens(raw: string) {
    const tokens = splitGenreTokens(raw);
    if (tokens.length === 0) return;

    setCreateGenreTokens((current) => {
      const index = new Set(current.map((token) => token.toLowerCase()));
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
    const tokens = splitGenreTokens(raw);
    if (tokens.length === 0) return;

    setCreateTagTokens((current) => {
      const index = new Set(current.map((token) => token.toLowerCase()));
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

    if (!hasAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
      );
      return;
    }

    if (!manualDraftState.canSubmit) {
      setErrorMessage("Titel und Cover sind erforderlich");
      return;
    }

    const title = createTitle.trim();
    const payload: AdminAnimeCreateRequest = {
      title,
      type: createType,
      content_type: createContentType,
      status: createStatus,
    };
    const trimmedCoverImage = createCoverImage.trim();
    if (!stagedCover?.file && trimmedCoverImage)
      payload.cover_image = trimmedCoverImage;

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
      const createPayload = aniSearchSource
        ? { ...payload, source: aniSearchSource }
        : appendJellyfinLinkageToCreatePayload(payload, jellyfinPreview);
      const response = await createManualAnimeAndRedirect(createPayload, {
        createAdminAnime: jellyfinPreview
          ? createAdminAnimeFromJellyfinDraft
          : createAdminAnime,
        authToken,
        setLocationHref: () => undefined,
      });
      await uploadCreatedAnimeAssets(
        response.data.id,
        {
          cover: stagedCover,
          banner: stagedAssets.banner,
          logo: stagedAssets.logo,
          background: stagedAssets.background,
          background_video: stagedAssets.background_video,
        },
        authToken,
      );
      setSuccessMessage(
        `Anime #${response.data.id} wurde erstellt. (Weiterleitung zur Uebersicht...)`,
      );
      setLastResponse(JSON.stringify(response, null, 2));
      resetStagedCover();
      resetStagedAssets();
      window.location.href = buildManualCreateRedirectPath(response.data.id);
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
    setIsUploadingCover(true);
    try {
      resetStagedCover();
      const staged = stageManualCreateAsset(file);
      setStagedCover(staged);
      setCreateCoverImage(staged.draftValue);
      setShowValidationSummary(false);
      setSuccessMessage(`Cover vorbereitet: ${file.name}`);
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(error, "Cover Upload fehlgeschlagen."),
      );
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

  function handleBackgroundInputChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    clearMessages();
    addStagedBackground(file);
    event.target.value = "";
  }

  function openAssetFileDialog(
    kind: "cover" | "banner" | "logo" | "background" | "background_video",
  ) {
    if (kind === "cover") {
      coverFileInputRef.current?.click();
      return;
    }
    if (kind === "banner") {
      bannerFileInputRef.current?.click();
      return;
    }
    if (kind === "logo") {
      logoFileInputRef.current?.click();
      return;
    }
    if (kind === "background") {
      backgroundFileInputRef.current?.click();
      return;
    }
    backgroundVideoFileInputRef.current?.click();
  }

  async function handleJellyfinSearch() {
    clearMessages();
    try {
      await jellyfinIntake.search();
      if (jellyfinIntake.candidates.length === 0) {
        setSuccessMessage(
          "Jellyfin-Suche abgeschlossen. Falls keine Karten erscheinen, pruefe Titel oder Ordnernamen.",
        );
      }
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(
          error,
          "Jellyfin-Daten konnten nicht geladen werden.",
        ),
      );
    }
  }

  async function handleJellyfinCandidateReview(candidateID: string) {
    clearMessages();
    jellyfinIntake.reviewCandidate(candidateID);

    try {
      const preview = await jellyfinIntake.loadPreview(candidateID);
      if (!preview) {
        setErrorMessage("Jellyfin-Vorschau konnte nicht geladen werden.");
        return;
      }

      const baseDraft = resolveJellyfinPreviewBaseDraft(
        manualDraftValues,
        jellyfinDraftSnapshot,
      );
      setJellyfinDraftSnapshot(baseDraft);
      const hydrated = hydrateManualDraftFromJellyfinPreview(
        manualDraftValues,
        preview,
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
        formatCreatePageError(
          error,
          "Jellyfin-Vorschau konnte nicht geladen werden.",
        ),
      );
    }
  }

  function handleJellyfinCandidateSelect(candidateID: string) {
    clearMessages();
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
    if (jellyfinDraftSnapshot) {
      applyManualDraftValues(jellyfinDraftSnapshot);
    }
    setJellyfinPreview(null);
    setJellyfinAssetSlots(null);
    setJellyfinDraftSnapshot(null);
    jellyfinIntake.resetReview();
    clearMessages();
    setSuccessMessage(
      "Jellyfin-Vorschau verworfen. Der Entwurf bleibt ungespeichert.",
    );
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> |{" "}
        <Link href="/admin/anime">Studio</Link> | <Link href="/auth">Auth</Link>
      </p>

      <div className={createStyles.pageShell}>
        <header className={createStyles.pageHeader}>
          <div className={createStyles.pageTitleBlock}>
            <h1 className={createStyles.pageTitle}>Anime erstellen</h1>
            <p className={createStyles.pageIntro}>
              Pflicht sind nur Titel und Cover. Jellyfin bleibt eine optionale
              Hilfe.
            </p>
          </div>
          <div className={createStyles.statusBar}>
            <span
              className={`${createStyles.statusPill} ${
                missingFields.length === 0
                  ? createStyles.statusPillReady
                  : createStyles.statusPillWarning
              }`}
            >
              {readinessLabel}
            </span>
            <span className={createStyles.statusPill}>
              {hasSelectedJellyfinPreview
                ? "Jellyfin verknuepft"
                : showJellyfinResults
                  ? `${jellyfinIntake.candidates.length} Treffer`
                  : "Manuell"}
            </span>
            <span
              className={`${createStyles.statusPill} ${hasAuthToken ? createStyles.statusPillMuted : createStyles.statusPillWarning}`}
            >
              {hasAuthToken ? "Auth bereit" : "Auth fehlt"}
            </span>
            {selectedDraftAssetCount > 0 ? (
              <span className={createStyles.statusPill}>
                {selectedDraftAssetCount} Assets
              </span>
            ) : null}
          </div>
        </header>

        {errorMessage ? (
          <div className={styles.errorBox}>{errorMessage}</div>
        ) : null}
        {successMessage ? (
          <div className={styles.successBox}>{successMessage}</div>
        ) : null}

        <section className={createStyles.workspaceSection}>
          <ManualCreateWorkspace
            editor={editor}
            title={createTitle}
            type={createType}
            contentType={createContentType}
            status={createStatus}
            year={createYear}
            maxEpisodes={createMaxEpisodes}
            titleDE={createTitleDE}
            titleEN={createTitleEN}
            genreDraft={createGenreDraft}
            genreTokens={createGenreTokens}
            tagDraft={createTagDraft}
            tagTokens={createTagTokens}
            description={createDescription}
            coverImage={createCoverImage}
            coverPreviewUrl={stagedCover?.previewUrl}
            inputRefs={{
              cover: coverFileInputRef,
              banner: bannerFileInputRef,
              logo: logoFileInputRef,
              background: backgroundFileInputRef,
              background_video: backgroundVideoFileInputRef,
            }}
            stagedBanner={stagedAssets.banner}
            stagedLogo={stagedAssets.logo}
            stagedBackgrounds={stagedAssets.background}
            stagedBackgroundVideo={stagedAssets.background_video}
            genreSuggestions={genreSuggestions}
            genreSuggestionsTotal={genreSuggestionsTotal}
            loadedTokenCount={genreTokens.length}
            isLoadingGenres={isLoadingGenreTokens}
            genreError={genreTokensError}
            isSubmitting={isSubmittingCreate}
            isUploadingCover={isUploadingCover}
            canLoadMore={genreSuggestionLimit < 1000}
            canResetLimit={genreSuggestionLimit > DEFAULT_GENRE_LIMIT}
            missingFields={showValidationSummary ? missingFields : []}
            titleActions={
              <>
                <button
                  className={createStyles.primaryAction}
                  type="button"
                  disabled={
                    !sourceActionState.canSync ||
                    jellyfinIntake.isSearching ||
                    isSubmittingCreate
                  }
                  onClick={() => {
                    void handleJellyfinSearch();
                  }}
                >
                  {jellyfinIntake.isSearching
                    ? "Jellyfin sucht..."
                    : "Jellyfin suchen"}
                </button>
              </>
            }
            titleHint={
              <p className={styles.hint}>{sourceActionState.helperText}</p>
            }
            sourcePanel={
              <ManualCreateAniSearchPanel
                aniSearchID={aniSearchID}
                canLoad={canLoadAniSearch}
                isLoading={isLoadingAniSearch}
                statusText={aniSearchStatusText}
                relationSummary={aniSearchRelationSummary}
                onAniSearchIDChange={setAniSearchID}
                onLoad={() => {
                  void handleAniSearchLoad();
                }}
              />
            }
            typeHint={
              jellyfinPreview ? (
                <div className={styles.details}>
                  <strong>
                    {formatJellyfinTypeHintLabel(jellyfinPreview.type_hint)}
                  </strong>
                  <p className={styles.hint}>
                    Vertrauen:{" "}
                    {formatJellyfinTypeHintConfidence(
                      jellyfinPreview.type_hint.confidence,
                    )}
                  </p>
                  <p className={styles.hint}>
                    {formatJellyfinTypeHintReasoning(jellyfinPreview.type_hint)}
                  </p>
                </div>
              ) : null
            }
            draftAssets={
              jellyfinAssetSlots ? (
                <>
                  <JellyfinDraftAssets
                    animeTitle={
                      createTitle.trim() ||
                      jellyfinPreview?.jellyfin_series_name ||
                      "Anime"
                    }
                    assetSlots={jellyfinAssetSlots}
                    onRemoveAsset={handleRemoveJellyfinAsset}
                  />
                  {jellyfinPreview ? (
                    <div className={styles.actions}>
                      {jellyfinReviewVisibility.showRestartAction ? (
                        <button
                          className={styles.buttonSecondary}
                          type="button"
                          onClick={() => {
                            jellyfinIntake.restartReview();
                            clearMessages();
                            setSuccessMessage(
                              "Jellyfin-Suche wieder geoeffnet. Der aktuelle Entwurf bleibt bearbeitbar.",
                            );
                          }}
                        >
                          Anderen Treffer waehlen
                        </button>
                      ) : null}
                      <button
                        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                        type="button"
                        onClick={handleDiscardJellyfinPreview}
                      >
                        Auswahl verwerfen
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null
            }
            onSubmit={handleCreateSubmit}
            onTitleChange={(value) => {
              setCreateTitle(value);
              if (showValidationSummary) setShowValidationSummary(false);
            }}
            onTypeChange={setCreateType}
            onContentTypeChange={setCreateContentType}
            onStatusChange={setCreateStatus}
            onYearChange={setCreateYear}
            onMaxEpisodesChange={setCreateMaxEpisodes}
            onTitleDEChange={setCreateTitleDE}
            onTitleENChange={setCreateTitleEN}
            onDescriptionChange={setCreateDescription}
            onCoverImageChange={(value) => {
              resetStagedCover();
              setCreateCoverImage(value);
              if (showValidationSummary) setShowValidationSummary(false);
            }}
            onDraftGenreChange={setCreateGenreDraft}
            onAddDraftGenre={() => {
              addCreateGenreTokens(createGenreDraft);
              setCreateGenreDraft("");
            }}
            onRemoveGenreToken={(name) =>
              setCreateGenreTokens((current) =>
                current.filter(
                  (token) => token.toLowerCase() !== name.toLowerCase(),
                ),
              )
            }
            onAddGenreSuggestion={addCreateGenreTokens}
            onDraftTagChange={setCreateTagDraft}
            onAddDraftTag={() => {
              addCreateTagTokens(createTagDraft);
              setCreateTagDraft("");
            }}
            onRemoveTagToken={(name) =>
              setCreateTagTokens((current) =>
                current.filter(
                  (token) => token.toLowerCase() !== name.toLowerCase(),
                ),
              )
            }
            onIncreaseGenreLimit={() =>
              setGenreSuggestionLimit((current) => Math.min(1000, current + 40))
            }
            onResetGenreLimit={() =>
              setGenreSuggestionLimit(DEFAULT_GENRE_LIMIT)
            }
            onCoverFileChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await handleCoverUpload(file);
              } finally {
                event.target.value = "";
              }
            }}
            onSingleAssetFileChange={handleSingleAssetInputChange}
            onBackgroundFileChange={handleBackgroundInputChange}
            onOpenFileDialog={openAssetFileDialog}
            onRemoveSingleAsset={removeStagedSingleAsset}
            onRemoveBackground={removeStagedBackground}
          />
        </section>

        {showJellyfinResults ? (
          <section className={createStyles.resultsPanel}>
            <div className={createStyles.resultsHeader}>
              <div className={createStyles.resultsTitleBlock}>
                <p className={createStyles.resultsEyebrow}>Jellyfin</p>
                <h2 className={createStyles.resultsTitle}>Treffer pruefen</h2>
                <p className={createStyles.resultsText}>
                  Erst Details pruefen, dann die ausgewaehlte Serie aktiv in den
                  Entwurf laden. Beim Laden wird die bisherige Jellyfin-Vorschau
                  vollstaendig ersetzt.
                </p>
              </div>
              {hasSelectedJellyfinPreview ? (
                <span className={createStyles.statusPill}>Vorschau aktiv</span>
              ) : null}
            </div>
            <JellyfinCandidateReview
              query={createTitle.trim()}
              candidates={jellyfinIntake.candidates}
              selectedCandidateID={
                jellyfinIntake.reviewState.selectedCandidate?.jellyfin_series_id
              }
              isLoadingPreview={jellyfinIntake.isLoadingPreview}
              onSelectCandidate={handleJellyfinCandidateSelect}
              onLoadCandidatePreview={(candidateID) => {
                void handleJellyfinCandidateReview(candidateID);
              }}
            />
          </section>
        ) : null}

        {showDebugPanel ? (
          <details className={createStyles.developerDetails}>
            <summary className={createStyles.developerSummary}>
              Debug Request/Response
            </summary>
            <div className={createStyles.developerBody}>
              {lastRequest ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Request</strong>
                  {"\n"}
                  {lastRequest}
                </pre>
              ) : null}
              {lastResponse ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Response</strong>
                  {"\n"}
                  {lastResponse}
                </pre>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}
