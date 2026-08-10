'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberReleases } from '@/lib/api'
import type { ProjectMemberRelease } from '@/types/projectMember'

import { ProjectMemberReleaseCard } from './ProjectMemberReleaseCard'
import styles from './ProjectMemberReleasesSection.module.css'
import pageStyles from './ProjectMemberPage.module.css'

const INITIAL_LIMIT = 15
const PAGE_LIMIT = 10

interface ProjectMemberReleasesSectionProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
}

// Release-Mitwirkung (Brief 3.4/20): reine Crew-Historie, cursor-nachgeladen, unabhängig geladen.
export function ProjectMemberReleasesSection({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
}: ProjectMemberReleasesSectionProps) {
  const [items, setItems] = useState<ProjectMemberRelease[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const seen = useRef<Set<number>>(new Set())

  const append = useCallback((incoming: ProjectMemberRelease[]) => {
    setItems((prev) => {
      const next = prev.slice()
      for (const release of incoming) {
        if (!seen.current.has(release.release_version_id)) {
          seen.current.add(release.release_version_id)
          next.push(release)
        }
      }
      return next
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    getProjectMemberReleases(animeID, groupID, memberSlug, {
      limit: INITIAL_LIMIT,
      signal: controller.signal,
    })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name !== 'AbortError') setError(true)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [animeID, groupID, memberSlug, append])

  const loadMore = useCallback(() => {
    if (!cursor) return
    setLoading(true)
    getProjectMemberReleases(animeID, groupID, memberSlug, { cursor, limit: PAGE_LIMIT })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [animeID, groupID, memberSlug, cursor, append])

  return (
    <section id="releases" className={pageStyles.section} aria-labelledby="pm-releases-title">
      <div className={pageStyles.sectionHead}>
        <h2 id="pm-releases-title" className={pageStyles.sectionTitle}>
          Mitwirkung an Releases
        </h2>
        <span className={pageStyles.sectionCount}>{count}</span>
      </div>
      {error ? (
        <p className={styles.error}>Die Release-Mitwirkung konnte nicht geladen werden.</p>
      ) : null}
      <div className={styles.list}>
        {items.map((release) => (
          <ProjectMemberReleaseCard
            key={release.release_version_id}
            release={release}
            projectPath={projectPath}
          />
        ))}
      </div>
      {loading ? <p className={styles.loadingText}>Wird geladen …</p> : null}
      {hasMore && !loading ? (
        <div className={styles.loadMoreWrap}>
          <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
            Weitere laden
          </Button>
        </div>
      ) : null}
    </section>
  )
}
