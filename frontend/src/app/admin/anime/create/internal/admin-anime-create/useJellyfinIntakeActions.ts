import { Dispatch, SetStateAction, useCallback } from "react";

import type {
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
} from "@/types/admin";

import {
  formatCreatePageError,
  resolveJellyfinPreviewBaseDraft,
} from "../../createPageHelpers";
import type { CreateAniSearchConflictState, CreateAniSearchDraftState } from "../../createAniSearchControllerHelpers";
import {
  buildManualCreateDraftSnapshot,
  hydrateManualDraftFromJellyfinPreview,
  type ManualAnimeDraftValues,
} from "../../../hooks/useManualAnimeDraft";
import { useJellyfinIntake } from "../../../hooks/useJellyfinIntake";

interface UseJellyfinIntakeActionsParams {
  jellyfinIntake: ReturnType<typeof useJellyfinIntake>;
  manualDraftValues: ManualAnimeDraftValues;
  jellyfinDraftSnapshot: ManualAnimeDraftValues | null;
  aniSearchDraftResult: CreateAniSearchDraftState | null;
  setJellyfinDraftSnapshot: Dispatch<SetStateAction<ManualAnimeDraftValues | null>>;
  setJellyfinPreview: Dispatch<SetStateAction<AdminAnimeJellyfinIntakePreviewResult | null>>;
  setHasAdoptedJellyfinPreview: Dispatch<SetStateAction<boolean>>;
  setShowValidationSummary: Dispatch<SetStateAction<boolean>>;
  setJellyfinHydratedDraftSnapshot: Dispatch<SetStateAction<ManualAnimeDraftValues | null>>;
  setJellyfinAssetSlots: Dispatch<SetStateAction<AdminJellyfinIntakeAssetSlots | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setAniSearchConflict: Dispatch<SetStateAction<CreateAniSearchConflictState | null>>;
  clearMessages: () => void;
  clearAniSearchMessage: () => void;
  applyManualDraftValues: (values: ManualAnimeDraftValues) => void;
}

/**
 * D-13 (174-10): Jellyfin-intake async handlers extracted from
 * useAdminAnimeCreateControllerImpl — search, load-preview-for-review, and
 * load-preview-then-adopt. All Jellyfin-related `useState` calls stay owned
 * by the impl file (D-14/D-21); this sub-hook only receives the relevant
 * state values and setters as parameters.
 */
export function useJellyfinIntakeActions({
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
}: UseJellyfinIntakeActionsParams) {
  const handleJellyfinSearch = useCallback(async () => {
    clearMessages();
    clearAniSearchMessage();
    setAniSearchConflict(null);

    try {
      await jellyfinIntake.search();
      if (jellyfinIntake.candidates.length === 0) {
        setSuccessMessage(
          "Jellyfin-Suche abgeschlossen. Falls keine Karten erscheinen, prüfe Titel oder Ordnernamen.",
        );
      }
    } catch (error) {
      setErrorMessage(
        formatCreatePageError(error, "Jellyfin-Daten konnten nicht geladen werden."),
      );
    }
  }, [clearAniSearchMessage, clearMessages, jellyfinIntake, setAniSearchConflict, setErrorMessage, setSuccessMessage]);

  const handleJellyfinCandidateReview = useCallback(
    async (candidateID: string) => {
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

        setJellyfinPreview(preview);
        setHasAdoptedJellyfinPreview(false);
        setShowValidationSummary(false);
        setSuccessMessage(
          `Jellyfin-Vorschau für ${preview.jellyfin_series_name} geladen. Uebernimm den Ordner erst explizit, wenn er wirklich passt.`,
        );
      } catch (error) {
        setErrorMessage(
          formatCreatePageError(error, "Jellyfin-Vorschau konnte nicht geladen werden."),
        );
      }
    },
    [
      clearAniSearchMessage,
      clearMessages,
      jellyfinDraftSnapshot,
      jellyfinIntake,
      manualDraftValues,
      setAniSearchConflict,
      setErrorMessage,
      setHasAdoptedJellyfinPreview,
      setJellyfinDraftSnapshot,
      setJellyfinPreview,
      setShowValidationSummary,
      setSuccessMessage,
    ],
  );

  const handleJellyfinCandidateAdopt = useCallback(
    async (candidateID: string) => {
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

        const nextSnapshot = resolveJellyfinPreviewBaseDraft(
          manualDraftValues,
          jellyfinDraftSnapshot,
        );
        setJellyfinDraftSnapshot(nextSnapshot);
        setJellyfinPreview(preview);

        const hydrated = hydrateManualDraftFromJellyfinPreview(
          manualDraftValues,
          preview,
          aniSearchDraftResult ? { mode: "fill" } : undefined,
        );
        applyManualDraftValues(hydrated.draft);
        setJellyfinHydratedDraftSnapshot(buildManualCreateDraftSnapshot(hydrated.draft));
        setJellyfinAssetSlots(hydrated.assetSlots);
        setHasAdoptedJellyfinPreview(true);
        setShowValidationSummary(false);
        setSuccessMessage(
          `${preview.jellyfin_series_name} wurde als Jellyfin-Quelle übernommen.`,
        );
      } catch (error) {
        setErrorMessage(
          formatCreatePageError(error, "Jellyfin-Quelle konnte nicht übernommen werden."),
        );
      }
    },
    [
      aniSearchDraftResult,
      applyManualDraftValues,
      clearAniSearchMessage,
      clearMessages,
      jellyfinDraftSnapshot,
      jellyfinIntake,
      manualDraftValues,
      setAniSearchConflict,
      setErrorMessage,
      setHasAdoptedJellyfinPreview,
      setJellyfinAssetSlots,
      setJellyfinDraftSnapshot,
      setJellyfinHydratedDraftSnapshot,
      setJellyfinPreview,
      setShowValidationSummary,
      setSuccessMessage,
    ],
  );

  return { handleJellyfinSearch, handleJellyfinCandidateReview, handleJellyfinCandidateAdopt };
}
