import Link from "next/link";
import type { AdminJellyfinIntakeSearchItem } from "@/types/admin";
import { resolveJellyfinIntakeAssetUrl } from "../../utils/jellyfin-intake-assets";

import styles from "./JellyfinCandidateCard.module.css";

interface JellyfinCandidateCardProps {
  candidate: AdminJellyfinIntakeSearchItem;
  currentAnimeID?: number;
  isSelected?: boolean;
  isLoadingPreview?: boolean;
  isAdopted?: boolean;
  onSelect: (candidateID: string) => void;
  onAdopt: (candidateID: string) => void;
}

function confidenceLabel(confidence: AdminJellyfinIntakeSearchItem["confidence"]) {
  switch (confidence) {
    case "high":
      return "Passend";
    case "medium":
      return "Aehnlich";
    default:
      return "Pruefen";
  }
}

export function JellyfinCandidateCard({
  candidate,
  currentAnimeID,
  isSelected = false,
  isLoadingPreview = false,
  isAdopted = false,
  onSelect,
  onAdopt,
}: JellyfinCandidateCardProps) {
  const posterUrl = resolveJellyfinIntakeAssetUrl(candidate.poster_url);
  const isCurrentAnime =
    typeof currentAnimeID === "number" &&
    typeof candidate.existing_anime_id === "number" &&
    candidate.existing_anime_id === currentAnimeID;
  const isBlockedImported = candidate.already_imported && !isCurrentAnime;

  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ""}`}>
      <div className={styles.posterWrap}>
        {posterUrl ? (
          <img
            className={styles.posterImage}
            src={posterUrl}
            alt={`Poster Vorschau fuer ${candidate.name}`}
          />
        ) : (
          <div className={styles.posterEmpty}>Keine Vorschau</div>
        )}
        <span
          className={`${styles.matchBadge} ${
            candidate.confidence === "high" ? styles.matchBadgeHigh : ""
          }`}
        >
          {confidenceLabel(candidate.confidence)}
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.textBlock}>
          <h3 className={styles.title}>{candidate.name}</h3>
          <p className={styles.pathText}>
            {candidate.production_year ? `${candidate.production_year} | ` : ""}
            {candidate.path || "ohne Pfad"}
          </p>
          <p className={styles.metaText}>
            {candidate.type_hint.suggested_type?.toUpperCase() || "OFFEN"}
            {candidate.parent_context ? ` | ${candidate.parent_context}` : ""}
            {candidate.library_context ? ` | ${candidate.library_context}` : ""}
          </p>
        </div>

        {isBlockedImported ? (
          <div className={styles.importedBox}>
            <strong>Bereits importiert</strong>
            <p>
              {candidate.existing_title || candidate.name}
              {candidate.existing_anime_id ? ` (#${candidate.existing_anime_id})` : ""}
            </p>
            {candidate.existing_anime_id ? (
              <Link
                className={styles.importedLink}
                href={`/admin/anime/${candidate.existing_anime_id}/edit`}
              >
                Bestehenden Anime oeffnen
              </Link>
            ) : null}
          </div>
        ) : isCurrentAnime ? (
          <div className={styles.importedBox}>
            <strong>Dieser Anime</strong>
            <p>
              {candidate.existing_title || candidate.name}
              {candidate.existing_anime_id ? ` (#${candidate.existing_anime_id})` : ""}
            </p>
          </div>
        ) : null}

        <div className={styles.actionRow}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => onSelect(candidate.jellyfin_series_id)}
          >
            {isSelected ? "Im Fokus" : "Ansehen"}
          </button>

          {isBlockedImported ? (
            <button className={styles.disabledButton} type="button" disabled>
              Bereits importiert
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => onAdopt(candidate.jellyfin_series_id)}
              disabled={isLoadingPreview}
            >
              {isAdopted
                ? "Ausgewaehlt"
                : isLoadingPreview
                  ? "Uebernimmt..."
                  : isCurrentAnime
                    ? "Mit diesem Anime verknuepfen"
                    : "Jellyfin uebernehmen"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
