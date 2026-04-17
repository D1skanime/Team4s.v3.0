"use client";

import createStyles from "./page.module.css";
import styles from "../../admin.module.css";

interface CreateReviewSectionProps {
  missingFields: string[];
  hasTitle: boolean;
  hasCover: boolean;
  hasAniSearch: boolean;
  hasJellyfin: boolean;
  assetCount: number;
  isSubmitting: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
  onSubmit: () => void;
}

export function CreateReviewSection({
  missingFields,
  hasTitle,
  hasCover,
  hasAniSearch,
  hasJellyfin,
  assetCount,
  isSubmitting,
  successMessage,
  errorMessage,
  onSubmit,
}: CreateReviewSectionProps) {
  const canCreate = hasTitle && hasCover;

  return (
    <div className={createStyles.reviewCard}>
      <ul className={createStyles.reviewChecklist}>
        <li className={hasTitle ? createStyles.reviewCheckOk : createStyles.reviewCheckWarn}>
          {hasTitle ? "✓" : "○"} Titel vorhanden
        </li>
        <li className={hasCover ? createStyles.reviewCheckOk : createStyles.reviewCheckWarn}>
          {hasCover ? "✓" : "○"} Cover vorhanden{!hasCover ? " (Pflicht)" : ""}
        </li>
        <li className={hasAniSearch ? createStyles.reviewCheckOk : createStyles.reviewCheckMuted}>
          {hasAniSearch ? "✓" : "○"} AniSearch geladen{!hasAniSearch ? " (optional)" : ""}
        </li>
        <li className={hasJellyfin ? createStyles.reviewCheckOk : createStyles.reviewCheckMuted}>
          {hasJellyfin ? "✓" : "○"} Jellyfin übernommen{!hasJellyfin ? " (optional)" : ""}
        </li>
        {assetCount > 0 ? (
          <li className={createStyles.reviewCheckOk}>
            ✓ {assetCount} Asset{assetCount !== 1 ? "s" : ""} bereit
          </li>
        ) : (
          <li className={createStyles.reviewCheckMuted}>○ Noch keine Assets (optional)</li>
        )}
      </ul>

      {missingFields.length > 0 ? (
        <div className={createStyles.reviewMissing}>
          <strong>Fehlend:</strong> {missingFields.join(", ")}
        </div>
      ) : null}

      <p className={createStyles.reviewNote}>
        Noch nicht erstellt — der Anime wird erst nach dem Klick auf „Anime erstellen" angelegt.
      </p>

      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className={styles.successBox}>{successMessage}</div>
      ) : null}

      <div className={createStyles.reviewActions}>
        <button
          className={createStyles.createCTA}
          type="button"
          disabled={!canCreate || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Wird erstellt…" : "Anime erstellen"}
        </button>
      </div>
    </div>
  );
}
