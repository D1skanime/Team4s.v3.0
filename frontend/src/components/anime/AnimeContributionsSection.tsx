'use client'

import { useState, useEffect } from 'react'

import type { AnimeContributionGroup } from '@/types/contributions'
import { getAnimeContributions } from '@/lib/api'
import { GroupContributionBlock } from './GroupContributionBlock'

import styles from './AnimeContributionsSection.module.css'

interface AnimeContributionsSectionProps {
  animeID: number
}

export function AnimeContributionsSection({ animeID }: AnimeContributionsSectionProps) {
  const [groups, setGroups] = useState<AnimeContributionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getAnimeContributions(animeID)
        if (!cancelled) {
          setGroups(data.groups)
        }
      } catch {
        // Fehler werden still ignoriert — Bereich wird einfach nicht angezeigt
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [animeID])

  if (loading) {
    return null
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Mitwirkende Gruppen</h2>
      {groups.length === 0 ? (
        <p className={styles.empty}>Noch keine Mitwirkenden eingetragen.</p>
      ) : (
        <div className={styles.groupList}>
          {groups.map((group) => (
            <GroupContributionBlock
              key={group.fansub_group_id}
              group={group}
              expanded={expandedGroupId === group.fansub_group_id}
              onToggle={() =>
                setExpandedGroupId(
                  expandedGroupId === group.fansub_group_id ? null : group.fansub_group_id,
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
