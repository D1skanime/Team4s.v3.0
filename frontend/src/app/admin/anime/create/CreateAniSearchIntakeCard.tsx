"use client";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import { AniSearchDuplicateDecision } from "./AniSearchDuplicateDecision";
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
  /** D-08: Jellyfin-Serien-ID des aktuell im Draft aktiven Kandidaten, falls vorhanden. */
  activeJellyfinSeriesID?: string | null;
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
  activeJellyfinSeriesID = null,
  onAniSearchIDChange,
  onSearchQueryChange,
  onSearchSubmit,
  onCandidateDismiss,
  onCandidateSelect,
  onSubmit,
}: CreateAniSearchIntakeCardProps) {
  const statusID = "create-anisearch-status";

  return (
    <section className={createStyles.resultsPanel}>
      <div className={createStyles.resultsHeader}>
        <div className={createStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>AniSearch</p>
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
            aria-describedby={statusID}
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
                  {candidate.existing_anime_id ? (
                    <span className={styles.hint}>
                      {`Existiert schon als „${candidate.existing_title}“ (#${candidate.existing_anime_id})`}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={createStyles.secondaryAction}
                  onClick={() => onCandidateSelect(candidate)}
                >
                  Auswählen
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

      <div
        id={statusID}
        aria-live="polite"
        data-loaded={result ? "true" : undefined}
      >
        {conflict ? (
          <AniSearchDuplicateDecision
            conflict={conflict}
            activeJellyfinSeriesID={activeJellyfinSeriesID}
          />
        ) : errorMessage ? (
          <div className={styles.errorBox}>
            <p>{errorMessage}</p>
            <p className={styles.hint}>
              Keine Änderungen am Anime. Der Anime wurde noch nicht erstellt.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
