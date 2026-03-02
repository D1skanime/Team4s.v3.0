'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { FansubGroup, AnimeFansubRelation } from '@/types/fansub'

import styles from './ActiveFansubStory.module.css'

interface ActiveFansubStoryProps {
  animeID: number
  fansubGroups: FansubGroup[]
  animeFansubs: AnimeFansubRelation[]
}

function getStorageKey(animeID: number): string {
  return `anime:${animeID}:fansub-filter`
}

function resolveInitialActiveFansubGroupID(animeID: number, animeFansubs: AnimeFansubRelation[]): number | null {
  const primary = animeFansubs.find((relation) => relation.is_primary && relation.fansub_group)?.fansub_group?.id ?? null
  const fallback = primary ?? (animeFansubs[0]?.fansub_group?.id ?? null)

  if (typeof window === 'undefined') {
    return fallback
  }

  const storageValue = window.localStorage.getItem(getStorageKey(animeID))
  if (!storageValue) {
    return fallback
  }

  try {
    const parsed = JSON.parse(storageValue) as { activeFansubGroupId?: number | null }
    const candidate = parsed.activeFansubGroupId
    const validIDs = new Set(animeFansubs.map((relation) => relation.fansub_group?.id).filter((id): id is number => Boolean(id)))
    const activeFansubGroupID =
      typeof candidate === 'number' && validIDs.has(candidate) ? candidate : fallback
    return activeFansubGroupID
  } catch {
    return fallback
  }
}

function buildFansubStoryPreview(group: FansubGroup): string | null {
  const raw = (group.history || group.description || '').trim()
  if (!raw) return null

  const normalized = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const maxLength = 520
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export function ActiveFansubStory({ animeID, fansubGroups, animeFansubs }: ActiveFansubStoryProps) {
  const [activeFansubGroupID, setActiveFansubGroupID] = useState<number | null>(() => resolveInitialActiveFansubGroupID(animeID, animeFansubs))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorageChange = () => {
      const storageValue = window.localStorage.getItem(getStorageKey(animeID))
      if (!storageValue) return
      try {
        const parsed = JSON.parse(storageValue) as { activeFansubGroupId?: number | null }
        const candidate = parsed.activeFansubGroupId
        if (typeof candidate === 'number') {
          setActiveFansubGroupID(candidate)
        }
      } catch {
        // ignore parse errors
      }
    }

    window.addEventListener('storage', handleStorageChange)
    const intervalID = window.setInterval(() => {
      handleStorageChange()
    }, 200)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.clearInterval(intervalID)
    }
  }, [animeID])

  const activeGroup = fansubGroups.find((group) => group.id === activeFansubGroupID)
  if (!activeGroup) return null

  const preview = buildFansubStoryPreview(activeGroup)

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>
        <Link href={`/fansubs/${activeGroup.slug}`}>{activeGroup.name}</Link>
      </h3>
      <p className={styles.text}>{preview || 'Keine Fansub-Historie hinterlegt.'}</p>
    </article>
  )
}
