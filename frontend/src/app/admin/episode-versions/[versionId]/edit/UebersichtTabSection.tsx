import { padEpisodeNumber } from "./episodeVersionEditorUtils";
import styles from "./EpisodeVersionEditor.module.css";

interface UebersichtTabSectionProps {
  animeTitle: string;
  episodeNumber: number | null;
  groupName: string | null;
}

export function UebersichtTabSection({
  animeTitle,
  episodeNumber,
  groupName,
}: UebersichtTabSectionProps) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Übersicht</h2>
          <p className={styles.helperText}>
            Zusammenfassung dieser Episode-Version.
          </p>
        </div>
      </div>
      <div className={styles.stubInfo}>
        <p className={styles.helperText}>Anime: {animeTitle || "—"}</p>
        <p className={styles.helperText}>
          Episode:{" "}
          {episodeNumber != null ? padEpisodeNumber(episodeNumber) : "—"}
        </p>
        {groupName ? (
          <p className={styles.helperText}>Gruppe: {groupName}</p>
        ) : null}
        <p
          className={styles.helperText}
          style={{ marginTop: 8, fontStyle: "italic" }}
        >
          Eine detaillierte Übersicht wird in einem späten Plan ergänzt.
        </p>
      </div>
    </section>
  );
}
