'use client'

import { useId, useState } from 'react'

import { Button } from '@/components/ui'
import type { ReleaseVersionBreakdown as ReleaseVersionBreakdownData } from '@/types/contributions'

import blockStyles from './GroupContributionBlock.module.css'
import styles from './ReleaseVersionBreakdown.module.css'

interface ReleaseVersionBreakdownProps {
  breakdown: ReleaseVersionBreakdownData[]
}

// Aufklappbare Versions-Detailebene (Progressive Disclosure, Phase 67-04, D-05/06/07).
// Rendert nur, wenn versions-spezifische Beiträge existieren. Rollen-Chips und das
// (historisch)-Label nutzen exakt dasselbe Markup wie GroupContributionBlock.
export function ReleaseVersionBreakdown({ breakdown }: ReleaseVersionBreakdownProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  if (!breakdown || breakdown.length === 0) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <Button
        variant="ghost"
        type="button"
        className={blockStyles.toggleButton}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={listId}
      >
        {open ? '▾' : '▸'} Nach Release-Version
      </Button>

      {open && (
        <div id={listId} className={styles.versionList}>
          {breakdown.map((entry) => (
            <div key={entry.release_version_id} className={styles.versionGroup}>
              <span className={styles.versionHead}>
                Episode {entry.episode_number} · {entry.version}
              </span>
              <ul className={blockStyles.contributorList}>
                {entry.contributors.map((contributor, index) => (
                  <li
                    key={`${contributor.member_slug ?? contributor.member_display_name}-${contributor.started_year ?? index}`}
                    className={blockStyles.contributorItem}
                  >
                    <span className={blockStyles.memberName}>
                      {contributor.member_display_name}
                      {!contributor.is_verified && (
                        <span className={blockStyles.historicalLabel}>(historisch)</span>
                      )}
                    </span>
                    <div className={blockStyles.roles}>
                      {contributor.role_labels.map((label, roleIndex) => (
                        <span key={`${label}-${roleIndex}`} className={blockStyles.roleChip}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
