"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui";
import type { AdminAnimeAniSearchSearchCandidate } from "@/types/admin";

import styles from "../../../admin.module.css";
import createStyles from "../../create/page.module.css";

/**
 * Item 1 (quick-261018-l5r Dedupe-Nachtrag): gemeinsame AniSearch-Such-/Eingabekarte,
 * extrahiert aus `CreateAniSearchIntakeCard.tsx` (Create-Flow) und
 * `AnimeEditSourceSection.tsx` (Task 3, Edit-Flow). Owns NUR die strukturellen,
 * duplizierten Teile: Titel-Suche-Zeile, ID/URL-Eingabe-Zeile und die
 * Kandidaten-Liste. Außen bleibt bei jedem Aufrufer: eigene Section/Header und die
 * eigene Konflikt-/Fehler-/Erfolgs-Statusanzeige (Create: `AniSearchDuplicateDecision`
 * unverändert; Edit: eigene einfache Absätze).
 */

export interface AniSearchSearchCardProps {
  /** Titel-Such-Zeile */
  searchInputId?: string;
  searchLabel: string;
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  isSearchingCandidates: boolean;
  searchButtonLabel: string;
  /** Optionaler abweichender Button-Text während der Suche; fällt auf searchButtonLabel zurück. */
  searchingLabel?: string;

  /** ID/URL-Eingabe-Zeile */
  idInputId?: string;
  idLabel: string;
  idPlaceholder?: string;
  idValue: string;
  onIDChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonLabel: string;
  /** Optionaler abweichender Button-Text während des Ladens; fällt auf submitButtonLabel zurück. */
  submittingLabel?: string;
  idAriaDescribedBy?: string;

  /** Kandidaten-Liste */
  candidates: AdminAnimeAniSearchSearchCandidate[];
  onCandidateSelect: (candidate: AdminAnimeAniSearchSearchCandidate) => void;
  candidateActionLabel: string;
  /** Optionaler "Suche verfeinern"-Link unter der Kandidaten-Liste (nur Create-Flow). */
  onCandidateDismiss?: () => void;
  candidateDismissLabel?: string;
}

export function AniSearchSearchCard({
  searchInputId,
  searchLabel,
  searchPlaceholder,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  isSearchingCandidates,
  searchButtonLabel,
  searchingLabel,
  idInputId,
  idLabel,
  idPlaceholder,
  idValue,
  onIDChange,
  onSubmit,
  isSubmitting,
  submitButtonLabel,
  submittingLabel,
  idAriaDescribedBy,
  candidates,
  onCandidateSelect,
  candidateActionLabel,
  onCandidateDismiss,
  candidateDismissLabel = "Suche verfeinern",
}: AniSearchSearchCardProps) {
  return (
    <>
      <FormField label={searchLabel} htmlFor={searchInputId}>
        <div className={createStyles.providerInputRow}>
          <div className={createStyles.providerFieldGrow}>
            <Input
              id={searchInputId}
              value={searchQuery}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={isSearchingCandidates}
            disabled={isSearchingCandidates || !searchQuery.trim()}
            onClick={onSearchSubmit}
          >
            {isSearchingCandidates ? searchingLabel ?? searchButtonLabel : searchButtonLabel}
          </Button>
        </div>
      </FormField>

      <FormField label={idLabel} htmlFor={idInputId}>
        <div className={createStyles.providerInputRow}>
          <div className={createStyles.providerFieldGrow}>
            <Input
              id={idInputId}
              value={idValue}
              placeholder={idPlaceholder}
              aria-describedby={idAriaDescribedBy}
              onChange={(event) => onIDChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || !idValue.trim()}
            onClick={onSubmit}
          >
            {isSubmitting ? submittingLabel ?? submitButtonLabel : submitButtonLabel}
          </Button>
        </div>
      </FormField>

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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onCandidateSelect(candidate)}
                >
                  {candidateActionLabel}
                </Button>
              </div>
            ))}
          </div>
          {onCandidateDismiss ? (
            <Button
              type="button"
              variant="ghost"
              className={createStyles.providerLinkButton}
              onClick={onCandidateDismiss}
            >
              {candidateDismissLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
