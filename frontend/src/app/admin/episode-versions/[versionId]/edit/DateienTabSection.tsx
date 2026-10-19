import { jellyfinSourceKey } from "@/lib/jellyfinSourceIdentity";

import { formatBytes, formatDateTime } from "./episodeVersionEditorUtils";
import type { useEpisodeVersionEditor } from "./useEpisodeVersionEditor";
import styles from "./EpisodeVersionEditor.module.css";

interface DateienTabSectionProps {
  editor: ReturnType<typeof useEpisodeVersionEditor>;
}

export function DateienTabSection({ editor }: DateienTabSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Dateien</h2>
          <p className={styles.helperText}>
            Medien-Datei-Verwaltung für diese Version.
          </p>
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => void editor.handleScanFolder()}
          disabled={editor.isScanning}
        >
          {editor.isScanning
            ? "Ordner wird gelesen..."
            : "Ordner synchronisieren"}
        </button>
      </div>

      <label className={styles.field}>
        <span>Stream Link</span>
        <input
          value={editor.formState.streamURL}
          onChange={(event) =>
            editor.setFormState((current) => ({
              ...current,
              streamURL: event.target.value,
            }))
          }
        />
      </label>

      <div className={styles.fileCard}>
        <div className={styles.fileCardHeader}>
          <h3 className={styles.fileCardTitle}>Ausgewählte Datei</h3>
          <button
            className={styles.ghostButton}
            type="button"
            onClick={() => editor.setShowFilePanel((current) => !current)}
          >
            {editor.showFilePanel ? "Auswahl schließen" : "Datei wechseln"}
          </button>
        </div>
        {editor.selectedFile ? (
          <div className={styles.fileStats}>
            <span>Datei: {editor.selectedFile.file_name}</span>
            <span>
              Größe: {formatBytes(editor.selectedFile.file_size_bytes)}
            </span>
            <span>
              Qualität:{" "}
              {editor.selectedFile.video_quality ||
                editor.formState.videoQuality ||
                "n/a"}
            </span>
            <span>Media ID: {editor.selectedFile.media_item_id}</span>
            <span>
              Geändert: {formatDateTime(editor.selectedFile.last_modified)}
            </span>
            <span>
              Erkannte Episode:{" "}
              {editor.selectedFile.detected_episode_number || "n/a"}
            </span>
          </div>
        ) : (
          <p className={styles.helperText}>Noch keine Datei ausgewählt.</p>
        )}
      </div>

      {editor.showFilePanel ? (
        <div className={styles.filePanel}>
          {editor.availableFiles.length > 0 ? (
            editor.availableFiles.map((file) => (
              <button
                key={jellyfinSourceKey(file)}
                type="button"
                className={styles.fileOption}
                onClick={() => editor.applyFile(file)}
              >
                <strong>{file.file_name}</strong>
                <span>{file.video_quality || "n/a"}</span>
                <span>{formatBytes(file.file_size_bytes)}</span>
                <span>{formatDateTime(file.last_modified)}</span>
                <span>Episode: {file.detected_episode_number || "n/a"}</span>
              </button>
            ))
          ) : (
            <p className={styles.helperText}>
              Nach der Synchronisierung erscheinen hier auswaehlbare Dateien.
            </p>
          )}
        </div>
      ) : null}

      <details
        className={styles.advancedPanel}
        open={editor.advancedMode}
        onToggle={(event) => editor.setAdvancedMode(event.currentTarget.open)}
      >
        <summary>Advanced Mode: manuelle Media-Override</summary>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Media Provider</span>
            <input
              value={editor.formState.mediaProvider}
              onChange={(event) =>
                editor.setFormState((current) => ({
                  ...current,
                  mediaProvider: event.target.value,
                }))
              }
            />
          </label>
          <label className={styles.field}>
            <span>Media ID</span>
            <input
              value={editor.formState.mediaItemID}
              onChange={(event) =>
                editor.setFormState((current) => ({
                  ...current,
                  mediaItemID: event.target.value,
                }))
              }
            />
          </label>
        </div>
      </details>
    </section>
  );
}
