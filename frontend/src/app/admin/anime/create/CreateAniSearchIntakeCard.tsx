"use client";

import Link from "next/link";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import type {
  CreateAniSearchConflictState,
  CreateAniSearchDraftState,
} from "./createAniSearchControllerHelpers";
import type { AdminAnimeAniSearchSearchCandidate } from "@/types/admin";

interface CreateAniSearchIntakeCardProps {
  anisearchID: string;
  searchQuery: string;
  isLoading: boolean;
  isSearchingCandidates: boolean;
  filteredExistingCount?: number;
  candidates: AdminAnimeAniSearchSearchCandidate[];
  result: CreateAniSearchDraftState | null;
  conflict: CreateAniSearchConflictState | null;
  errorMessage: string | null;
  onAniSearchIDChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onCandidateDismiss: () => void;
  onCandidateSelect: (candidate: AdminAnimeAniSearchSearchCandidate) => void;
  onSubmit: () => void;
}

export function CreateAniSearchIntakeCard({
  anisearchID,
  searchQuery,
  isLoading,
  isSearchingCandidates,
  filteredExistingCount = 0,
  candidates,
  result,
  conflict,
  errorMessage,
  onAniSearchIDChange,
  onSearchQueryChange,
  onSearchSubmit,
  onCandidateDismiss,
  onCandidateSelect,
  onSubmit,
}: CreateAniSearchIntakeCardProps) {
  const helperID = "create-anisearch-helper";
  const statusID = "create-anisearch-status";

  return (
    <section className={createStyles.resultsPanel}>
      <div className={createStyles.resultsHeader}>
        <div className={createStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>AniSearch</p>
          <h2 className={createStyles.resultsTitle}>AniSearch</h2>
          <p className={createStyles.resultsSubtitle}>Basisdaten und eindeutige ID</p>
          <p className={createStyles.resultsText}>
            AniSearch liefert Titel, Beschreibung, Typ, Jahr, Episodenzahl, Genres
            und Tags.
          </p>
        </div>
      </div>

      <div className={createStyles.providerInputRow}>
        <label className={[styles.field, createStyles.providerFieldGrow].join(" ")}>
          <span>AniSearch Titel</span>
          <input
            value={searchQuery}
            placeholder="z. B. Bleach"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={createStyles.secondaryAction}
          aria-busy={isSearchingCandidates}
          disabled={isSearchingCandidates || !searchQuery.trim()}
          onClick={onSearchSubmit}
        >
          {isSearchingCandidates ? "Sucht..." : "Titel suchen"}
        </button>
      </div>

      <div className={createStyles.providerInputRow}>
        <label className={[styles.field, createStyles.providerFieldGrow].join(" ")}>
          <span>AniSearch ID</span>
          <input
            value={anisearchID}
            placeholder="z. B. 5170"
            aria-describedby={`${helperID} ${statusID}`}
            onChange={(event) => onAniSearchIDChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={createStyles.primaryAction}
          aria-busy={isLoading}
          disabled={isLoading || !anisearchID.trim()}
          onClick={onSubmit}
        >
          {isLoading ? "Laedt..." : "AniSearch laden"}
        </button>
      </div>

      <p id={helperID} className={styles.hint}>
        Manuell &gt; AniSearch &gt; Jellyfin
      </p>

      {candidates.length > 0 ? (
        <div className={createStyles.providerResultsBlock}>
          <div className={createStyles.providerResultsHeader}>
            <p className={createStyles.resultsEyebrow}>Suchergebnisse</p>
            <strong className={createStyles.providerResultsCount}>
              {candidates.length} Treffer
            </strong>
          </div>
          <div className={createStyles.providerList}>
            {candidates.map((candidate) => (
              <div key={candidate.anisearch_id} className={createStyles.providerRowCard}>
                <div className={createStyles.providerRowIcon}>A</div>
                <div className={createStyles.providerRowContent}>
                  <strong className={createStyles.providerRowTitle}>{candidate.title}</strong>
                  <span className={createStyles.providerRowMeta}>
                    {candidate.year ? `${candidate.year} | ` : ""}
                    {candidate.type}
                    {` | AniSearch-ID ${candidate.anisearch_id}`}
                  </span>
                </div>
                <button
                  type="button"
                  className={createStyles.secondaryAction}
                  onClick={() => onCandidateSelect(candidate)}
                >
                  Auswaehlen
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={createStyles.providerLinkButton}
            onClick={onCandidateDismiss}
          >
            Suche verfeinern
          </button>
        </div>
      ) : null}

      <div id={statusID} aria-live="polite">
        {conflict ? (
          <div className={styles.details}>
            <p className={styles.hint}>
              AniSearch ID {conflict.anisearchID} ist bereits mit{" "}
              <strong>{conflict.existingTitle}</strong> verknuepft.
            </p>
            <Link href={conflict.redirectPath} className={createStyles.secondaryAction}>
              Zum vorhandenen Anime wechseln
            </Link>
          </div>
        ) : errorMessage ? (
          <div className={styles.errorBox}>
            <p>{errorMessage}</p>
            {filteredExistingCount > 0 ? (
              <p className={styles.hint}>
                AniSearch hat Titel gefunden, aber bereits vorhandene Anime werden in
                der Create-Auswahl ausgeblendet.
              </p>
            ) : null}
            <p className={styles.hint}>
              Keine Aenderungen am Anime. Der Anime wurde noch nicht erstellt.
            </p>
          </div>
        ) : result ? (
          <div className={styles.details}>
            <p className={styles.hint}>{result.summary}</p>
            <div className={styles.detailsInner}>
              <div>
                <strong>Aktualisierte Felder</strong>
                <p className={styles.hint}>
                  {result.updatedFields.length > 0
                    ? result.updatedFields.join(", ")
                    : "Keine Felder wurden aktualisiert."}
                </p>
              </div>
              <div>
                <strong>Relationen</strong>
                {result.relationNotes.map((note) => (
                  <p key={note} className={styles.hint}>
                    {note}
                  </p>
                ))}
              </div>
              <div>
                <strong>AniSearch-Status</strong>
                {result.draftStatusNotes.map((note) => (
                  <p key={note} className={styles.hint}>
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.details}>
            <p className={styles.hint}>Noch keine AniSearch-Daten geladen.</p>
            <p className={styles.hint}>
              Nichts wird gespeichert, bis du den Anime danach normal erstellst.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
