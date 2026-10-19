import styles from "./EpisodeVersionEditor.module.css";

export function ChangelogTabSection() {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Changelog</h2>
          <p className={styles.helperText}>
            Änderungshistorie dieser Episode-Version.
          </p>
        </div>
      </div>
      <p className={styles.helperText} style={{ fontStyle: "italic" }}>
        Changelog-Einträge werden in einem späten Plan ergänzt.
      </p>
    </section>
  );
}
