'use client'

import { useState } from 'react'

import { Button, SectionHeader } from '@/components/ui'
import { getGroupHistoryEventPresentation } from '@/lib/group-history-events'
import type { GroupHistoryEventPresentation } from '@/lib/group-history-events'
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

function achievementEventStyle(eventType: string): string | null {
  if (eventType === 'projects_500') return 'historyTimelineEventProjects500'
  if (eventType === 'releases_500') return 'historyTimelineEventReleases500'
  if (eventType === 'releases_1000') return 'historyTimelineEventReleases1000'
  if (eventType === 'releases_5000') return 'historyTimelineEventReleases5000'
  if (eventType === 'releases_10000') return 'historyTimelineEventReleases10000'
  return null
}

function historyTitle(item: PublicFansubHistory): string {
  return item.title?.trim() || item.event_type
}

function publicDomainTerms(text: string): string {
  return text
    .replaceAll('Fansub-Projekte', '__FANSUB_PROJECTS__')
    .replaceAll('Fansub-Projekt', '__FANSUB_PROJECT__')
    .replaceAll('Fansub-Releases', '__FANSUB_RELEASES__')
    .replaceAll('Fansub-Release', '__FANSUB_RELEASE__')
    .replaceAll('Projekte', 'Fansub-Projekte')
    .replaceAll('Projekt', 'Fansub-Projekt')
    .replaceAll('Releases', 'Fansub-Releases')
    .replaceAll('Release', 'Fansub-Release')
    .replaceAll('__FANSUB_PROJECTS__', 'Fansub-Projekte')
    .replaceAll('__FANSUB_PROJECT__', 'Fansub-Projekt')
    .replaceAll('__FANSUB_RELEASES__', 'Fansub-Releases')
    .replaceAll('__FANSUB_RELEASE__', 'Fansub-Release')
    .replaceAll('Fansub-Fansub-', 'Fansub-')
}

function publicHistoryLabel(presentation: GroupHistoryEventPresentation): string {
  return publicDomainTerms(presentation.label)
}

function publicHistoryTitle(item: PublicFansubHistory, presentation: GroupHistoryEventPresentation): string {
  const title = historyTitle(item)
  if (title === item.event_type || title === presentation.label) {
    return publicHistoryLabel(presentation)
  }
  return publicDomainTerms(title)
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
          const eventStyle = achievementEventStyle(item.event_type)
          const presentation = getGroupHistoryEventPresentation(item.event_type)
          const publicLabel = publicHistoryLabel(presentation)
          return (
            <li
              key={item.id}
              className={[
                styles.historyTimelineItem,
                styles[style],
                eventStyle ? styles[eventStyle] : null,
                index % 2 === 1 ? styles.historyTimelineItemRight : styles.historyTimelineItemLeft,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.historyTimelinePair}>
                {item.year ? <span className={styles.historyTimelineAxisYear}>{item.year}</span> : null}
                <div className={styles.historyTimelineBadge} aria-hidden="true">
                  <img src={presentation.imageSrc} alt="" className={styles.historyTimelineImage} />
                </div>
                <article className={styles.historyTimelineCard}>
                  {item.year ? <span className={styles.historyTimelineYear}>{item.year}</span> : null}
                  <strong>{publicHistoryTitle(item, presentation)}</strong>
                  <span className={styles.historyTimelineType}>{publicLabel}</span>
                  {item.note ? <p className={styles.historyTimelineNote}>{item.note}</p> : null}
                </article>
              </div>
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
