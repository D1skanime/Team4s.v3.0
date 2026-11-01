"use client";

import pageShellStyles from "./page.pageShell.module.css";
import providerGridStyles from "./page.providerGrid.module.css";
import providersStyles from "./page.providers.module.css";
import sharedStyles from "./page.shared.module.css";
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
  return (
    <section className={providersStyles.providerCard}>
      <div className={providersStyles.providerCardHeader}>
        <p className={pageShellStyles.resultsEyebrow}>Jellyfin</p>
      </div>

      <div className={providerGridStyles.providerInputRow}>
        <label className={[styles.field, providerGridStyles.providerFieldGrow].join(" ")}>
          <input
            aria-label="Jellyfin-Suche"
            value={query}
            placeholder="z. B. Bleach"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSearch && !isSearching) onSearch();
            }}
          />
        </label>
        <button
          className={sharedStyles.primaryAction}
          type="button"
          disabled={!canSearch || isSearching || isSubmitting}
          onClick={onSearch}
        >
          {isSearching ? "Sucht..." : "Scannen"}
        </button>
      </div>

      {hasAdoptedAssets ? (
        <div className={providersStyles.jellyfinSourceNotice}>
          <button
            className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
            type="button"
            onClick={onDiscard}
          >
            Auswahl verwerfen
          </button>
        </div>
      ) : showResults && candidates.length > 0 ? (
        <div className={providerGridStyles.providerResultsBlock}>
          <div className={providerGridStyles.providerResultsHeader}>
            <p className={pageShellStyles.resultsEyebrow}>Gefundene Ordner</p>
            <strong className={providerGridStyles.providerResultsCount}>
              {candidates.length} Treffer
            </strong>
          </div>
          <div className={providerGridStyles.providerList}>
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
        <p className={sharedStyles.resultsText}>
          Keine Ordner gefunden. Pruefe die Schreibweise.
        </p>
      ) : null}
    </section>
  );
}
