'use client'

import Link from 'next/link'
import { useId, useState, useSyncExternalStore } from 'react'

import { AvatarStack, Button } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { FansubGroupSummary } from '@/types/fansub'

import styles from '../page.module.css'

const MOBILE_QUERY = '(max-width: 600px)'
const TABLET_QUERY = '(max-width: 900px)'
const MOBILE_VISIBLE = 3
const TABLET_VISIBLE = 4
const DESKTOP_VISIBLE = 6
const DETAIL_INITIAL_LIMIT = 7

export function coopPartnerLimitForMatches(mobile: boolean, tablet: boolean) {
  if (mobile) return MOBILE_VISIBLE
  if (tablet) return TABLET_VISIBLE
  return DESKTOP_VISIBLE
}

function currentVisibleLimit() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return DESKTOP_VISIBLE
  return coopPartnerLimitForMatches(
    window.matchMedia(MOBILE_QUERY).matches,
    window.matchMedia(TABLET_QUERY).matches,
  )
}

function subscribeToViewport(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined
  const mobile = window.matchMedia(MOBILE_QUERY)
  const tablet = window.matchMedia(TABLET_QUERY)
  mobile.addEventListener('change', onStoreChange)
  tablet.addEventListener('change', onStoreChange)
  return () => {
    mobile.removeEventListener('change', onStoreChange)
    tablet.removeEventListener('change', onStoreChange)
  }
}

interface ProjectStatsProps {
  contributorCount: number
  releaseCount: number
  coopGroups: FansubGroupSummary[]
}

export function ProjectStats({ contributorCount, releaseCount, coopGroups }: ProjectStatsProps) {
  const visibleLimit = useSyncExternalStore(subscribeToViewport, currentVisibleLimit, () => DESKTOP_VISIBLE)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const detailsId = useId()
  const hasOverflow = coopGroups.length > visibleLimit
  const visibleDetails = showAll ? coopGroups : coopGroups.slice(0, DETAIL_INITIAL_LIMIT)
  const remainingDetails = Math.max(0, coopGroups.length - visibleDetails.length)
  const avatarItems = coopGroups.map((group) => ({
    id: group.id,
    label: group.name,
    imageUrl: group.logo_url ? resolveApiUrl(group.logo_url) : null,
  }))

  const toggleDetails = () => {
    if (detailsOpen) setShowAll(false)
    setDetailsOpen((current) => !current)
  }

  return (
    <div className={styles.projectStats}>
      <dl className={styles.stats}>
        <div className={styles.statItem}>
          <dt>Mitwirkende</dt>
          <dd>{contributorCount}</dd>
        </div>
        <div className={styles.statItem}>
          <dt>Releases</dt>
          <dd>{releaseCount}</dd>
        </div>
        {coopGroups.length > 0 ? (
          <div className={styles.statItem}>
            <dt>Coop-Partner</dt>
            <dd>
              <AvatarStack
                items={avatarItems}
                maxVisible={visibleLimit}
                ariaLabel={`${coopGroups.length} Coop-Partner`}
                onOverflowClick={hasOverflow ? toggleDetails : undefined}
                overflowExpanded={detailsOpen}
                overflowControls={detailsId}
                overflowAriaLabel={detailsOpen ? 'Coop-Partner ausblenden' : `${coopGroups.length - visibleLimit} weitere Coop-Partner anzeigen`}
              />
            </dd>
          </div>
        ) : null}
      </dl>

      {detailsOpen && hasOverflow ? (
        <div id={detailsId} className={styles.coopPartnerDetails}>
          <p className={styles.coopPartnerCount}>{coopGroups.length} Coop-Partner</p>
          <ul className={styles.coopPartnerList}>
            {visibleDetails.map((group) => (
              <li key={group.id}>
                <Link href={`/fansubs/${group.slug}`} className={styles.coopPartnerChip}>
                  {group.name}
                </Link>
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
