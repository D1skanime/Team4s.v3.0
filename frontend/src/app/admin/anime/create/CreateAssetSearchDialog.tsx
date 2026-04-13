"use client";

import Image from "next/image";

import styles from "../../admin.module.css";
import createStyles from "./page.module.css";
import type {
  AdminAnimeAssetKind,
  AdminAnimeAssetSearchCandidate,
} from "@/types/admin";

type SearchableAssetKind = Extract<
  AdminAnimeAssetKind,
  "cover" | "banner" | "logo" | "background"
>;

interface CreateAssetSearchDialogProps {
  activeKind: SearchableAssetKind | null;
  query: string;
  candidates: AdminAnimeAssetSearchCandidate[];
  selectedCandidateIDs: string[];
  errorMessage: string | null;
  hasMore: boolean;
  isOpen: boolean;
  isSearching: boolean;
  isAdopting: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onLoadMore: () => void;
  onToggleCandidate: (candidateID: string) => void;
  onAdoptSelection: () => void;
}

function getAssetCopy(kind: SearchableAssetKind | null) {
  switch (kind) {
    case "cover":
      return {
        title: "Cover online suchen",
        helper: "Waehle ein Cover aus und uebernimm es in den Entwurf.",
        action: "Cover uebernehmen",
      };
    case "banner":
      return {
        title: "Banner online suchen",
        helper: "Waehle ein Banner aus und uebernimm es in den Entwurf.",
        action: "Banner uebernehmen",
      };
    case "logo":
      return {
        title: "Logo online suchen",
        helper: "Waehle ein Logo aus und uebernimm es in den Entwurf.",
        action: "Logo uebernehmen",
      };
    case "background":
      return {
        title: "Backgrounds online suchen",
        helper: "Du kannst mehrere Backgrounds markieren und gesammelt uebernehmen.",
        action: "Auswahl uebernehmen",
      };
    default:
      return {
        title: "Assets online suchen",
        helper: "Suche nach passenden Assets und uebernimm sie in den Entwurf.",
        action: "Auswahl uebernehmen",
      };
  }
}

export function CreateAssetSearchDialog({
  activeKind,
  query,
  candidates,
  selectedCandidateIDs,
  errorMessage,
  hasMore,
  isOpen,
  isSearching,
  isAdopting,
  onClose,
  onQueryChange,
  onSearch,
  onLoadMore,
  onToggleCandidate,
  onAdoptSelection,
}: CreateAssetSearchDialogProps) {
  if (!isOpen || !activeKind) {
    return null;
  }

  const copy = getAssetCopy(activeKind);
  const selectedCount = selectedCandidateIDs.length;
  const canAdopt = selectedCount > 0 && !isAdopting;

  return (
    <div
      className={createStyles.candidateModalBackdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`${createStyles.candidateModal} ${createStyles.assetModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-asset-search-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={createStyles.candidateModalHeader}>
          <div>
            <h3
              id="create-asset-search-title"
              className={createStyles.candidateModalTitle}
            >
              {copy.title}
            </h3>
            <p className={createStyles.candidateModalText}>{copy.helper}</p>
          </div>
          <button
            type="button"
            className={createStyles.secondaryAction}
            onClick={onClose}
          >
            Schliessen
          </button>
        </div>

        <div className={styles.inputRow}>
          <label className={styles.field}>
            <span>Suchbegriff</span>
            <input
              value={query}
              placeholder="z. B. Ao Haru Ride"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={createStyles.primaryAction}
            aria-busy={isSearching}
            disabled={isSearching || !query.trim()}
            onClick={onSearch}
          >
            {isSearching ? "Suche laeuft..." : "Assets suchen"}
          </button>
        </div>

        <div className={createStyles.assetSearchToolbar}>
          <p className={createStyles.assetSearchStatus} aria-live="polite">
            {isSearching
              ? "Treffer werden geladen..."
              : selectedCount > 0
                ? `${selectedCount} Treffer ausgewaehlt`
                : candidates.length > 0
                  ? `${candidates.length} Treffer geladen`
                  : "Noch nichts ausgewaehlt"}
          </p>
          <button
            type="button"
            className={createStyles.secondaryAction}
            disabled={!canAdopt}
            onClick={onAdoptSelection}
          >
            {isAdopting ? "Uebernahme laeuft..." : copy.action}
          </button>
        </div>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

        {candidates.length > 0 ? (
          <>
            <div className={createStyles.assetCandidateGrid}>
              {candidates.map((candidate) => {
                const isSelected = selectedCandidateIDs.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`${createStyles.assetCandidateCard} ${
                      isSelected ? createStyles.assetCandidateCardSelected : ""
                    }`}
                    onClick={() => onToggleCandidate(candidate.id)}
                  >
                    <div className={createStyles.assetCandidatePreview}>
                      <Image
                        src={candidate.preview_url}
                        alt={candidate.title || `${candidate.source} Asset`}
                        fill
                        sizes="(max-width: 720px) 50vw, 220px"
                        className={createStyles.assetCandidateImage}
                        unoptimized
                      />
                    </div>
                    <div className={createStyles.assetCandidateBody}>
                      <div className={createStyles.assetCandidateMeta}>
                        <span className={createStyles.assetSourceBadge}>
                          {candidate.source}
                        </span>
                        {candidate.year ? (
                          <span className={createStyles.assetMetaText}>
                            {candidate.year}
                          </span>
                        ) : null}
                      </div>
                      <strong className={createStyles.assetCandidateTitle}>
                        {candidate.title || "Ohne Titel"}
                      </strong>
                      <p className={createStyles.assetMetaText}>
                        {candidate.width && candidate.height
                          ? `${candidate.width} x ${candidate.height}`
                          : "Groesse unbekannt"}
                      </p>
                      <p className={createStyles.assetMetaText}>ID {candidate.id}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasMore ? (
              <div className={createStyles.assetLoadMoreRow}>
                <button
                  type="button"
                  className={createStyles.secondaryAction}
                  aria-busy={isSearching}
                  disabled={isSearching}
                  onClick={onLoadMore}
                >
                  {isSearching ? "Laden..." : "Mehr laden"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.details}>
            <p className={styles.hint}>
              Noch keine Treffer geladen. Starte eine Suche, um passende Assets zu
              sehen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
