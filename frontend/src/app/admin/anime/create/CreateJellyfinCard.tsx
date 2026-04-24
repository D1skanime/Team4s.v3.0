"use client";

import createStyles from "./page.module.css";
import styles from "../../admin.module.css";
import { JellyfinCandidateCard } from "../components/JellyfinIntake/JellyfinCandidateCard";
import type { AdminJellyfinIntakeSearchItem } from "@/types/admin";

interface CreateJellyfinCardProps {
  query: string;
  candidates: AdminJellyfinIntakeSearchItem[];
  currentAnimeID?: number;
  selectedCandidateID: string | undefined;
  hasAdoptedAssets: boolean;
  isSearching: boolean;
  isLoadingPreview: boolean;
  canSearch: boolean;
  isSubmitting: boolean;
  showResults: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectCandidate: (id: string) => void;
  onAdoptCandidate: (id: string) => void;
  onDiscard: () => void;
}

export function CreateJellyfinCard({
  query,
  candidates,
  currentAnimeID,
  selectedCandidateID,
  hasAdoptedAssets,
  isSearching,
  isLoadingPreview,
  canSearch,
  isSubmitting,
  showResults,
  onQueryChange,
  onSearch,
  onSelectCandidate,
  onAdoptCandidate,
  onDiscard,
}: CreateJellyfinCardProps) {
  const selectedCandidate = selectedCandidateID
    ? candidates.find((candidate) => candidate.jellyfin_series_id === selectedCandidateID)
    : null;

  return (
    <section className={createStyles.providerCard}>
      <div className={createStyles.providerCardHeader}>
        <p className={createStyles.resultsEyebrow}>Jellyfin</p>
        <h2 className={createStyles.resultsTitle}>Jellyfin</h2>
        <p className={createStyles.resultsText}>
          Dateiordner und passende Quelle fuer Cover, Banner, Logo und Hintergruende
        </p>
      </div>

      <div className={createStyles.providerInputRow}>
        <label className={[styles.field, createStyles.providerFieldGrow].join(" ")}>
          <span>Suche</span>
          <input
            value={query}
            placeholder="z. B. Bleach"
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

      {hasAdoptedAssets ? (
        <div className={createStyles.jellyfinSourceNotice}>
          <p className={createStyles.jellyfinSourceText}>
            <strong>{selectedCandidate?.name || "Jellyfin-Ordner"}</strong> ist jetzt
            als Quelle gesetzt. Die uebernommenen Assets bearbeitest du direkt im
            Asset-Bereich.
          </p>
          <button
            className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
            type="button"
            onClick={onDiscard}
          >
            Auswahl verwerfen
          </button>
        </div>
      ) : showResults && candidates.length > 0 ? (
        <div className={createStyles.providerResultsBlock}>
          <div className={createStyles.providerResultsHeader}>
            <p className={createStyles.resultsEyebrow}>Gefundene Ordner</p>
            <strong className={createStyles.providerResultsCount}>
              {candidates.length} Treffer
            </strong>
          </div>
          <div className={createStyles.providerList}>
            {candidates.map((candidate) => (
              <JellyfinCandidateCard
                key={candidate.jellyfin_series_id}
                candidate={candidate}
                currentAnimeID={currentAnimeID}
                isSelected={candidate.jellyfin_series_id === selectedCandidateID}
                isLoadingPreview={
                  isLoadingPreview && candidate.jellyfin_series_id === selectedCandidateID
                }
                isAdopted={hasAdoptedAssets && candidate.jellyfin_series_id === selectedCandidateID}
                onSelect={onSelectCandidate}
                onAdopt={onAdoptCandidate}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!hasAdoptedAssets && showResults && candidates.length === 0 && !isSearching ? (
        <p className={createStyles.resultsText}>
          Keine Ordner gefunden. Pruefe die Schreibweise.
        </p>
      ) : null}
    </section>
  );
}
