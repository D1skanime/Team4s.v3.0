'use client'

import { useMemo } from 'react'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import { AnimeGroupCard } from './AnimeGroupCard'
import styles from './contributions.module.css'

interface MyContributionsSectionProps {
  /**
   * Fertig gefilterte und vorbereitete Liste (von page.tsx via useMemo).
   * Enthält ausschließlich confirmed-Einträge, die dem aktiven Filter entsprechen.
   */
  contributions: MeAnimeContribution[]
  onVisibilityChange: (id: number, isPublic: boolean, roleCode?: string, nextContributionId?: number) => void
}

export function MyContributionsSection({
  contributions,
  onVisibilityChange,
}: MyContributionsSectionProps) {
  const grouped = useMemo(() => {
    const map = new Map<number, { title: string; items: MeAnimeContribution[] }>()
    for (const c of contributions) {
      const existing = map.get(c.anime_id)
      if (existing) {
        existing.items.push(c)
      } else {
        map.set(c.anime_id, {
          title: c.anime_title?.trim() || `Anime #${c.anime_id}`,
          items: [c],
        })
      }
    }
    // Alphabetisch nach Titel sortieren
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      a.title.localeCompare(b.title, 'de'),
    )
  }, [contributions])

  return (
    <Card variant="section" className={styles.confirmedRolesSection}>
      <SectionHeader
        title={`Bestätigte Projektrollen (${grouped.length} Animes)`}
      />
      <div className={styles.contributionList}>
        {grouped.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Noch keine bestätigten Projektrollen"
            description="Noch keine bestätigten Rollen."
          />
        ) : (
          <>
            {grouped.map(([animeId, { title, items }]) => (
              <AnimeGroupCard
                key={animeId}
                animeId={animeId}
                animeTitle={title}
                contributions={items}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}
