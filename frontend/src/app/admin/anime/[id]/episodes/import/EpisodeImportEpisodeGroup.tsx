"use client";

import type {
  EpisodeImportMappingRow,
  EpisodeImportSelectedFansubGroup,
} from "@/types/episodeImport";

import { EpisodeImportMappingRowCard } from "./EpisodeImportMappingRow";
import { jellyfinSourceKey } from "@/lib/jellyfinSourceIdentity";
import { fillerLabel } from "./episodeImportMapping";
import styles from "./page.module.css";

export interface EpisodeGroupProps {
  group: {
    episodeNumber: number;
    title: string | null;
    existingEpisodeId: number | null;
    fillerType: string | null;
    fillerNote: string | null;
    coveredEpisodes: Array<{
      episodeNumber: number;
      title: string | null;
      fillerType: string | null;
    }>;
    lastCoveredEpisodeNumber: number;
    rows: EpisodeImportMappingRow[];
  };
  hasVisualGap: boolean;
  onSetTargets: (sourceKey: string, rawTargets: string) => void;
  onSetRelease: (
    sourceKey: string,
    meta: { fansubGroupName?: string; releaseVersion?: string },
  ) => void;
  onSetSelectedFansubGroups: (
    sourceKey: string,
    fansubGroups: EpisodeImportSelectedFansubGroup[],
  ) => void;
  onAddSelectedFansubGroup: (
    sourceKey: string,
    fansubGroup: EpisodeImportSelectedFansubGroup,
  ) => void;
  onRemoveSelectedFansubGroup: (
    sourceKey: string,
    fansubGroup: EpisodeImportSelectedFansubGroup,
  ) => void;
  onApplyFansubGroupToEpisode: (
    episodeNumber: number,
    fansubGroups: EpisodeImportSelectedFansubGroup[],
  ) => void;
  onApplyFansubGroupFromEpisode: (
    episodeNumber: number,
    fansubGroups: EpisodeImportSelectedFansubGroup[],
  ) => void;
  onSetEpisodeTitle: (episodeNumber: number, title: string) => void;
  onSkip: (sourceKey: string) => void;
  onApplyRow: (sourceKey: string) => void;
  applyingRowId: string | null;
  onConfirmEpisode: (episodeNumber: number) => void;
  onSkipEpisode: (episodeNumber: number) => void;
}

/**
 * Extracted from page.tsx (GAP-13, 167-UAT.md): renders one episode block
 * (header with title editor + badges/covered-episodes, followed by the
 * per-file mapping list). When the episode has exactly one file, the
 * filename/folder path move into the header row to the right of the title
 * (`.episodeSingleFileInfo`) instead of only appearing in the per-file row,
 * and `hideFileInfo` suppresses the duplicate in
 * EpisodeImportMappingRowCard for that single row.
 */
export function EpisodeGroup({
  group,
  hasVisualGap,
  onSetTargets,
  onSetRelease,
  onSetSelectedFansubGroups,
  onAddSelectedFansubGroup,
  onRemoveSelectedFansubGroup,
  onApplyFansubGroupToEpisode,
  onApplyFansubGroupFromEpisode,
  onSetEpisodeTitle,
  onSkip,
  onApplyRow,
  applyingRowId,
  onConfirmEpisode,
  onSkipEpisode,
}: EpisodeGroupProps) {
  const hasActionable = group.rows.some(
    (row) => row.status === "suggested" || row.status === "conflict",
  );
  const singleFileRow = group.rows.length === 1 ? group.rows[0] : null;

  return (
    <div className={styles.episodeGroup}>
      <div
        className={`${styles.episodeGroupHeader} ${hasVisualGap ? styles.episodeGroupHeaderGap : ""}`}
      >
        <div className={styles.episodeGroupMeta}>
          <span
            className={`${styles.episodeGroupNumber} ${hasVisualGap ? styles.episodeGroupNumberGap : ""}`}
          >
            #{group.episodeNumber}
          </span>
          <div className={styles.episodeTitleBlock}>
            <div className={styles.episodeTitleRow}>
              <label className={styles.episodeTitleEditor}>
                <span className={styles.episodeTitleLabel}>Titel (DE)</span>
                <textarea
                  className={styles.episodeTitleInput}
                  rows={2}
                  value={group.title ?? ""}
                  placeholder={`Episode ${group.episodeNumber}`}
                  aria-label={`Deutscher Titel für Episode ${group.episodeNumber}`}
                  onChange={(event) =>
                    onSetEpisodeTitle(group.episodeNumber, event.target.value)
                  }
                />
              </label>
              {singleFileRow ? (
                <div className={styles.episodeSingleFileInfo}>
                  <strong className={styles.episodeSingleFileInfoName}>
                    {singleFileRow.file_name || singleFileRow.media_item_id}
                  </strong>
                  {singleFileRow.display_path ? (
                    <span className={styles.episodeSingleFileInfoPath}>
                      {singleFileRow.display_path}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.episodeGroupBadges}>
              {group.existingEpisodeId ? (
                <span className={styles.existingBadge}>lokal vorhanden</span>
              ) : null}
              {fillerLabel(group.fillerType) ? (
                <span
                  className={`${styles.fillerBadge} ${styles[`filler_${group.fillerType ?? ""}`] ?? ""}`}
                  title={group.fillerNote ?? undefined}
                >
                  {fillerLabel(group.fillerType)}
                </span>
              ) : null}
            </div>
            {group.coveredEpisodes.length > 0 ? (
              <div className={styles.coveredEpisodeList}>
                {group.coveredEpisodes.map((coveredEpisode) => (
                  <div
                    key={coveredEpisode.episodeNumber}
                    className={styles.coveredEpisodeItem}
                  >
                    <label className={styles.coveredEpisodeEditor}>
                      <span className={styles.coveredEpisodeNumber}>
                        #{coveredEpisode.episodeNumber}
                      </span>
                      <textarea
                        className={`${styles.episodeTitleInput} ${styles.coveredEpisodeInput}`}
                        rows={2}
                        value={coveredEpisode.title ?? ""}
                        placeholder={`Episode ${coveredEpisode.episodeNumber}`}
                        aria-label={`Deutscher Titel für Episode ${coveredEpisode.episodeNumber}`}
                        onChange={(event) =>
                          onSetEpisodeTitle(
                            coveredEpisode.episodeNumber,
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    {fillerLabel(coveredEpisode.fillerType) ? (
                      <span
                        className={`${styles.fillerBadge} ${styles[`filler_${coveredEpisode.fillerType ?? ""}`] ?? ""}`}
                      >
                        {fillerLabel(coveredEpisode.fillerType)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {hasActionable ? (
          <div className={styles.episodeGroupActions}>
            <button
              className={styles.microButton}
              type="button"
              onClick={() => onConfirmEpisode(group.episodeNumber)}
            >
              Alle bestätigen
            </button>
            <button
              className={styles.microButton}
              type="button"
              onClick={() => onSkipEpisode(group.episodeNumber)}
            >
              Alle ueberspringen
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.mappingList}>
        {group.rows.map((row) => (
          <EpisodeImportMappingRowCard
            key={jellyfinSourceKey(row)}
            episodeNumber={group.episodeNumber}
            row={row}
            hideFileInfo={group.rows.length === 1}
            onSetTargets={onSetTargets}
            onSetRelease={onSetRelease}
            onSetSelectedFansubGroups={onSetSelectedFansubGroups}
            onAddSelectedFansubGroup={onAddSelectedFansubGroup}
            onRemoveSelectedFansubGroup={onRemoveSelectedFansubGroup}
            onApplyFansubGroupToEpisode={onApplyFansubGroupToEpisode}
            onApplyFansubGroupFromEpisode={onApplyFansubGroupFromEpisode}
            onSkip={onSkip}
            onApplyRow={onApplyRow}
            isApplyingRow={applyingRowId === jellyfinSourceKey(row)}
          />
        ))}
      </div>
    </div>
  );
}
