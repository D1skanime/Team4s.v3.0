"use client";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import { AniSearchDuplicateDecision } from "./AniSearchDuplicateDecision";
import { AniSearchSearchCard } from "../components/shared/AniSearchSearchCard";
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

      <AniSearchSearchCard
        searchLabel="AniSearch Titel"
        searchPlaceholder="z. B. Bleach"
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchSubmit={onSearchSubmit}
        isSearchingCandidates={isSearchingCandidates}
        searchButtonLabel="Titel suchen"
        searchingLabel="Sucht..."
        idLabel="AniSearch ID"
        idPlaceholder="z. B. 5170"
        idValue={anisearchID}
        onIDChange={onAniSearchIDChange}
        onSubmit={onSubmit}
        isSubmitting={isLoading}
        submitButtonLabel="AniSearch laden"
        submittingLabel="Lädt..."
        idAriaDescribedBy={statusID}
        candidates={candidates}
        onCandidateSelect={onCandidateSelect}
        candidateActionLabel="Auswählen"
        onCandidateDismiss={onCandidateDismiss}
      />

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
