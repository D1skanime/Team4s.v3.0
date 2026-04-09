"use client";

// CreateJellyfinResultsPanel: extracted Jellyfin candidate review section for
// the create page. Keeping this panel separate reduces the main page component
// size while co-locating the Jellyfin UI logic with its CSS module.

import { JellyfinCandidateReview } from "../components/JellyfinIntake/JellyfinCandidateReview";
import type { AdminJellyfinIntakeSearchItem } from "@/types/admin";

import createStyles from "./page.module.css";

interface CreateJellyfinResultsPanelProps {
  query: string;
  candidates: AdminJellyfinIntakeSearchItem[];
  selectedCandidateID: string | undefined;
  hasActivePreview: boolean;
  isLoadingPreview: boolean;
  onSelectCandidate: (id: string) => void;
  onLoadCandidatePreview: (id: string) => void;
}

export function CreateJellyfinResultsPanel({
  query,
  candidates,
  selectedCandidateID,
  hasActivePreview,
  isLoadingPreview,
  onSelectCandidate,
  onLoadCandidatePreview,
}: CreateJellyfinResultsPanelProps) {
  return (
    <section className={createStyles.resultsPanel}>
      <div className={createStyles.resultsHeader}>
        <div className={createStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>Jellyfin</p>
          <h2 className={createStyles.resultsTitle}>Treffer pruefen</h2>
          <p className={createStyles.resultsText}>
            Erst Details pruefen, dann die ausgewaehlte Serie aktiv in den
            Entwurf laden. Beim Laden wird die bisherige Jellyfin-Vorschau
            vollstaendig ersetzt.
          </p>
        </div>
        {hasActivePreview ? (
          <span className={createStyles.statusPill}>Vorschau aktiv</span>
        ) : null}
      </div>
      <JellyfinCandidateReview
        query={query}
        candidates={candidates}
        selectedCandidateID={selectedCandidateID}
        isLoadingPreview={isLoadingPreview}
        onSelectCandidate={onSelectCandidate}
        onLoadCandidatePreview={onLoadCandidatePreview}
      />
    </section>
  );
}
