'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { FansubGroupSummary } from '@/types/fansub'

import styles from './GroupEdgeNavigation.module.css'

type Direction = 'prev' | 'next'
type Mode = 'story' | 'releases'

interface GroupEdgeNavigationProps {
  currentGroupId: number
  animeId: number
  animeTitle: string
  otherGroups: FansubGroupSummary[]
  mode: Mode
}

function getGroupUrl(animeId: number, groupId: number, mode: Mode): string {
  const base = `/anime/${animeId}/group/${groupId}`
  return mode === 'releases' ? `${base}/releases` : base
}

export function GroupEdgeNavigation({
  currentGroupId,
  animeId,
  animeTitle,
  otherGroups,
  mode,
}: GroupEdgeNavigationProps) {
  const router = useRouter()
  const [hoverDirection, setHoverDirection] = useState<Direction | null>(null)
  const [loadingDirection, setLoadingDirection] = useState<Direction | null>(null)

  const currentIndex = otherGroups.findIndex((g) => g.id === currentGroupId)
  const previousGroup = currentIndex > 0 ? otherGroups[currentIndex - 1] : null
  const nextGroup = currentIndex >= 0 && currentIndex < otherGroups.length - 1 ? otherGroups[currentIndex + 1] : null
  const previewGroup = hoverDirection === 'prev' ? previousGroup : hoverDirection === 'next' ? nextGroup : null

  useEffect(() => {
    setLoadingDirection(null)
  }, [currentGroupId])

  if (!previousGroup && !nextGroup) {
    return null
  }

  function handleNavigate(direction: Direction) {
    if (loadingDirection) return

    const target = direction === 'prev' ? previousGroup : nextGroup
    if (!target) return

    setLoadingDirection(direction)
    router.push(getGroupUrl(animeId, target.id, mode))
  }

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.navButton}
        onMouseEnter={() => previousGroup && setHoverDirection('prev')}
        onMouseLeave={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
        onFocus={() => previousGroup && setHoverDirection('prev')}
        onBlur={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
        onClick={() => handleNavigate('prev')}
        disabled={!previousGroup || loadingDirection !== null}
        aria-label="Vorherige Gruppe"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        type="button"
        className={styles.navButton}
        onMouseEnter={() => nextGroup && setHoverDirection('next')}
        onMouseLeave={() => setHoverDirection((current) => (current === 'next' ? null : current))}
        onFocus={() => nextGroup && setHoverDirection('next')}
        onBlur={() => setHoverDirection((current) => (current === 'next' ? null : current))}
        onClick={() => handleNavigate('next')}
        disabled={!nextGroup || loadingDirection !== null}
        aria-label="Naechste Gruppe"
      >
        <ChevronRight size={22} />
      </button>

      {previewGroup ? (
        <div
          className={`${styles.previewCard} ${hoverDirection === 'prev' ? styles.previewLeft : styles.previewRight}`}
        >
          {previewGroup.logo_url ? (
            <Image
              src={previewGroup.logo_url}
              alt={previewGroup.name}
              width={66}
              height={66}
              className={styles.previewLogo}
            />
          ) : (
            <div className={styles.previewLogoPlaceholder}>
              <span className={styles.previewLogoInitial}>
                {previewGroup.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className={styles.previewMeta}>
            <p className={styles.previewTitle}>{previewGroup.name}</p>
            <p className={styles.previewSubtitle}>{animeTitle}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
