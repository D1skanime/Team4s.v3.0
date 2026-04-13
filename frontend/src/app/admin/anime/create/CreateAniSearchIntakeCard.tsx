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
          <h2 className={createStyles.resultsTitle}>AniSearch Daten laden</h2>
          <p className={createStyles.resultsText}>
            Nutze AniSearch entweder direkt per ID oder suche zuerst nach einem Titel
            und waehle dann den passenden Eintrag aus.
          </p>
        </div>
      </div>

      <div className={styles.inputRow}>
        <label className={styles.field}>
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
          {isSearchingCandidates ? "AniSearch sucht..." : "Titel suchen"}
        </button>
      </div>

      <div className={styles.inputRow}>
        <label className={styles.field}>
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
          {isLoading ? "AniSearch laedt..." : "AniSearch laden"}
        </button>
      </div>

      <p id={helperID} className={styles.hint}>
        Manuell &gt; AniSearch &gt; Jellyfin
      </p>

      {candidates.length > 0 ? (
        <div
          className={createStyles.candidateModalBackdrop}
          role="presentation"
          onClick={onCandidateDismiss}
        >
          <div
            className={createStyles.candidateModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-anisearch-candidate-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={createStyles.candidateModalHeader}>
              <div>
                <h3
                  id="create-anisearch-candidate-title"
                  className={createStyles.candidateModalTitle}
                >
                  AniSearch Treffer waehlen
                </h3>
                <p className={createStyles.candidateModalText}>
                  Der Detailabruf startet erst nach deiner Auswahl.
                </p>
              </div>
              <button
                type="button"
                className={createStyles.secondaryAction}
                onClick={onCandidateDismiss}
              >
                Schliessen
              </button>
            </div>
            <div className={createStyles.candidateList}>
              {candidates.map((candidate) => (
                <button
                  key={candidate.anisearch_id}
                  type="button"
                  className={createStyles.candidateItem}
                  onClick={() => onCandidateSelect(candidate)}
                >
                  <strong>{candidate.title}</strong>
                  <span>
                    {candidate.type}
                    {candidate.year ? ` | ${candidate.year}` : ""}
                    {` | ID ${candidate.anisearch_id}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div id={statusID} aria-live="polite">
        {conflict ? (
          <div className={styles.details}>
            <p className={styles.hint}>
              AniSearch ID {conflict.anisearchID} ist bereits mit{" "}
              <strong>{conflict.existingTitle}</strong> verknuepft.
            </p>
            <Link
              href={conflict.redirectPath}
              className={createStyles.secondaryAction}
            >
              Zum vorhandenen Anime wechseln
            </Link>
          </div>
        ) : errorMessage ? (
          <div className={styles.errorBox}>
            <p>{errorMessage}</p>
            <p className={styles.hint}>
              Der aktuelle Entwurf bleibt unveraendert und noch nicht gespeichert.
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
                <strong>Entwurfsstatus</strong>
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
