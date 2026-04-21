import { Dispatch, SetStateAction, useCallback } from "react";

import { deleteAdminEpisode, updateAdminEpisode } from "@/lib/api";
import { EpisodeListItem, EpisodeStatus } from "@/types/anime";

import { EpisodeManagerState } from "../../../types/admin-anime";
import { parsePositiveInt } from "../../../utils/anime-helpers";
import { UseEpisodeManagerOptions } from "./shared";

interface UseEpisodeManagerBulkMutationsParams {
  authToken: string;
  hasAuthToken: boolean;
  selectedID: number | null;
  selectedIDs: Record<number, true>;
  editFormValues: EpisodeManagerState["editFormValues"];
  isApplyingBulk: boolean;
  isUpdating: boolean;
  onRefresh: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  options: UseEpisodeManagerOptions;
  setIsApplyingBulk: Dispatch<SetStateAction<boolean>>;
  setBulkProgress: Dispatch<
    SetStateAction<{ done: number; total: number } | null>
  >;
  setRemovingIDs: Dispatch<SetStateAction<Record<number, true>>>;
  setSelectedIDs: Dispatch<SetStateAction<Record<number, true>>>;
  setSelectedID: Dispatch<SetStateAction<number | null>>;
  setEditFormValues: Dispatch<
    SetStateAction<EpisodeManagerState["editFormValues"]>
  >;
  setEditFormClearFlags: Dispatch<
    SetStateAction<EpisodeManagerState["editFormClearFlags"]>
  >;
}

export function useEpisodeManagerBulkMutations({
  authToken,
  hasAuthToken,
  selectedID,
  selectedIDs,
  editFormValues,
  isApplyingBulk,
  isUpdating,
  onRefresh,
  onSuccess,
  onError,
  options,
  setIsApplyingBulk,
  setBulkProgress,
  setRemovingIDs,
  setSelectedIDs,
  setSelectedID,
  setEditFormValues,
  setEditFormClearFlags,
}: UseEpisodeManagerBulkMutationsParams) {
  const applyBulkStatus = useCallback(
    async (status: EpisodeStatus) => {
      if (!hasAuthToken) {
        onError(
          "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
        );
        return;
      }
      const ids = Object.keys(selectedIDs)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (ids.length === 0) {
        onError("Bitte mindestens eine Episode markieren.");
        return;
      }

      try {
        setIsApplyingBulk(true);
        setBulkProgress({ done: 0, total: ids.length });
        options.onRequest?.(
          JSON.stringify({ ids, patch: { status } }, null, 2),
        );
        const failed: number[] = [];
        for (let i = 0; i < ids.length; i += 1) {
          const id = ids[i];
          try {
            await updateAdminEpisode(id, { status }, authToken);
          } catch {
            failed.push(id);
          } finally {
            setBulkProgress({ done: i + 1, total: ids.length });
          }
        }
        await onRefresh();
        if (failed.length > 0) {
          options.onResponse?.(
            JSON.stringify({ failed_episode_ids: failed }, null, 2),
          );
          onError(
            `Bulk-Update teilweise fehlgeschlagen (${failed.length}/${ids.length}).`,
          );
        } else {
          options.onResponse?.(
            JSON.stringify({ updated: ids.length, status }, null, 2),
          );
          onSuccess(
            `Bulk-Update OK: ${ids.length} Episoden -> Status ${status}.`,
          );
        }
      } finally {
        setIsApplyingBulk(false);
        setBulkProgress(null);
      }
    },
    [
      authToken,
      hasAuthToken,
      onError,
      onRefresh,
      onSuccess,
      options,
      selectedIDs,
      setBulkProgress,
      setIsApplyingBulk,
    ],
  );

  const removeEpisode = useCallback(
    async (episode: EpisodeListItem, animeID: number) => {
      void animeID;
      if (!hasAuthToken) {
        onError(
          "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
        );
        return;
      }
      if (isApplyingBulk || isUpdating) return;

      try {
        setRemovingIDs((current) => ({ ...current, [episode.id]: true }));
        options.onRequest?.(
          JSON.stringify(
            { episode_id: episode.id, action: "remove_from_anime" },
            null,
            2,
          ),
        );
        const response = await deleteAdminEpisode(episode.id, authToken);
        options.onResponse?.(JSON.stringify(response, null, 2));
        await onRefresh();
        setSelectedIDs((current) => {
          if (!current[episode.id]) return current;
          const next = { ...current };
          delete next[episode.id];
          return next;
        });
        if (
          selectedID === episode.id ||
          parsePositiveInt(editFormValues.id) === episode.id
        ) {
          setSelectedID(null);
          setEditFormValues({
            id: "",
            number: "",
            title: "",
            status: "",
            streamLink: "",
          });
          setEditFormClearFlags({ title: false, streamLink: false });
        }
        onSuccess(
          `Episode ${episode.episode_number} wurde entfernt. Geloeschte Release-Zuordnungen: ${response.data.deleted_release_variants}.`,
        );
      } catch (error) {
        if (error instanceof Error) onError(error.message);
        else onError("Episode konnte nicht aus dem Anime entfernt werden.");
      } finally {
        setRemovingIDs((current) => {
          if (!current[episode.id]) return current;
          const next = { ...current };
          delete next[episode.id];
          return next;
        });
      }
    },
    [
      authToken,
      editFormValues.id,
      hasAuthToken,
      isApplyingBulk,
      isUpdating,
      onError,
      onRefresh,
      onSuccess,
      options,
      selectedID,
      setEditFormClearFlags,
      setEditFormValues,
      setRemovingIDs,
      setSelectedID,
      setSelectedIDs,
    ],
  );

  const removeSelected = useCallback(
    async (animeID: number) => {
      void animeID;
      if (!hasAuthToken) {
        onError(
          "Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.",
        );
        return;
      }
      const ids = Object.keys(selectedIDs)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (ids.length === 0) {
        onError("Bitte mindestens eine Episode markieren.");
        return;
      }

      let removed = 0;
      let removedVersionLinks = 0;
      const failed: number[] = [];
      try {
        setIsApplyingBulk(true);
        setBulkProgress({ done: 0, total: ids.length });
        options.onRequest?.(
          JSON.stringify({ ids, action: "remove_from_anime" }, null, 2),
        );
        for (let i = 0; i < ids.length; i += 1) {
          const id = ids[i];
          try {
            const response = await deleteAdminEpisode(id, authToken);
            removed += 1;
            removedVersionLinks += response.data.deleted_release_variants;
          } catch {
            failed.push(id);
          } finally {
            setBulkProgress({ done: i + 1, total: ids.length });
          }
        }
        await onRefresh();

        setSelectedIDs(() => {
          const next: Record<number, true> = {};
          for (const failedID of failed) next[failedID] = true;
          return next;
        });

        if (
          selectedID &&
          ids.includes(selectedID) &&
          !failed.includes(selectedID)
        ) {
          setSelectedID(null);
          setEditFormValues({
            id: "",
            number: "",
            title: "",
            status: "",
            streamLink: "",
          });
          setEditFormClearFlags({ title: false, streamLink: false });
        }

        if (failed.length > 0) {
          options.onResponse?.(
            JSON.stringify(
              {
                failed_episode_ids: failed,
                removed,
                removed_version_links: removedVersionLinks,
              },
              null,
              2,
            ),
          );
          onError(
            `Bulk-Entfernen teilweise fehlgeschlagen (${failed.length}/${ids.length}). Erfolgreich entfernt: ${removed}, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
          );
        } else {
          options.onResponse?.(
            JSON.stringify(
              { removed, removed_version_links: removedVersionLinks },
              null,
              2,
            ),
          );
          onSuccess(
            `Bulk-Entfernen OK: ${removed} Episoden entfernt, geloeschte Versions-Zuordnungen: ${removedVersionLinks}.`,
          );
        }
      } finally {
        setIsApplyingBulk(false);
        setBulkProgress(null);
      }
    },
    [
      authToken,
      hasAuthToken,
      onError,
      onRefresh,
      onSuccess,
      options,
      selectedID,
      selectedIDs,
      setBulkProgress,
      setEditFormClearFlags,
      setEditFormValues,
      setIsApplyingBulk,
      setSelectedID,
      setSelectedIDs,
    ],
  );

  return {
    applyBulkStatus,
    removeEpisode,
    removeSelected,
  };
}
