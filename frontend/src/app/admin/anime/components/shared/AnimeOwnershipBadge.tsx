'use client'

import type { AnimeEditorOwnership } from '../../utils/anime-editor-ownership'
import styles from '../../AdminStudio.module.css'

interface AnimeOwnershipBadgeProps {
  ownership: AnimeEditorOwnership
}

export function AnimeOwnershipBadge({ ownership }: AnimeOwnershipBadgeProps) {
  return (
    <div className={styles.badgeRow}>
      <span className={`${styles.badge} ${ownership.tone === 'linked' ? styles.badgePrimary : styles.badgeMuted}`}>
        {ownership.label}
      </span>
      <span className={`${styles.badge} ${styles.badgeMuted}`}>{ownership.hint}</span>
    </div>
  )
}
