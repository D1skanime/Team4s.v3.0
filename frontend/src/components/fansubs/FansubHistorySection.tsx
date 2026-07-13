'use client'

import { useState } from 'react'

import { Button, SectionHeader } from '@/components/ui'
import { getGroupHistoryEventPresentation } from '@/lib/group-history-events'
import type { PublicFansubHistory } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubHistorySectionProps {
  history: PublicFansubHistory[]
}

const INITIAL_VISIBLE_HISTORY = 6

function achievementStyle(eventType: string): string {
  const presentation = getGroupHistoryEventPresentation(eventType)
  if (presentation.tone === 'green') return 'achGreen'
  if (presentation.tone === 'blue') return 'achBlue'
  if (presentation.tone === 'violet') return 'achViolet'
  if (presentation.tone === 'red') return 'achRed'
  if (presentation.tone === 'legendary') return 'achLegendary'
  if (presentation.tone === 'pink') return 'achPink'
  if (presentation.tone === 'muted') return 'achMuted'
  if (presentation.tone === 'gold') return 'achGold'
  return 'achAccent'
}

function historyTitle(item: PublicFansubHistory): string {
  return item.title?.trim() || item.event_type
}

function sortHistory(history: PublicFansubHistory[]): PublicFansubHistory[] {
  return [...history].sort((a, b) => {
    if (a.year === null || a.year === undefined) return 1
    if (b.year === null || b.year === undefined) return -1
    if (a.year !== b.year) return a.year - b.year
    return a.id - b.id
  })
}

export function FansubHistorySection({ history }: FansubHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (history.length === 0) {
    return null
  }

  const sortedHistory = sortHistory(history)
  const visibleHistory = isExpanded ? sortedHistory : sortedHistory.slice(0, INITIAL_VISIBLE_HISTORY)
  const hiddenCount = sortedHistory.length - INITIAL_VISIBLE_HISTORY

  return (
    <section id="erfolge">
      <SectionHeader title="Historie & Erfolge" underline />
      <ol className={styles.historyTimeline}>
        {visibleHistory.map((item, index) => {
          const style = achievementStyle(item.event_type)
          const presentation = getGroupHistoryEventPresentation(item.event_type)
          return (
            <li
              key={item.id}
              className={`${styles.historyTimelineItem} ${styles[style]} ${
                index % 2 === 1 ? styles.historyTimelineItemRight : styles.historyTimelineItemLeft
              }`}
            >
              <div className={styles.historyTimelineBadge} aria-hidden="true">
                <img src={presentation.imageSrc} alt="" className={styles.historyTimelineImage} />
              </div>
              <article className={styles.historyTimelineCard}>
                {item.year ? <span className={styles.historyTimelineYear}>{item.year}</span> : null}
                <strong>{historyTitle(item)}</strong>
                <span className={styles.historyTimelineType}>{presentation.label}</span>
                {item.note ? <p className={styles.historyTimelineNote}>{item.note}</p> : null}
              </article>
            </li>
          )
        })}
      </ol>
      {hiddenCount > 0 ? (
        <div className={styles.historyTimelineActions}>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? 'Weniger anzeigen' : `Weitere ${hiddenCount} anzeigen`}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
