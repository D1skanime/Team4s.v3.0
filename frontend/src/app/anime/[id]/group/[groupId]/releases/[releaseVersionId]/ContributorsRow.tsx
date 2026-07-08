import type { PublicReleaseContributor } from "@/types/releaseDetail";

import styles from "./page.module.css";

interface ContributorsRowProps {
  contributors: PublicReleaseContributor[];
}

/**
 * AO4-17: Beteiligte als horizontale, mobil-scrollbare Avatar-Reihe mit Name +
 * Rolle. Das aggregierende Payload (AO4-02) liefert kein Avatarbild — deshalb
 * ausschliesslich Initiale-Placeholder (analog LatestReleaseSection, 99-11).
 */
export function ContributorsRow({ contributors }: ContributorsRowProps) {
  if (contributors.length === 0) return null;

  return (
    <section id="beteiligte" className={styles.contributorsSection}>
      <h2 className={styles.sectionTitle}>Beteiligte</h2>
      <div className={styles.contributorsScroller}>
        {contributors.map((contributor) => (
          <div key={contributor.member_id} className={styles.contributorItem}>
            <div className={styles.contributorAvatar} aria-hidden="true">
              {contributor.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.contributorMeta}>
              <span className={styles.contributorName}>{contributor.name}</span>
              <span className={styles.contributorRole}>{contributor.role_label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
