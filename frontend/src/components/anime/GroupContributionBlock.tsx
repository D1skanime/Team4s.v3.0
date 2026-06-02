import type { AnimeContributionGroup } from '@/types/contributions'

import styles from './GroupContributionBlock.module.css'

interface GroupContributionBlockProps {
  group: AnimeContributionGroup
  expanded: boolean
  onToggle: () => void
}

export function GroupContributionBlock({ group, expanded, onToggle }: GroupContributionBlockProps) {
  const visibleContributors = expanded ? group.contributors : group.contributors.slice(0, 3)
  const hasMore = group.contributors.length > 3

  const activeLabel =
    group.active_from_year || group.active_until_year
      ? `Aktiv: ${group.active_from_year ?? '?'}–${group.active_until_year ?? 'heute'}`
      : null

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.groupName}>{group.fansub_group_name}</span>
        {activeLabel && <span className={styles.activeRange}>{activeLabel}</span>}
      </div>

      <ul className={styles.contributorList}>
        {visibleContributors.map((contributor, index) => (
          <li
            key={`${contributor.member_slug ?? contributor.member_display_name}-${contributor.started_year ?? index}`}
            className={styles.contributorItem}
          >
            <span className={styles.memberName}>
              {contributor.member_display_name}
              {!contributor.is_verified && (
                <span className={styles.historicalLabel}>(historisch)</span>
              )}
            </span>
            <div className={styles.roles}>
              {contributor.role_labels.map((label, roleIndex) => (
                <span key={`${label}-${roleIndex}`} className={styles.roleChip}>
                  {label}
                </span>
              ))}
            </div>
          </li>
        ))}

        {group.hidden_contributor_count > 0 && (
          <li className={styles.hiddenRow}>
            {group.hidden_contributor_count} weitere nicht öffentlich
          </li>
        )}
      </ul>

      {!expanded && hasMore && (
        <button type="button" className={styles.toggleButton} onClick={onToggle}>
          Alle anzeigen
        </button>
      )}
      {expanded && hasMore && (
        <button type="button" className={styles.toggleButton} onClick={onToggle}>
          Weniger anzeigen
        </button>
      )}
    </div>
  )
}
