import { Dispatch, FormEvent, MutableRefObject, SetStateAction, useCallback } from "react";

import { ApiError, createAdminAnime } from "@/lib/api";
import { createAdminAnimeFromJellyfinDraft } from "@/lib/api/admin-anime-intake";
import { AnimeStatus, ContentType } from "@/types/anime";
import type {
  AdminAnimeAniSearchCreateConflictResult,
  AdminAnimeCreateRequest,
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
  AnimeType,
} from "@/types/admin";

import {
  appendCreateSourceLinkageToPayload,
  buildAssistedCreateRedirectPath,
  buildCreateSuccessMessage,
  buildManualCreateRedirectPath,
  CREATE_REDIRECT_DELAY_MS,
  createManualAnimeAndRedirect,
  formatCreatePageError,
} from "../../createPageHelpers";
import {
  buildCreateAniSearchConflictState,
  type CreateAniSearchConflictState,
  type CreateAniSearchDraftState,
} from "../../createAniSearchControllerHelpers";
import type { CreateAssetUploadDraftValue } from "../../createAssetUploadPlan";
import { uploadCreatedAnimeAssets } from "../../createAssetUploadPlan";
import type { CreateManualStagedAssets } from "../../createStagedAssets";
import {
  normalizeOptionalString,
  parsePositiveInt,
} from "../../../utils/anime-helpers";

/**
 * D-13 (174-11): erkennt einen save-time AniSearch-Dublettenkonflikt (409 mit
 * `mode: "redirect"`) an einem gefangenen Fehler aus `createAdminAnime`/
 * `createAdminAnimeFromJellyfinDraft`, statt ihn generisch als Fehlertext
 * anzuzeigen. Gibt `null` zurück für jeden anderen Fehler (falscher Status,
 * kein ApiError, oder ein Konflikt vom Edit-Format `mode: "conflict"`).
 * Verschoben aus dem Impl-File zusammen mit dem einzigen Aufrufer
 * (submitCreate); weiter re-exportiert über das Impl-File für die bestehende
 * Facade (useAdminAnimeCreateController.ts).
 */
export function extractAniSearchCreateConflict(
  error: unknown,
): AdminAnimeAniSearchCreateConflictResult | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status !== 409) return null;
  if (!error.conflict || error.conflict.mode !== "redirect") return null;
  return error.conflict;
}

interface UseCreateSubmitActionParams {
  hasAuthToken: boolean;
  isDiscoveryFlow: boolean;
  discoveryReturnURL: string | undefined;
  manualDraftCanSubmit: boolean;
  createTitle: string;
  createType: AnimeType;
  createContentType: ContentType;
  createStatus: AnimeStatus;
  createYear: string;
  createMaxEpisodes: string;
  createTitleDE: string;
  createTitleEN: string;
  createGenreValue: string;
  createTagTokens: string[];
  createDescription: string;
  stagedCover: CreateAssetUploadDraftValue | null;
  stagedAssets: CreateManualStagedAssets;
  coverPayloadCoverImage: string;
  jellyfinAssetSlots: AdminJellyfinIntakeAssetSlots | null;
  aniSearchDraftResult: CreateAniSearchDraftState | null;
  jellyfinPreview: AdminAnimeJellyfinIntakePreviewResult | null;
  createRedirectTimeoutRef: MutableRefObject<number | null>;
  setIsSubmittingCreate: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setLastRequest: Dispatch<SetStateAction<string | null>>;
  setLastResponse: Dispatch<SetStateAction<string | null>>;
  setShowValidationSummary: Dispatch<SetStateAction<boolean>>;
  setAniSearchConflict: Dispatch<SetStateAction<CreateAniSearchConflictState | null>>;
  clearMessages: () => void;
}

/**
 * D-13 (174-11): submit-flow async handlers extracted from
 * useAdminAnimeCreateControllerImpl — builds the create payload, dispatches
 * to createAdminAnime/createAdminAnimeFromJellyfinDraft, uploads staged
 * assets, and handles the save-time AniSearch duplicate conflict. All
 * submit-related `useState` calls stay owned by the impl file (D-14/D-21);
 * this sub-hook only receives the relevant state values and setters as
 * parameters, plus derived values (coverState.payloadCoverImage,
 * manualDraftState.canSubmit) that only the impl can compute.
 */
export function useCreateSubmitAction({
  hasAuthToken,
  isDiscoveryFlow,
  discoveryReturnURL,
  manualDraftCanSubmit,
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
  coverPayloadCoverImage,
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
}: UseCreateSubmitActionParams) {
  const submitCreate = useCallback(async () => {
    clearMessages();
    setLastRequest(null);
    setLastResponse(null);
    setShowValidationSummary(true);
    if (createRedirectTimeoutRef.current !== null) {
      window.clearTimeout(createRedirectTimeoutRef.current);
      createRedirectTimeoutRef.current = null;
    }

    if (!hasAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }
    if (!manualDraftCanSubmit) {
      setErrorMessage("Titel und Cover sind erforderlich");
      return;
    }

    const payload: AdminAnimeCreateRequest = {
      title: createTitle.trim(),
      type: createType,
      content_type: createContentType,
      status: createStatus,
    };

    if (!stagedCover?.file && coverPayloadCoverImage) {
      payload.cover_image = coverPayloadCoverImage;
    }

    if (jellyfinAssetSlots?.banner?.present && jellyfinAssetSlots.banner.url && !stagedAssets.banner) {
      payload.banner_image = jellyfinAssetSlots.banner.url;
    }
    if (jellyfinAssetSlots?.logo?.present && jellyfinAssetSlots.logo.url && !stagedAssets.logo) {
      payload.logo_image = jellyfinAssetSlots.logo.url;
    }
    if (jellyfinAssetSlots?.background_video?.present && jellyfinAssetSlots.background_video.url && stagedAssets.background_video.length === 0) {
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
      );

      setSuccessMessage(buildCreateSuccessMessage(response));
      setLastResponse(JSON.stringify(response, null, 2));
      createRedirectTimeoutRef.current = window.setTimeout(() => {
        window.location.href = isDiscoveryFlow
          ? buildAssistedCreateRedirectPath(
              response.data.id,
              createType,
              discoveryReturnURL,
            )
          : buildManualCreateRedirectPath(response.data.id);
      }, CREATE_REDIRECT_DELAY_MS);
    } catch (error) {
      const conflict = extractAniSearchCreateConflict(error);
      if (conflict) {
        // D-20 zweiter Auslösepunkt: derselbe AniSearchDuplicateDecision-Block
        // erscheint erneut (mit Kontextzeile), statt den generischen Fehlerpfad
        // zu nehmen — alle bereits erfassten Draft-Felder bleiben unangetastet.
        setAniSearchConflict({
          ...buildCreateAniSearchConflictState(conflict),
          viaSaveTimeRecheck: true,
        });
        return;
      }

      setErrorMessage(
        formatCreatePageError(error, "Anime konnte nicht erstellt werden."),
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  }, [
    aniSearchDraftResult,
    clearMessages,
    coverPayloadCoverImage,
    createContentType,
    createDescription,
    createGenreValue,
    createMaxEpisodes,
    createRedirectTimeoutRef,
    createStatus,
    createTagTokens,
    createTitle,
    createTitleDE,
    createTitleEN,
    createType,
    createYear,
    discoveryReturnURL,
    hasAuthToken,
    isDiscoveryFlow,
    jellyfinAssetSlots,
    jellyfinPreview,
    manualDraftCanSubmit,
    setAniSearchConflict,
    setErrorMessage,
    setIsSubmittingCreate,
    setLastRequest,
    setLastResponse,
    setShowValidationSummary,
    setSuccessMessage,
    stagedAssets,
    stagedCover,
  ]);

  const handleCreateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submitCreate();
    },
    [submitCreate],
  );

  return { submitCreate, handleCreateSubmit };
}
