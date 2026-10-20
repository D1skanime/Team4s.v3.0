'use client'

import Link from 'next/link'
import { useId, useState } from 'react'

import { Button, HeroMetrics } from '@/components/ui'
import { buildFansubProjectPath } from '@/lib/fansubProjectRoutes'
import type { FansubGroupSummary } from '@/types/fansub'

import styles from '../page.module.css'

const DETAIL_INITIAL_LIMIT = 7

interface ProjectStatsProps {
  contributorCount: number
  releaseCount: number
  coopGroups: FansubGroupSummary[]
  animeID: number
  animeSlug?: string | null
}

export function ProjectStats({ contributorCount, releaseCount, coopGroups, animeID, animeSlug }: ProjectStatsProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const detailsId = useId()
  const singleCoopGroup = coopGroups.length === 1 ? coopGroups[0] : null
  const hasOverflowList = coopGroups.length > 2
  const visibleDetails = showAll ? coopGroups : coopGroups.slice(0, DETAIL_INITIAL_LIMIT)
  const remainingDetails = Math.max(0, coopGroups.length - visibleDetails.length)

  const toggleDetails = () => {
    if (detailsOpen) setShowAll(false)
    setDetailsOpen((current) => !current)
  }

  const partnerLink = (group: FansubGroupSummary, className: string) => (
    <Link
      href={buildFansubProjectPath({ groupSlug: group.slug, animeSlug, animeID, groupID: group.id })}
      prefetch={false}
      className={className}
    >
      {group.name}
    </Link>
  )

  return (
    <div className={styles.projectStats}>
      <HeroMetrics
        ariaLabel="Projektkennzahlen"
        items={[
          { label: 'Mitwirkende', value: contributorCount },
          { label: 'Releases', value: releaseCount },
          ...(coopGroups.length > 0 ? [{
            label: 'Coop-Partner',
            value: singleCoopGroup ? (
              partnerLink(singleCoopGroup, styles.singleCoopPartner)
            ) : (
              <span className={styles.coopPartnerSummary}>
                {partnerLink(coopGroups[0], styles.singleCoopPartner)}
                {' · '}
                {partnerLink(coopGroups[1], styles.singleCoopPartner)}
                {hasOverflowList ? (
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={toggleDetails}
                    aria-expanded={detailsOpen}
                    aria-controls={detailsId}
                  >
                    {`+${coopGroups.length - 2}`}
                  </Button>
                ) : null}
              </span>
            ),
          }] : []),
        ]}
      />

      {detailsOpen && hasOverflowList ? (
        <div id={detailsId} className={styles.coopPartnerDetails}>
          <p className={styles.coopPartnerCount}>{coopGroups.length} Coop-Partner</p>
          <ul className={styles.coopPartnerList}>
            {visibleDetails.map((group) => (
              <li key={group.id}>
                {partnerLink(group, styles.coopPartnerChip)}
              </li>
            ))}
          </ul>
          {coopGroups.length > DETAIL_INITIAL_LIMIT ? (
            <Button type="button" variant="subtle" size="sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? 'Weniger anzeigen' : `+ ${remainingDetails} weitere anzeigen`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
