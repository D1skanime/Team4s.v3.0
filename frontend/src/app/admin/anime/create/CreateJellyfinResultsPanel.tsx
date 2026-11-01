"use client";

// CreateJellyfinResultsPanel: ausgelagerter Prüfbereich für die gefundenen Jellyfin-Kandidaten
// der Erstellungsseite. Die eigenständige Komponente hält die Hauptseite kompakter und bündelt
// die Jellyfin-UI-Logik zusammen mit dem zugehörigen CSS-Modul.

import { JellyfinCandidateReview } from "../components/JellyfinIntake/JellyfinCandidateReview";
import type { AdminJellyfinIntakeSearchItem } from "@/types/admin";

import createStyles from "./page.pageShell.module.css";
import sharedStyles from "./page.shared.module.css";

/**
 * Props des CreateJellyfinResultsPanel. Enthält die Suchanfrage, gefundene
 * Kandidaten, den aktuell ausgewählten Kandidaten und Lade-/Auswahlrueckrufe.
 */
interface CreateJellyfinResultsPanelProps {
  query: string;
  candidates: AdminJellyfinIntakeSearchItem[];
  selectedCandidateID: string | undefined;
  hasActivePreview: boolean;
  isLoadingPreview: boolean;
  onSelectCandidate: (id: string) => void;
  onLoadCandidatePreview: (id: string) => void;
}

/**
 * Rendert den Jellyfin-Ergebnis-Bereich auf der Anime-Erstellen-Seite. Zeigt
 * gefundene Jellyfin-Serien mit Auswahl- und Vorschaufunktion. Ein Status-Pill
 * signalisiert, wenn bereits eine Vorschau aktiv in den Entwurf geladen wurde.
 */
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
    <section className={sharedStyles.resultsPanel}>
      <div className={sharedStyles.resultsHeader}>
        <div className={sharedStyles.resultsTitleBlock}>
          <p className={createStyles.resultsEyebrow}>Jellyfin</p>
          <h2 className={sharedStyles.resultsTitle}>Treffer prüfen</h2>
          <p className={sharedStyles.resultsText}>
            Erst Details prüfen, dann die ausgewählte Serie aktiv in den
            Entwurf laden. Beim Laden wird die bisherige Jellyfin-Vorschau
            vollständig ersetzt.
          </p>
        </div>
        {hasActivePreview ? (
          <span className={sharedStyles.statusPill}>Vorschau aktiv</span>
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
