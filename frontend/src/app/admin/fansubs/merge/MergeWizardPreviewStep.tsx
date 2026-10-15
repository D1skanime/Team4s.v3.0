"use client";

import { FansubGroup, MergeFansubsPreviewResult } from "@/types/fansub";
import { ConflictRow, KpiCard } from "./MergeWizardCards";

import sharedStyles from "../../admin.module.css";
import mergeStyles from "./MergeWizard.module.css";

const styles = { ...sharedStyles, ...mergeStyles };

export function MergeWizardPreviewStep({
  targetGroup,
  selectedSourceGroups,
  preview,
  previewLoading,
  merging,
  selectionReady,
  hasPreviewConflicts,
  onReloadPreview,
}: {
  targetGroup: FansubGroup | null;
  selectedSourceGroups: FansubGroup[];
  preview: MergeFansubsPreviewResult | null;
  previewLoading: boolean;
  merging: boolean;
  selectionReady: boolean;
  hasPreviewConflicts: boolean;
  onReloadPreview: () => void;
}) {
  return (
    <div className={styles.panel}>
      <h2>3. Vorschau prüfen</h2>
      <p>Impact und potenzielle Konflikte vor dem finalen Merge prüfen.</p>
      <div className={styles.actions}>
        <button
          className={styles.button}
          type="button"
          onClick={onReloadPreview}
          disabled={!selectionReady || previewLoading || merging}
        >
          {previewLoading ? "Lade Vorschau..." : "Vorschau aktualisieren"}
        </button>
      </div>

      {previewLoading && <p className={styles.hint}>Vorschau wird geladen...</p>}

      {preview && (
        <>
          <div className={styles.mergeKpiGrid}>
            <KpiCard
              label="Zielgruppe"
              value={
                targetGroup ? `${targetGroup.name} (${targetGroup.slug})` : "-"
              }
            />
            <KpiCard
              label="Quellgruppen"
              value={String(selectedSourceGroups.length)}
            />
            <KpiCard
              label="Anime-Zuordnungen"
              value={String(preview.relations_migrated)}
            />
            <KpiCard
              label="Episoden-Versionen"
              value={String(preview.versions_migrated)}
            />
            <KpiCard
              label="Mitglieder"
              value={String(preview.members_migrated)}
            />
            <KpiCard
              label="Aliases migriert"
              value={String(preview.aliases_added.length)}
            />
          </div>

          <div className={styles.mergePreviewDetailGrid}>
            <div className={styles.mergePreviewDetailCard}>
              <h3>Werden gelöscht</h3>
              {selectedSourceGroups.length > 0 ? (
                <ul className={styles.mergeCompactList}>
                  {selectedSourceGroups.map((group) => (
                    <li key={group.id}>
                      {group.name} ({group.slug})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.hint}>Keine Quellen ausgewählt.</p>
              )}
            </div>

            <div className={styles.mergePreviewDetailCard}>
              <h3>Alias-Vorschau</h3>
              <p>
                <strong>{preview.aliases_added.length}</strong> werden
                hinzugefügt,{" "}
                <strong>{preview.aliases_skipped.length}</strong> werden
                übersprungen.
              </p>
              {preview.aliases_added.length > 0 && (
                <>
                  <p className={styles.hint}>Hinzugefügt</p>
                  <ul className={styles.mergeCompactList}>
                    {preview.aliases_added.slice(0, 10).map((alias) => (
                      <li key={`add-${alias}`}>{alias}</li>
                    ))}
                  </ul>
                </>
              )}
              {preview.aliases_skipped.length > 0 && (
                <>
                  <p className={styles.hint}>Übersprungen</p>
                  <ul className={styles.mergeCompactList}>
                    {preview.aliases_skipped.slice(0, 10).map((alias) => (
                      <li key={`skip-${alias}`}>{alias}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div
            className={`${styles.mergeConflictPanel} ${hasPreviewConflicts ? styles.mergeConflictPanelWarning : styles.mergeConflictPanelSafe}`}
          >
            <h3>Konflikte / Duplikate</h3>
            {!hasPreviewConflicts && (
              <p className={styles.mergeConflictSafeText}>
                Keine Konflikte gefunden.
              </p>
            )}

            {preview.conflicts.version_conflicts > 0 && (
              <ConflictRow
                title="Episode-Version Konflikte"
                summary={`${preview.conflicts.version_conflicts} Konflikt(e) blockieren den Merge.`}
              />
            )}
            {preview.conflicts.duplicate_aliases_count > 0 && (
              <ConflictRow
                title="Duplicate Aliases/Tags"
                summary={`${preview.conflicts.duplicate_aliases_count} Alias-Kollision(en) erkannt.`}
                details={preview.conflicts.duplicate_aliases}
              />
            )}
            {preview.conflicts.duplicate_members_count > 0 && (
              <ConflictRow
                title="Duplicate Members"
                summary={`${preview.conflicts.duplicate_members_count} mögliche Duplikate erkannt.`}
                details={preview.conflicts.duplicate_members}
              />
            )}
            {preview.conflicts.duplicate_relations_count > 0 && (
              <ConflictRow
                title="Doppelte Anime-Zuordnungen"
                summary={`${preview.conflicts.duplicate_relations_count} Zuordnungen existieren bereits.`}
                details={preview.conflicts.duplicate_relation_anime_ids.map(
                  (animeID) => `Anime #${animeID}`,
                )}
              />
            )}
            {preview.conflicts.duplicate_slugs_count > 0 && (
              <ConflictRow
                title="Slug-Kollisionen"
                summary={`${preview.conflicts.duplicate_slugs_count} Slug-Kollision(en) erkannt.`}
                details={preview.conflicts.duplicate_slugs}
              />
            )}
            {preview.conflicts.duplicate_names_count > 0 && (
              <ConflictRow
                title="Name-Kollisionen"
                summary={`${preview.conflicts.duplicate_names_count} Name-Kollision(en) erkannt.`}
                details={preview.conflicts.duplicate_names}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
