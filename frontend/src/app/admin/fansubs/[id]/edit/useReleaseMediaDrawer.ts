"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  deleteAdminReleaseThemeAsset,
  getAdminRelease,
  uploadAdminReleaseThemeAssetForRelease,
} from "@/lib/api";
import type { AdminFansubRelease } from "@/types/fansub";
import { errMessage } from "./fansubEditFormatters";
import {
  mergeReleaseThemeAssetCard,
  releaseThemeSelectionKey,
} from "./fansubEditReleaseHelpers";
import type {
  ReleaseDrawerContext,
  ReleaseDrawerTab,
  ReleaseSegmentCard,
  SelectedReleaseSegment,
} from "./fansubEditTypes";

type UseReleaseMediaDrawerArgs = {
  hasAuthSession: boolean;
  canOpenReleaseDrawer: boolean;
  canUseAdminReleaseDetails: boolean;
  canManageReleaseThemeAssets: boolean;
  // Geteilter Cockpit-State (bleibt im Parent, Wave 3): selectedReleaseSegment + Segment-Karten/Setter.
  selectedReleaseSegment: SelectedReleaseSegment | null;
  setSelectedReleaseSegment: Dispatch<
    SetStateAction<SelectedReleaseSegment | null>
  >;
  releaseSegmentCards: Record<number, ReleaseSegmentCard[]>;
  setReleaseSegmentCards: Dispatch<
    SetStateAction<Record<number, ReleaseSegmentCard[]>>
  >;
  setReleaseSegmentErrors: Dispatch<
    SetStateAction<Record<number, string | null>>
  >;
  setExpandedReleaseIds: Dispatch<SetStateAction<Set<number>>>;
  loadReleaseSegmentCards: (
    release: AdminFansubRelease,
    force?: boolean,
  ) => Promise<ReleaseSegmentCard[] | null>;
  onToast: (message: string) => void;
};

export type ReleaseMediaDrawer = ReturnType<typeof useReleaseMediaDrawer>;

export function useReleaseMediaDrawer({
  hasAuthSession,
  canOpenReleaseDrawer,
  canUseAdminReleaseDetails,
  canManageReleaseThemeAssets,
  selectedReleaseSegment,
  setSelectedReleaseSegment,
  releaseSegmentCards,
  setReleaseSegmentCards,
  setReleaseSegmentErrors,
  setExpandedReleaseIds,
  loadReleaseSegmentCards,
  onToast,
}: UseReleaseMediaDrawerArgs) {
  const [releaseDrawerOpen, setReleaseDrawerOpen] = useState(false);
  const [drawerRelease, setDrawerRelease] = useState<AdminFansubRelease | null>(
    null,
  );
  const [drawerTab, setDrawerTab] = useState<ReleaseDrawerTab>("details");
  const [drawerReleaseLoading, setDrawerReleaseLoading] = useState(false);
  const [drawerReleaseError, setDrawerReleaseError] = useState<string | null>(
    null,
  );
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [drawerUploadProgress, setDrawerUploadProgress] = useState<
    number | null
  >(null);
  const [themePreviewOpen, setThemePreviewOpen] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [themeUploadName, setThemeUploadName] = useState("");
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(
    null,
  );
  const [selectedAnimeFansubContextKey, setSelectedAnimeFansubContextKey] =
    useState<string | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [selectedFansubGroupId, setSelectedFansubGroupId] = useState<
    number | null
  >(null);

  const themeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const releaseDrawerRequestSeqRef = useRef(0);
  const themeDrawerMutationSeqRef = useRef(0);
  const themeDrawerOpenRef = useRef(false);
  const themeDrawerSelectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    themeDrawerOpenRef.current = themeDrawerOpen;
  }, [themeDrawerOpen]);

  useEffect(() => {
    themeDrawerSelectionKeyRef.current =
      themeDrawerOpen && selectedReleaseSegment
        ? releaseThemeSelectionKey(
            selectedReleaseSegment.release.release_id,
            selectedReleaseSegment.card.theme_id,
          )
        : null;
  }, [themeDrawerOpen, selectedReleaseSegment]);

  const clearThemeUploadInput = useCallback(() => {
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = "";
    }
    setThemeUploadName("");
  }, []);

  const resetThemeDrawerTransientState = useCallback(() => {
    themeDrawerMutationSeqRef.current += 1;
    setDrawerError(null);
    setDrawerBusy(false);
    setDrawerUploadProgress(null);
    setThemePreviewOpen(false);
    clearThemeUploadInput();
  }, [clearThemeUploadInput]);

  const closeThemeDrawer = useCallback(() => {
    setThemeDrawerOpen(false);
    resetThemeDrawerTransientState();
  }, [resetThemeDrawerTransientState]);

  const openThemeDrawer = useCallback(
    (release: AdminFansubRelease, card: ReleaseSegmentCard) => {
      setSelectedReleaseSegment({ release, card });
      setThemeDrawerOpen(true);
      resetThemeDrawerTransientState();
    },
    [resetThemeDrawerTransientState, setSelectedReleaseSegment],
  );

  const closeReleaseDrawer = useCallback(() => {
    releaseDrawerRequestSeqRef.current += 1;
    setReleaseDrawerOpen(false);
    setThemeDrawerOpen(false);
    setSelectedReleaseSegment(null);
    setSelectedReleaseId(null);
    setSelectedAnimeFansubContextKey(null);
    setSelectedAnimeId(null);
    setSelectedFansubGroupId(null);
    setDrawerRelease(null);
    setDrawerTab("details");
    setDrawerBusy(false);
    resetThemeDrawerTransientState();
    setDrawerReleaseLoading(false);
    setDrawerReleaseError(null);
  }, [resetThemeDrawerTransientState, setSelectedReleaseSegment]);

  const openReleaseDrawer = useCallback(
    (context: ReleaseDrawerContext) => {
      if (!canOpenReleaseDrawer) return;

      const { release, animeID, fansubGroupID, contextKey } = context;
      const requestID = releaseDrawerRequestSeqRef.current + 1;
      releaseDrawerRequestSeqRef.current = requestID;
      const initialDrawerTab: ReleaseDrawerTab = canUseAdminReleaseDetails
        ? "details"
        : "media";

      setSelectedReleaseId(release.release_id);
      setSelectedAnimeFansubContextKey(contextKey);
      setSelectedAnimeId(animeID);
      setSelectedFansubGroupId(fansubGroupID);
      setReleaseDrawerOpen(true);
      setThemeDrawerOpen(false);
      setSelectedReleaseSegment(null);
      setDrawerRelease(release);
      setDrawerTab(initialDrawerTab);
      setDrawerBusy(false);
      resetThemeDrawerTransientState();
      setDrawerReleaseError(null);
      setDrawerReleaseLoading(hasAuthSession && canUseAdminReleaseDetails);
      setExpandedReleaseIds((current) =>
        new Set(current).add(release.release_id),
      );
      void loadReleaseSegmentCards(release);

      if (!hasAuthSession || !canUseAdminReleaseDetails) {
        setDrawerReleaseLoading(false);
        return;
      }

      getAdminRelease(release.release_id)
        .then((response) => {
          if (releaseDrawerRequestSeqRef.current !== requestID) return;
          setDrawerRelease(response.data);
        })
        .catch((nextError) => {
          if (releaseDrawerRequestSeqRef.current !== requestID) return;
          setDrawerReleaseError(errMessage(nextError));
        })
        .finally(() => {
          if (releaseDrawerRequestSeqRef.current !== requestID) return;
          setDrawerReleaseLoading(false);
        });
    },
    [
      canOpenReleaseDrawer,
      canUseAdminReleaseDetails,
      hasAuthSession,
      loadReleaseSegmentCards,
      resetThemeDrawerTransientState,
      setExpandedReleaseIds,
      setSelectedReleaseSegment,
    ],
  );

  useEffect(() => {
    if (!drawerRelease) return;
    const cards = releaseSegmentCards[drawerRelease.release_id] ?? [];
    if (cards.length === 0) return;
    if (selectedReleaseSegment?.release.release_id === drawerRelease.release_id)
      return;
    setSelectedReleaseSegment({ release: drawerRelease, card: cards[0] });
  }, [
    drawerRelease,
    releaseSegmentCards,
    selectedReleaseSegment?.release.release_id,
    setSelectedReleaseSegment,
  ]);

  useEffect(() => {
    if (!selectedReleaseSegment) return;
    const latestCards =
      releaseSegmentCards[selectedReleaseSegment.release.release_id] ?? [];
    const latestCard = latestCards.find(
      (card) => card.theme_id === selectedReleaseSegment.card.theme_id,
    );
    if (!latestCard) {
      setSelectedReleaseSegment(null);
      setThemeDrawerOpen(false);
      setDrawerError(null);
      setDrawerUploadProgress(null);
      if (themeUploadInputRef.current) {
        themeUploadInputRef.current.value = "";
      }
      return;
    }
    if (latestCard === selectedReleaseSegment.card) return;
    setSelectedReleaseSegment({
      release: selectedReleaseSegment.release,
      card: latestCard,
    });
  }, [releaseSegmentCards, selectedReleaseSegment, setSelectedReleaseSegment]);

  const handleDrawerUpload = useCallback(
    async (file: File | null) => {
      if (
        !file ||
        !selectedReleaseSegment ||
        !hasAuthSession ||
        !canManageReleaseThemeAssets
      )
        return;
      const release = selectedReleaseSegment.release;
      const themeID = selectedReleaseSegment.card.theme_id;
      const selectionKey = releaseThemeSelectionKey(release.release_id, themeID);
      const isCurrentSelection = () =>
        themeDrawerOpenRef.current &&
        themeDrawerSelectionKeyRef.current === selectionKey;
      const mutationID = themeDrawerMutationSeqRef.current + 1;
      themeDrawerMutationSeqRef.current = mutationID;
      const isCurrentMutation = () =>
        isCurrentSelection() && themeDrawerMutationSeqRef.current === mutationID;
      if (!isCurrentSelection()) return;
      setDrawerBusy(true);
      setDrawerError(null);
      setDrawerUploadProgress(0);
      try {
        const uploadResponse = await uploadAdminReleaseThemeAssetForRelease({
          releaseID: release.release_id,
          themeID,
          file,
          onProgress: (progress) => {
            if (isCurrentSelection()) setDrawerUploadProgress(progress);
          },
        });
        if (!isCurrentMutation()) return;
        setReleaseSegmentErrors((current) => ({
          ...current,
          [release.release_id]: null,
        }));
        setReleaseSegmentCards((current) => {
          const existingCards = current[release.release_id];
          if (!existingCards) return current;
          return {
            ...current,
            [release.release_id]: mergeReleaseThemeAssetCard(
              existingCards,
              uploadResponse.data,
            ),
          };
        });
        const refreshedCards = await loadReleaseSegmentCards(release, true);
        if (!isCurrentMutation()) return;
        if (!refreshedCards) {
          setReleaseSegmentErrors((current) => ({
            ...current,
            [release.release_id]: null,
          }));
        }
        onToast("Theme-Asset gespeichert.");
        setDrawerUploadProgress(null);
        clearThemeUploadInput();
      } catch (nextError) {
        if (isCurrentMutation()) setDrawerError(errMessage(nextError));
      } finally {
        if (isCurrentMutation()) setDrawerBusy(false);
      }
    },
    [
      canManageReleaseThemeAssets,
      clearThemeUploadInput,
      hasAuthSession,
      loadReleaseSegmentCards,
      onToast,
      selectedReleaseSegment,
      setReleaseSegmentCards,
      setReleaseSegmentErrors,
    ],
  );

  const handleDrawerUploadClick = useCallback(async () => {
    const file = themeUploadInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setDrawerError("Bitte zuerst eine Videodatei auswählen.");
      return;
    }
    await handleDrawerUpload(file);
  }, [handleDrawerUpload]);

  const handleThemeUploadInputChange = useCallback(() => {
    const file = themeUploadInputRef.current?.files?.[0] ?? null;
    setThemeUploadName(file?.name || "");
    if (file) {
      setDrawerError(null);
    }
  }, []);

  const handleDrawerDelete = useCallback(async () => {
    if (
      !selectedReleaseSegment ||
      !hasAuthSession ||
      !selectedReleaseSegment.card.media_id
    )
      return;
    const release = selectedReleaseSegment.release;
    const themeID = selectedReleaseSegment.card.theme_id;
    const mediaID = selectedReleaseSegment.card.media_id;
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID);
    const isCurrentSelection = () =>
      themeDrawerOpenRef.current &&
      themeDrawerSelectionKeyRef.current === selectionKey;
    const mutationID = themeDrawerMutationSeqRef.current + 1;
    themeDrawerMutationSeqRef.current = mutationID;
    const isCurrentMutation = () =>
      isCurrentSelection() && themeDrawerMutationSeqRef.current === mutationID;
    if (!isCurrentSelection()) return;
    setDrawerBusy(true);
    setDrawerError(null);
    try {
      await deleteAdminReleaseThemeAsset(release.release_id, themeID, mediaID);
      if (!isCurrentMutation()) return;
      await loadReleaseSegmentCards(release, true);
      if (!isCurrentMutation()) return;
      setSelectedReleaseSegment(null);
      closeThemeDrawer();
      onToast("Theme-Asset entfernt.");
    } catch (nextError) {
      if (isCurrentMutation()) setDrawerError(errMessage(nextError));
    } finally {
      if (isCurrentMutation()) setDrawerBusy(false);
    }
  }, [
    closeThemeDrawer,
    hasAuthSession,
    loadReleaseSegmentCards,
    onToast,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
  ]);

  // Vom Parent beim Gruppenwechsel-Reset aufgerufen: Drawer-State zurücksetzen.
  const resetDrawerState = useCallback(() => {
    releaseDrawerRequestSeqRef.current += 1;
    setReleaseDrawerOpen(false);
    setThemeDrawerOpen(false);
    setSelectedReleaseId(null);
    setSelectedAnimeFansubContextKey(null);
    setSelectedAnimeId(null);
    setSelectedFansubGroupId(null);
    setDrawerRelease(null);
    setDrawerReleaseLoading(false);
    setDrawerReleaseError(null);
    setDrawerError(null);
    setDrawerUploadProgress(null);
    setThemePreviewOpen(false);
    setDrawerBusy(false);
    themeDrawerMutationSeqRef.current += 1;
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = "";
    }
  }, []);

  const invalidateDrawerRequests = useCallback(() => {
    releaseDrawerRequestSeqRef.current += 1;
  }, []);

  return {
    releaseDrawerOpen, drawerRelease, drawerTab, setDrawerTab,
    drawerReleaseLoading, drawerReleaseError, themeDrawerOpen, drawerBusy,
    drawerUploadProgress, themePreviewOpen, setThemePreviewOpen, drawerError,
    themeUploadName, selectedReleaseId, selectedAnimeFansubContextKey,
    selectedAnimeId, selectedFansubGroupId, themeUploadInputRef,
    openReleaseDrawer, closeReleaseDrawer, openThemeDrawer, closeThemeDrawer,
    handleDrawerUploadClick, handleThemeUploadInputChange, handleDrawerDelete,
    resetDrawerState, invalidateDrawerRequests,
  };
}
