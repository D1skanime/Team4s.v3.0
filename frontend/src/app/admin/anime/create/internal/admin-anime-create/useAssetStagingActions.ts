import { Dispatch, SetStateAction, useCallback } from "react";

import type {
  AdminAnimeAssetKind,
  AdminAnimeAssetSearchCandidate,
} from "@/types/admin";
import { searchAdminAnimeCreateAssetCandidates } from "@/lib/api/admin-anime-intake";

import { formatCreatePageError } from "../../createPageHelpers";
import {
  stageManualCreateAsset,
  stageRemoteCreateAssetCandidate,
} from "../../createAssetUploadPlan";
import type {
  CreateAssetUploadDraftValue,
} from "../../createAssetUploadPlan";
import {
  CreateManualStagedAssets,
  CreateSingleAssetKind,
  revokeStagedAssetPreview,
} from "../../createStagedAssets";

type CreateSearchableAssetKind = Extract<
  AdminAnimeAssetKind,
  "cover" | "banner" | "logo" | "background"
>;

interface UseAssetStagingActionsParams {
  activeAssetSearchKind: CreateSearchableAssetKind | null;
  assetSearchQuery: string;
  assetSearchCandidates: AdminAnimeAssetSearchCandidate[];
  assetSearchSelectedIDs: string[];
  assetSearchPage: number;
  isSearchingAssetCandidates: boolean;
  hasAuthToken: boolean;
  assetSearchPageLimit: number;
  setAssetSearchErrorMessage: Dispatch<SetStateAction<string | null>>;
  setAssetSearchHasMore: Dispatch<SetStateAction<boolean>>;
  setLastRequest: Dispatch<SetStateAction<string | null>>;
  setLastResponse: Dispatch<SetStateAction<string | null>>;
  setIsSearchingAssetCandidates: Dispatch<SetStateAction<boolean>>;
  setAssetSearchPage: Dispatch<SetStateAction<number>>;
  setAssetSearchCandidates: Dispatch<SetStateAction<AdminAnimeAssetSearchCandidate[]>>;
  setAssetSearchSelectedIDs: Dispatch<SetStateAction<string[]>>;
  setIsAdoptingAssetCandidates: Dispatch<SetStateAction<boolean>>;
  setIsUploadingCover: Dispatch<SetStateAction<boolean>>;
  setStagedCover: Dispatch<SetStateAction<CreateAssetUploadDraftValue | null>>;
  setStagedAssets: Dispatch<SetStateAction<CreateManualStagedAssets>>;
  setCreateCoverImage: Dispatch<SetStateAction<string>>;
  setShowValidationSummary: Dispatch<SetStateAction<boolean>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  clearMessages: () => void;
  clearAniSearchMessage: () => void;
  resetStagedCover: () => void;
  closeAssetSearch: () => void;
}

/**
 * D-13 (174-11): asset-staging async handlers extracted from
 * useAdminAnimeCreateControllerImpl — cover upload plus asset-candidate
 * search/load-more/adopt. All asset-staging `useState` calls stay owned by
 * the impl file (D-14/D-21); this sub-hook only receives the relevant state
 * values and setters as parameters. The already-extracted pure helpers
 * stageManualCreateAsset/stageRemoteCreateAssetCandidate are imported
 * directly rather than passed through.
 */
export function useAssetStagingActions({
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
}: UseAssetStagingActionsParams) {
  const handleCoverUpload = useCallback(
    async (file: File) => {
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
    },
    [
      clearAniSearchMessage,
      clearMessages,
      resetStagedCover,
      setCreateCoverImage,
      setErrorMessage,
      setIsUploadingCover,
      setShowValidationSummary,
      setStagedCover,
      setSuccessMessage,
    ],
  );

  const handleAssetCandidateSearch = useCallback(async () => {
    clearMessages();
    setAssetSearchErrorMessage(null);
    setAssetSearchHasMore(false);
    setLastRequest(null);
    setLastResponse(null);

    const query = assetSearchQuery.trim();
    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage("Bitte zuerst einen Asset-Slot wählen.");
      return;
    }
    if (!query) {
      setAssetSearchErrorMessage("Bitte zuerst einen Suchbegriff eingeben.");
      return;
    }

    if (!hasAuthToken) {
      setAssetSearchErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
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
      );
      setLastResponse(JSON.stringify(response, null, 2));
      setAssetSearchCandidates(response.data);
      setAssetSearchSelectedIDs([]);
      setAssetSearchHasMore(response.data.length >= assetSearchPageLimit);
      if (response.data.length === 0) {
        setAssetSearchErrorMessage(
          "Keine passenden Assets gefunden. Bitte prüfe Titel oder Quelle.",
        );
        return;
      }
      setSuccessMessage(
        `${response.data.length} Asset-Treffer gefunden. Wähle jetzt die passenden Bilder aus.`,
      );
    } catch (error) {
      setAssetSearchErrorMessage(
        formatCreatePageError(error, "Asset-Treffer konnten nicht geladen werden."),
      );
    } finally {
      setIsSearchingAssetCandidates(false);
    }
  }, [
    activeAssetSearchKind,
    assetSearchPageLimit,
    assetSearchQuery,
    clearMessages,
    hasAuthToken,
    setAssetSearchCandidates,
    setAssetSearchErrorMessage,
    setAssetSearchHasMore,
    setAssetSearchPage,
    setAssetSearchSelectedIDs,
    setIsSearchingAssetCandidates,
    setLastRequest,
    setLastResponse,
    setSuccessMessage,
  ]);

  const handleLoadMoreAssets = useCallback(async () => {
    if (!activeAssetSearchKind || isSearchingAssetCandidates) return;
    const query = assetSearchQuery.trim();
    if (!query) return;
    if (!hasAuthToken) return;

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
  }, [
    activeAssetSearchKind,
    assetSearchPage,
    assetSearchPageLimit,
    assetSearchQuery,
    hasAuthToken,
    isSearchingAssetCandidates,
    setAssetSearchCandidates,
    setAssetSearchErrorMessage,
    setAssetSearchHasMore,
    setAssetSearchPage,
    setIsSearchingAssetCandidates,
  ]);

  const handleAssetCandidateAdoption = useCallback(async () => {
    clearMessages();
    setAssetSearchErrorMessage(null);

    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage("Bitte zuerst einen Asset-Slot wählen.");
      return;
    }
    if (assetSearchSelectedIDs.length === 0) {
      setAssetSearchErrorMessage("Bitte zuerst mindestens einen Treffer auswählen.");
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
            revokeStagedAssetPreview(
              current[activeAssetSearchKind as CreateSingleAssetKind],
            );
            return {
              ...current,
              [activeAssetSearchKind as CreateSingleAssetKind]: nextAsset,
            };
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
          "Das gewählte Asset konnte nicht übernommen werden.",
        ),
      );
    } finally {
      setIsAdoptingAssetCandidates(false);
    }
  }, [
    activeAssetSearchKind,
    assetSearchCandidates,
    assetSearchSelectedIDs,
    clearMessages,
    closeAssetSearch,
    resetStagedCover,
    setAssetSearchErrorMessage,
    setCreateCoverImage,
    setIsAdoptingAssetCandidates,
    setShowValidationSummary,
    setStagedAssets,
    setStagedCover,
    setSuccessMessage,
  ]);

  return {
    handleCoverUpload,
    handleAssetCandidateSearch,
    handleLoadMoreAssets,
    handleAssetCandidateAdoption,
  };
}
