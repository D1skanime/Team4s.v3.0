"use client";

import createStyles from "./page.module.css";
import styles from "../../admin.module.css";
import { JellyfinCandidateReview } from "../components/JellyfinIntake/JellyfinCandidateReview";
import type { AdminJellyfinIntakeSearchItem } from "@/types/admin";

interface CreateJellyfinCardProps {
  query: string;
  candidates: AdminJellyfinIntakeSearchItem[];
  selectedCandidateID: string | undefined;
  hasActivePreview: boolean;
  hasAdoptedAssets: boolean;
  isSearching: boolean;
  isLoadingPreview: boolean;
  canSearch: boolean;
  isSubmitting: boolean;
  showResults: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectCandidate: (id: string) => void;
  onLoadCandidatePreview: (id: string) => void;
  onAdopt: () => void;
  onDiscard: () => void;
}

export function CreateJellyfinCard({
  query,
  candidates,
  selectedCandidateID,
  hasActivePreview,
  hasAdoptedAssets,
  isSearching,
  isLoadingPreview,
  canSearch,
  isSubmitting,
  showResults,
  onQueryChange,
  onSearch,
  onSelectCandidate,
  onLoadCandidatePreview,
  onAdopt,
  onDiscard,
}: CreateJellyfinCardProps) {
  return (
    <section className={createStyles.providerCard}>
      <div className={createStyles.providerCardHeader}>
        <p className={createStyles.resultsEyebrow}>Jellyfin</p>
        <h2 className={createStyles.resultsTitle}>Jellyfin</h2>
        <p className={createStyles.resultsText}>
          Dateiordner und ursprüngliche Assets
        </p>
      </div>

      <div className={styles.inputRow}>
        <label className={styles.field}>
          <span>Suche</span>
          <input
            value={query}
            placeholder="z. B. Shingeki no Kyojin"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSearch && !isSearching) onSearch();
            }}
          />
        </label>
        <button
          className={createStyles.primaryAction}
          type="button"
          disabled={!canSearch || isSearching || isSubmitting}
          onClick={onSearch}
        >
          {isSearching ? "Sucht..." : "Scannen"}
        </button>
      </div>

      {showResults && candidates.length > 0 ? (
        <div className={createStyles.jellyfinResultsWrap}>
          <p className={createStyles.resultsEyebrow}>
            Gefundene Ordner &nbsp;
            <strong>{candidates.length} Treffer</strong>
          </p>
          <JellyfinCandidateReview
            query={query.trim()}
            candidates={candidates}
            selectedCandidateID={selectedCandidateID}
            isLoadingPreview={isLoadingPreview}
            onSelectCandidate={onSelectCandidate}
            onLoadCandidatePreview={onLoadCandidatePreview}
          />

          {hasActivePreview ? (
            <div className={createStyles.jellyfinAdoptBar}>
              <p className={createStyles.jellyfinAdoptNote}>
                Der ausgewählte Jellyfin-Ordner wird gespeichert und dient als Quelle für originalen Dateipfad, Episoden-Zuordnung und Standard-Assets (Cover, Banner, Logo, Hintergründe, Videos).
              </p>
              {!hasAdoptedAssets ? (
                <button
                  className={createStyles.primaryAction}
                  type="button"
                  onClick={onAdopt}
                >
                  Jellyfin übernehmen
                </button>
              ) : (
                <span className={createStyles.statusPill}>Ausgewählt</span>
              )}
              <button
                className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                type="button"
                onClick={onDiscard}
              >
                Auswahl verwerfen
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showResults && candidates.length === 0 && !isSearching ? (
        <p className={createStyles.resultsText}>
          Keine Ordner gefunden. Prüfe die Schreibweise.
        </p>
      ) : null}
    </section>
  );
}
