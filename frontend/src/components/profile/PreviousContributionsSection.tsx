'use client'

import { History } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { useNearViewportActivation } from '@/hooks/useNearViewportActivation'
import type { PublicMemberPreviousContribution } from '@/types/profile'

import styles from './PreviousContributionsSection.module.css'

type PreviousContributionsSectionProps = {
  items: PublicMemberPreviousContribution[]
  totalCount?: number
  headingLevel?: 2 | 3
  showEmptyState?: boolean
}

function periodLabel(item: PublicMemberPreviousContribution): string | null {
  if (!Number.isFinite(item.ended_year)) return null
  if (Number.isFinite(item.started_year)) return `${item.started_year}-${item.ended_year}`
  return `bis ${item.ended_year}`
}

function displayRoles(item: PublicMemberPreviousContribution): string[] {
  return item.roles.map((role) => role.trim()).filter(Boolean)
}

export function PreviousContributionsSection({
  items,
  totalCount,
  headingLevel = 2,
  showEmptyState = false,
}: PreviousContributionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  const validItems = useMemo(
    () => items.filter((item) => periodLabel(item) !== null),
    [items],
  )
  const displayCount = typeof totalCount === 'number' ? totalCount : validItems.length

  if (displayCount <= 0) {
    if (!showEmptyState) return null

    return (
      <section className={styles.section}>
        {headingLevel === 3
          ? <h3 className={styles.cardHeading}>Frühere Mitwirkungen</h3>
          : <SectionHeader title="Frühere Mitwirkungen" />}
        <Card variant="section" className={styles.card}>
          <p>Keine früheren Mitwirkungen sichtbar.</p>
        </Card>
      </section>
    )
  }

  return (
    <section ref={targetRef} className={styles.section}>
      {headingLevel === 3
        ? <h3 className={styles.cardHeading}>Frühere Mitwirkungen</h3>
        : <SectionHeader title="Frühere Mitwirkungen" />}
      <div
        className={styles.skeletonLayer}
        aria-hidden="true"
        data-visible={interactionEnabled ? 'false' : 'true'}
      >
        <Card variant="section" className={`${styles.card} ${styles.skeletonCard}`}>
          <span className={styles.skeletonButton} />
          <span className={styles.skeletonEntry}>
            <span className={styles.skeletonIcon} />
            <span className={styles.skeletonBody}>
              <span />
              <span />
            </span>
          </span>
        </Card>
      </div>
      <Card variant="section" className={styles.card}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!interactionEnabled}
          onClick={() => {
            if (interactionEnabled) setIsExpanded((current) => !current)
          }}
        >
          {isExpanded
            ? 'Frühere Mitwirkungen ausblenden'
            : `Frühere Mitwirkungen anzeigen (${displayCount})`}
        </Button>

        {isExpanded ? (
          <ul className={styles.list} aria-label="Frühere Mitwirkungen">
            {validItems.map((item) => {
              const roles = displayRoles(item)
              const label = periodLabel(item)
              if (!label) return null

              return (
                <li key={`${item.anime_id}:${item.fansub_group_id}:${label}`}>
                  <div className={styles.entry}>
                    <span className={styles.iconField} aria-hidden="true">
                      <History size={18} />
                    </span>
                    <div className={styles.entryBody}>
                      <div className={styles.entryHeader}>
                        <strong>{item.anime_title}</strong>
                        <span>{item.fansub_group_name}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <Badge variant="muted">{label}</Badge>
                        {roles.map((role) => (
                          <Badge key={role} variant="success">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}
