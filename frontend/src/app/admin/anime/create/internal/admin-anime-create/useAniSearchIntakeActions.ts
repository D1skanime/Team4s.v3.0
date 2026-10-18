import { Dispatch, SetStateAction, useCallback } from "react";

import {
  loadAdminAnimeCreateAniSearchDraft,
  searchAdminAnimeCreateAniSearchCandidates,
} from "@/lib/api/admin-anime-intake";
import type { AdminAnimeAniSearchSearchCandidate } from "@/types/admin";

import {
  formatCreatePageError,
  resolveCreateAniSearchDraftMergeInputs,
} from "../../createPageHelpers";
import { extractAniSearchIDFromLinkInput } from "../../../utils/anime-helpers";
import {
  applyCreateAniSearchControllerResult,
  type CreateAniSearchConflictState,
  type CreateAniSearchDraftState,
} from "../../createAniSearchControllerHelpers";
import type { ManualAnimeDraftValues } from "../../../hooks/useManualAnimeDraft";

type AdminAnimeAniSearchSearchCandidateResponse = {
  data: AdminAnimeAniSearchSearchCandidate[];
};

/**
 * D-20/174-10: leitet aus einer AniSearch-Kandidatensuche die anzuzeigenden
 * Treffer plus Erfolgs-/Fehlermeldung ab. Verschoben aus dem Impl-File
 * zusammen mit dem einzigen Aufrufer (handleAniSearchCandidateSearch), weiter
 * re-exportiert über die Facade (useAdminAnimeCreateController.ts) für den
 * bestehenden Test-Import.
 */
export function resolveAniSearchCandidateSearchFeedback(
  response: AdminAnimeAniSearchSearchCandidateResponse,
): {
  candidates: AdminAnimeAniSearchSearchCandidate[];
  errorMessage: string | null;
  successMessage: string | null;
} {
  const candidates = Array.isArray(response.data) ? response.data : [];

  if (candidates.length === 0) {
    return {
      candidates,
      errorMessage:
        "Keine AniSearch-Treffer gefunden. Bitte prüfe den Titel oder nutze die ID direkt.",
      successMessage: null,
    };
  }

  return {
    candidates,
    errorMessage: null,
    successMessage: `${candidates.length} AniSearch-Treffer gefunden. Wähle jetzt den passenden Eintrag aus.`,
  };
}

interface UseAniSearchIntakeActionsParams {
  hasAuthToken: boolean;
  manualDraftValues: ManualAnimeDraftValues;
  jellyfinDraftSnapshot: ManualAnimeDraftValues | null;
  jellyfinHydratedDraftSnapshot: ManualAnimeDraftValues | null;
  createAniSearchID: string;
  createAniSearchSearchQuery: string;
  setLastRequest: Dispatch<SetStateAction<string | null>>;
  setLastResponse: Dispatch<SetStateAction<string | null>>;
  setAniSearchErrorMessage: Dispatch<SetStateAction<string | null>>;
  setIsLoadingAniSearchDraft: Dispatch<SetStateAction<boolean>>;
  setAniSearchConflict: Dispatch<SetStateAction<CreateAniSearchConflictState | null>>;
  setAniSearchDraftResult: Dispatch<SetStateAction<CreateAniSearchDraftState | null>>;
  setShowValidationSummary: Dispatch<SetStateAction<boolean>>;
  setIsSearchingAniSearchCandidates: Dispatch<SetStateAction<boolean>>;
  setAniSearchCandidates: Dispatch<SetStateAction<AdminAnimeAniSearchSearchCandidate[]>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setCreateAniSearchID: Dispatch<SetStateAction<string>>;
  setCreateAniSearchSearchQuery: Dispatch<SetStateAction<string>>;
  clearMessages: () => void;
  clearAniSearchState: () => void;
  applyManualDraftValues: (values: ManualAnimeDraftValues) => void;
}

/**
 * D-13 (174-10): AniSearch-intake async handlers extracted from
 * useAdminAnimeCreateControllerImpl — load-by-ID, draft-load-from-input,
 * candidate search, and candidate select. All AniSearch-related `useState`
 * calls stay owned by the impl file (D-14/D-21); this sub-hook only receives
 * the relevant state values and setters as parameters.
 */
export function useAniSearchIntakeActions({
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
}: UseAniSearchIntakeActionsParams) {
  const loadAniSearchDraftByID = useCallback(
    async (rawAniSearchID: string) => {
      clearMessages();
      clearAniSearchState();
      setLastRequest(null);
      setLastResponse(null);

      // Item 2 (quick-261018-l5r Dedupe-Nachtrag): erlaubt auch das Einfuegen einer vollen
      // AniSearch-URL in dieses Feld, nicht nur die rohe ID -- dieselbe Extraktion wie in der
      // Anime-Bearbeitung (Task 3).
      const anisearchID = extractAniSearchIDFromLinkInput(rawAniSearchID);

      if (!anisearchID) {
        setAniSearchErrorMessage("Bitte zuerst eine AniSearch-ID eingeben.");
        return;
      }

      if (!hasAuthToken) {
        setAniSearchErrorMessage(
          "Anmeldung erforderlich. Bitte zuerst anmelden.",
        );
        return;
      }

      const requestPayload = {
        anisearch_id: anisearchID,
        draft: resolveCreateAniSearchDraftMergeInputs({
          currentDraft: manualDraftValues,
          jellyfinSnapshot: jellyfinDraftSnapshot,
          jellyfinHydratedSnapshot: jellyfinHydratedDraftSnapshot,
        }).requestDraft,
      };

      try {
        setIsLoadingAniSearchDraft(true);
        setLastRequest(JSON.stringify(requestPayload, null, 2));

        const response = await loadAdminAnimeCreateAniSearchDraft(requestPayload);
        const resolved = applyCreateAniSearchControllerResult({
          currentDraft: manualDraftValues,
          jellyfinSnapshot: jellyfinDraftSnapshot,
          jellyfinHydratedSnapshot: jellyfinHydratedDraftSnapshot,
          result: response.data,
        });

        setLastResponse(JSON.stringify(response, null, 2));

        if (resolved.redirect) {
          // D-23-Fix: keine automatische Vollseiten-Navigation mehr hier — der
          // Konflikt wird nur noch als Zustand gesetzt, damit
          // AniSearchDuplicateDecision tatsaechlich rendern kann, statt von der
          // Navigation ueberholt zu werden (live reproduziert, AniSearch-ID
          // 2788 -> Naruto #4). Der komplette Draft-State
          // (manualDraftValues/jellyfinDraftSnapshot) bleibt unangetastet.
          setAniSearchConflict(resolved.redirect);
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
    },
    [
      applyManualDraftValues,
      clearAniSearchState,
      clearMessages,
      hasAuthToken,
      jellyfinDraftSnapshot,
      jellyfinHydratedDraftSnapshot,
      manualDraftValues,
      setAniSearchConflict,
      setAniSearchDraftResult,
      setAniSearchErrorMessage,
      setIsLoadingAniSearchDraft,
      setLastRequest,
      setLastResponse,
      setShowValidationSummary,
    ],
  );

  const handleAniSearchDraftLoad = useCallback(async () => {
    await loadAniSearchDraftByID(createAniSearchID.trim());
  }, [createAniSearchID, loadAniSearchDraftByID]);

  const handleAniSearchCandidateSearch = useCallback(async () => {
    clearMessages();
    clearAniSearchState();
    setLastRequest(null);
    setLastResponse(null);

    const query = createAniSearchSearchQuery.trim();
    if (!query) {
      setAniSearchErrorMessage("Bitte zuerst einen AniSearch-Titel eingeben.");
      return;
    }

    if (!hasAuthToken) {
      setAniSearchErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }

    try {
      setIsSearchingAniSearchCandidates(true);
      const response = await searchAdminAnimeCreateAniSearchCandidates(
        query,
        { limit: 12 },
      );
      const feedback = resolveAniSearchCandidateSearchFeedback(response);
      setLastResponse(JSON.stringify(response, null, 2));
      setAniSearchCandidates(feedback.candidates);
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
  }, [
    clearAniSearchState,
    clearMessages,
    createAniSearchSearchQuery,
    hasAuthToken,
    setAniSearchCandidates,
    setAniSearchErrorMessage,
    setIsSearchingAniSearchCandidates,
    setLastRequest,
    setLastResponse,
    setSuccessMessage,
  ]);

  const handleAniSearchCandidateSelect = useCallback(
    async (candidate: AdminAnimeAniSearchSearchCandidate) => {
      setCreateAniSearchID(candidate.anisearch_id);
      setCreateAniSearchSearchQuery(candidate.title);
      await loadAniSearchDraftByID(candidate.anisearch_id);
    },
    [loadAniSearchDraftByID, setCreateAniSearchID, setCreateAniSearchSearchQuery],
  );

  return {
    loadAniSearchDraftByID,
    handleAniSearchDraftLoad,
    handleAniSearchCandidateSearch,
    handleAniSearchCandidateSelect,
  };
}
