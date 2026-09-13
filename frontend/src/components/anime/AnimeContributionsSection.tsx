'use client'

import { useState, useEffect } from 'react'

import type { AnimeContributionGroup } from '@/types/contributions'
import { getAnimeContributions } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { GroupContributionBlock } from './GroupContributionBlock'

import styles from './AnimeContributionsSection.module.css'

interface AnimeContributionsSectionProps {
  animeID: number
}

export function AnimeContributionsSection({ animeID }: AnimeContributionsSectionProps) {
  return <AnimeContributionsContent key={animeID} animeID={animeID} />
}

function AnimeContributionsContent({ animeID }: AnimeContributionsSectionProps) {
  const [groups, setGroups] = useState<AnimeContributionGroup[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryGeneration, setRetryGeneration] = useState(0)
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getAnimeContributions(animeID)
        if (!cancelled) {
          setGroups(data.groups)
          setStatus('ready')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [animeID, retryGeneration])

  function retry() {
    setStatus('loading')
    setRetryGeneration((generation) => generation + 1)
  }

  return (
    <section className={styles.section} aria-label="Mitwirkende Gruppen">
      <h2 className={styles.heading}>Mitwirkende Gruppen</h2>
      {status === 'loading' ? (
        <p className={styles.status} role="status">Mitwirkende Gruppen werden geladen…</p>
      ) : status === 'error' ? (
        <div>
          <p className={styles.status} role="alert">Mitwirkende Gruppen konnten nicht geladen werden.</p>
          <Button variant="secondary" size="sm" onClick={retry}>Erneut versuchen</Button>
        </div>
      ) : groups.length === 0 ? (
        <p className={styles.status} role="status">Noch keine Mitwirkenden eingetragen.</p>
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
