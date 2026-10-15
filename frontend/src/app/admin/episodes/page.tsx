"use client";

import Image from "next/image";
import Link from "next/link";

import { EpisodeStatus } from "@/types/anime";
import { PlatformAdminGate } from "@/components/auth/PlatformAdminGate";
import { getCoverUrl } from "@/lib/utils";

import {
  EPISODE_STATUSES,
  handleCoverImgError,
  parsePositiveInt,
  resolveAnimeStatusClass,
  useAdminEpisodesPage,
} from "./useAdminEpisodesPage";

import sharedStyles from "../admin.module.css";
import browserStyles from "../anime/components/AnimeBrowser/AnimeBrowser.module.css";

const styles = { ...sharedStyles, ...browserStyles };

function AdminEpisodesContent() {
  const {
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
  } = useAdminEpisodesPage();

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/login">Anmeldung</Link>
        <span> | </span>
        <Link href="/admin/anime">Studio</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Episoden</h1>
        <p className={styles.subtitle}>
          Episoden erstellen und bearbeiten (separater Modus).
        </p>
        <p className={styles.hint}>
          Für den verbundenen Workflow mit Anime-Kontext:{" "}
          <Link href="/admin/anime">/admin/anime</Link>
        </p>
        <p className={styles.tokenPreview}>
          Auth:{" "}
          {isClientInitialized
            ? hasAuthToken
              ? "angemeldet"
              : "nicht vorhanden"
            : "wird geprüft"}
        </p>
      </header>

      {!hasAuthToken ? (
        <div className={styles.errorBox}>
          Kein aktiver Login gefunden. Bitte zuerst anmelden.
        </div>
      ) : null}

      <section className={styles.panel}>
        <h2>Episode erstellen</h2>
        <form className={styles.form} onSubmit={handleCreateSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="anime-search">Anime suchen (Server)</label>
              <div className={styles.inputRow}>
                <input
                  id="anime-search"
                  value={animeSearchInput}
                  onChange={(event) => setAnimeSearchInput(event.target.value)}
                  disabled={isSubmittingCreate || isSearchingAnime}
                  placeholder="z. B. attack, komödie, yamato"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runAnimeSearch(animeSearchInput);
                    }
                  }}
                />
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={
                    isSubmittingCreate ||
                    isSearchingAnime ||
                    animeSearchInput.trim().length < 2
                  }
                  onClick={() => runAnimeSearch(animeSearchInput)}
                >
                  Suchen
                </button>
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={
                    isSubmittingCreate ||
                    isSearchingAnime ||
                    animeSearchInput.length === 0
                  }
                  onClick={clearAnimeSearch}
                  aria-label="Suche leeren"
                  title="Suche leeren"
                >
                  X
                </button>
              </div>
              {animeSearchQuery ? (
                <p className={styles.hint}>
                  Suche: {animeSearchQuery} | Treffer:{" "}
                  {animeSearchResults.length} (gesamt: {animeSearchTotal})
                </p>
              ) : (
                <p className={styles.hint}>
                  Tip: Suche reduziert die Notwendigkeit, Anime-IDs manuell zu
                  kennen.
                </p>
              )}
              {isSearchingAnime ? (
                <p className={styles.hint}>Suche läuft...</p>
              ) : null}
              {animeSearchError ? (
                <div className={styles.errorBox}>{animeSearchError}</div>
              ) : null}
              {!isSearchingAnime &&
              animeSearchQuery &&
              animeSearchResults.length === 0 &&
              !animeSearchError ? (
                <p className={styles.hint}>Keine Anime gefunden.</p>
              ) : null}
              {!isSearchingAnime && animeSearchResults.length > 0 ? (
                <div
                  className={styles.episodeList}
                  aria-label="Anime Suchergebnisse"
                >
                  {animeSearchResults.map((anime) => (
                    <div
                      key={anime.id}
                      className={`${styles.animeRow} ${selectedAnime?.id === anime.id ? styles.animeRowActive : ""}`}
                    >
                      <Image
                        className={styles.animeThumb}
                        src={getCoverUrl(anime.cover_image)}
                        alt=""
                        width={44}
                        height={58}
                        unoptimized
                        onError={handleCoverImgError}
                      />
                      <div className={styles.animeMeta}>
                        <div className={styles.animeTitleLine}>
                          <p className={styles.animeTitleText}>
                            #{anime.id} | {anime.title}
                          </p>
                          <span
                            className={`${styles.statusBadge} ${styles[resolveAnimeStatusClass(anime.status)]}`}
                          >
                            {anime.status}
                          </span>
                        </div>
                        <p className={styles.hint}>
                          Typ: {anime.type} | Jahr: {anime.year ?? "-"} | Max
                          Episoden: {anime.max_episodes ?? "-"}
                        </p>
                        <div className={styles.actions}>
                          <button
                            className={styles.button}
                            type="button"
                            onClick={() => handleSelectAnime(anime)}
                            disabled={isSubmittingCreate}
                          >
                            Auswählen
                          </button>
                          <a
                            className={styles.buttonSecondary}
                            href={`/anime/${anime.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Öffnen
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-anime-id">Anime ID *</label>
              <input
                id="create-anime-id"
                value={createAnimeID}
                onChange={(event) => setCreateAnimeID(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 13394"
              />
              {selectedAnime ? (
                <p className={styles.hint}>
                  Ausgewählt: #{selectedAnime.id} | {selectedAnime.title}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="create-episode-number">Episode Number *</label>
              <input
                id="create-episode-number"
                value={createEpisodeNumber}
                onChange={(event) => setCreateEpisodeNumber(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 01"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-status">Status *</label>
              <select
                id="create-status"
                value={createStatus}
                onChange={(event) =>
                  setCreateStatus(event.target.value as EpisodeStatus)
                }
                disabled={isSubmittingCreate}
              >
                {EPISODE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title">Title</label>
              <input
                id="create-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.button}
              type="submit"
              disabled={isSubmittingCreate}
            >
              {isSubmittingCreate ? "Speichern..." : "Episode erstellen"}
            </button>
            {parsePositiveInt(createAnimeID) ? (
              <Link
                href={`/anime/${createAnimeID}`}
                className={styles.buttonSecondary}
              >
                Anime öffnen
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Episode bearbeiten (Patch)</h2>
        <p className={styles.hint}>
          Nur ausgewählte Felder werden gesendet. Für nullable Felder kannst du
          explizit Wert löschen (null) wählen.
        </p>
        <form className={styles.form} onSubmit={handleUpdateSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="update-episode-id">Episode ID *</label>
              <input
                id="update-episode-id"
                value={updateEpisodeID}
                onChange={(event) => setUpdateEpisodeID(event.target.value)}
                disabled={isSubmittingUpdate}
                placeholder="z. B. 33336"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-episode-number">Episode Number</label>
              <input
                id="update-episode-number"
                value={updateEpisodeNumber}
                onChange={(event) => setUpdateEpisodeNumber(event.target.value)}
                disabled={isSubmittingUpdate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-status">Status</label>
              <select
                id="update-status"
                value={updateStatus}
                onChange={(event) => setUpdateStatus(event.target.value)}
                disabled={isSubmittingUpdate}
              >
                <option value="">-- unveraendert --</option>
                {EPISODE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-title">Title</label>
              <input
                id="update-title"
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateTitle}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateTitle}
                  onChange={(event) =>
                    setClearUpdateTitle(event.target.checked)
                  }
                  disabled={isSubmittingUpdate}
                />
                Wert löschen (null)
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              type="submit"
              disabled={isSubmittingUpdate}
            >
              {isSubmittingUpdate ? "Speichern..." : "Episode aktualisieren"}
            </button>
            {parsePositiveInt(updateEpisodeID) ? (
              <Link
                href={`/episodes/${updateEpisodeID}`}
                className={styles.buttonSecondary}
              >
                Episode öffnen
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className={styles.successBox}>{successMessage}</div>
      ) : null}
      {lastRequest ? (
        <pre className={styles.resultBox}>
          {"LAST REQUEST\n"}
          {lastRequest}
        </pre>
      ) : null}
      {lastResponse ? (
        <pre className={styles.resultBox}>
          {"LAST RESPONSE\n"}
          {lastResponse}
        </pre>
      ) : null}
    </main>
  );
}

export default function AdminEpisodesPage() {
  return (
    <PlatformAdminGate>
      <AdminEpisodesContent />
    </PlatformAdminGate>
  );
}
