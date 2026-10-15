"use client";

import { FormEvent, useEffect, useState } from "react";

import { AnimeListItem, AnimeStatus, EpisodeStatus } from "@/types/anime";
import {
  AdminEpisodeCreateRequest,
  AdminEpisodePatchRequest,
} from "@/types/admin";
import { ApiError, createAdminEpisode, getAnimeList, updateAdminEpisode } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";

export const EPISODE_STATUSES: EpisodeStatus[] = ["disabled", "private", "public"];
const ANIME_SEARCH_PER_PAGE = 20;

export function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveAnimeStatusClass(status: AnimeStatus): string {
  switch (status) {
    case "ongoing":
      return "statusOngoing";
    case "done":
      return "statusDone";
    case "aborted":
      return "statusAborted";
    case "licensed":
      return "statusLicensed";
    case "disabled":
    default:
      return "statusDisabled";
  }
}

export function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === "true") return;
  img.dataset.fallbackApplied = "true";
  img.alt = "";
  img.src = "/covers/placeholder.jpg";
}

export function useAdminEpisodesPage() {
  const { hasAccessToken, isClientInitialized } = useAuthSession();
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const [createAnimeID, setCreateAnimeID] = useState("");
  const [createEpisodeNumber, setCreateEpisodeNumber] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createStatus, setCreateStatus] = useState<EpisodeStatus>("private");
  const [selectedAnime, setSelectedAnime] = useState<AnimeListItem | null>(
    null,
  );
  const [animeSearchInput, setAnimeSearchInput] = useState("");
  const [animeSearchQuery, setAnimeSearchQuery] = useState("");
  const [animeSearchResults, setAnimeSearchResults] = useState<AnimeListItem[]>(
    [],
  );
  const [animeSearchTotal, setAnimeSearchTotal] = useState(0);
  const [isSearchingAnime, setIsSearchingAnime] = useState(false);
  const [animeSearchError, setAnimeSearchError] = useState<string | null>(null);

  const [updateEpisodeID, setUpdateEpisodeID] = useState("");
  const [updateEpisodeNumber, setUpdateEpisodeNumber] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [clearUpdateTitle, setClearUpdateTitle] = useState(false);

  const hasAuthToken = isClientInitialized && hasAccessToken;

  useEffect(() => {
    const id = parsePositiveInt(createAnimeID);
    if (!id) {
      if (selectedAnime) setSelectedAnime(null);
      return;
    }
    if (selectedAnime && selectedAnime.id !== id) {
      setSelectedAnime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createAnimeID]);

  function clearMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function formatError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return `(${error.status}) ${error.message}`;
    }
    return fallback;
  }

  async function runAnimeSearch(query: string) {
    clearMessages();
    setAnimeSearchError(null);

    const normalized = query.trim();
    setAnimeSearchQuery(normalized);
    if (normalized.length < 2) {
      setAnimeSearchResults([]);
      setAnimeSearchTotal(0);
      if (normalized.length > 0) {
        setAnimeSearchError(
          "Bitte mindestens 2 Zeichen für die Suche eingeben.",
        );
      }
      return;
    }

    try {
      setIsSearchingAnime(true);
      const response = await getAnimeList({
        page: 1,
        per_page: ANIME_SEARCH_PER_PAGE,
        q: normalized,
        include_disabled: true,
      });
      setAnimeSearchResults(response.data);
      setAnimeSearchTotal(response.meta.total);
    } catch (error) {
      console.error("admin/episodes: anime search failed", error);
      if (error instanceof ApiError)
        setAnimeSearchError(`(${error.status}) ${error.message}`);
      else setAnimeSearchError("Anime-Suche fehlgeschlagen.");
    } finally {
      setIsSearchingAnime(false);
    }
  }

  function handleSelectAnime(anime: AnimeListItem) {
    setSelectedAnime(anime);
    setCreateAnimeID(String(anime.id));
    setSuccessMessage(`Anime #${anime.id} ausgewählt: ${anime.title}`);
  }

  function clearAnimeSearch() {
    setAnimeSearchInput("");
    setAnimeSearchQuery("");
    setAnimeSearchResults([]);
    setAnimeSearchTotal(0);
    setAnimeSearchError(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setLastRequest(null);
    setLastResponse(null);

    if (!hasAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }

    const animeID = parsePositiveInt(createAnimeID);
    if (!animeID) {
      setErrorMessage("anime_id ist ungültig");
      return;
    }

    const episodeNumber = createEpisodeNumber.trim();
    if (!episodeNumber) {
      setErrorMessage("episode_number ist erforderlich");
      return;
    }

    const payload: AdminEpisodeCreateRequest = {
      anime_id: animeID,
      episode_number: episodeNumber,
      status: createStatus,
    };

    const title = normalizeOptionalString(createTitle);
    if (title) {
      payload.title = title;
    }

    try {
      setIsSubmittingCreate(true);
      setLastRequest(JSON.stringify(payload, null, 2));
      const response = await createAdminEpisode(payload);
      setSuccessMessage(`Episode #${response.data.id} wurde erstellt.`);
      setLastResponse(JSON.stringify(response, null, 2));
      setCreateAnimeID("");
      setSelectedAnime(null);
      setCreateEpisodeNumber("");
      setCreateTitle("");
      setCreateStatus("private");
    } catch (error) {
      console.error("admin/episodes: create failed", error);
      setErrorMessage(
        formatError(error, "Episode konnte nicht erstellt werden."),
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setLastRequest(null);
    setLastResponse(null);

    if (!hasAuthToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }

    const episodeID = parsePositiveInt(updateEpisodeID);
    if (!episodeID) {
      setErrorMessage("Episode-ID ist ungültig.");
      return;
    }

    const payload: AdminEpisodePatchRequest = {};
    const episodeNumber = normalizeOptionalString(updateEpisodeNumber);
    const title = normalizeOptionalString(updateTitle);

    if (episodeNumber) {
      payload.episode_number = episodeNumber;
    }
    if (clearUpdateTitle) payload.title = null;
    else if (title) payload.title = title;
    if (updateStatus) {
      payload.status = updateStatus as EpisodeStatus;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage("Mindestens ein Feld für das Update ausfuellen.");
      return;
    }

    try {
      setIsSubmittingUpdate(true);
      setLastRequest(JSON.stringify(payload, null, 2));
      const response = await updateAdminEpisode(episodeID, payload);
      setSuccessMessage(`Episode #${response.data.id} wurde aktualisiert.`);
      setLastResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("admin/episodes: update failed", error);
      setErrorMessage(
        formatError(error, "Episode konnte nicht aktualisiert werden."),
      );
    } finally {
      setIsSubmittingUpdate(false);
    }
  }

  return {
    isClientInitialized,
    hasAuthToken,
    isSubmittingCreate,
    isSubmittingUpdate,
    errorMessage,
    successMessage,
    lastRequest,
    lastResponse,

    createAnimeID,
    setCreateAnimeID,
    createEpisodeNumber,
    setCreateEpisodeNumber,
    createTitle,
    setCreateTitle,
    createStatus,
    setCreateStatus,
    selectedAnime,

    animeSearchInput,
    setAnimeSearchInput,
    animeSearchQuery,
    animeSearchResults,
    animeSearchTotal,
    isSearchingAnime,
    animeSearchError,
    runAnimeSearch,
    handleSelectAnime,
    clearAnimeSearch,

    updateEpisodeID,
    setUpdateEpisodeID,
    updateEpisodeNumber,
    setUpdateEpisodeNumber,
    updateTitle,
    setUpdateTitle,
    updateStatus,
    setUpdateStatus,
    clearUpdateTitle,
    setClearUpdateTitle,

    handleCreateSubmit,
    handleUpdateSubmit,
  };
}
