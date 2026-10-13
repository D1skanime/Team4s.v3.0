import styles from "./JellyfinEnrichmentNotice.module.css";

/**
 * Subtle, prop-less notice shown when the backend reports
 * jellyfin_enrichment_degraded: true, i.e. Jellyfin was configured but the upstream call
 * failed while resolving the anime folder path/Laufzeit. Manual editing must never be
 * blocked by this, so the notice is informational only, no interactive control.
 */
export function JellyfinEnrichmentNotice() {
  return (
    <div className={styles.notice} role="status">
      Die externe Medienanreicherung ist gerade nicht erreichbar. Ordnerpfad und Laufzeit können
      fehlen.
    </div>
  );
}
