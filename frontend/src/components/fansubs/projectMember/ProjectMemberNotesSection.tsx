'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberNotes } from '@/lib/api'
import type { ProjectMemberNote } from '@/types/projectMember'

import { ProjectMemberNoteCard } from './ProjectMemberNoteCard'
import styles from './ProjectMemberNotesSection.module.css'
import pageStyles from './ProjectMemberPage.module.css'

const INITIAL_LIMIT = 15
const PAGE_LIMIT = 10

interface ProjectMemberNotesSectionProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
}

// Projektweite Texte-&-Notizen-Sektion (Brief 3.2/10): cursor-nachgeladen, unabhängig von
// Medien/Releases, Requests bei Unmount abgebrochen, keine Duplikate über Cursor-Blöcke.
export function ProjectMemberNotesSection({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
}: ProjectMemberNotesSectionProps) {
  const [items, setItems] = useState<ProjectMemberNote[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Pure Dedup gegen den aktuellen State (kein externer Ref) — sonst bricht der StrictMode-
  // Doppelaufruf des Updaters die Nachlade-Logik (Ref-Mutation ist unrein).
  const append = useCallback((incoming: ProjectMemberNote[]) => {
    setItems((prev) => {
      const existing = new Set(prev.map((note) => note.id))
      const additions = incoming.filter((note) => !existing.has(note.id))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getProjectMemberNotes(animeID, groupID, memberSlug, {
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
    getProjectMemberNotes(animeID, groupID, memberSlug, { cursor, limit: PAGE_LIMIT })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [animeID, groupID, memberSlug, cursor, append])

  return (
    <section id="texte" className={pageStyles.section} aria-labelledby="pm-texte-title">
      <div className={pageStyles.sectionHead}>
        <h2 id="pm-texte-title" className={pageStyles.sectionTitle}>
          Texte &amp; Notizen
        </h2>
        <span className={pageStyles.sectionCount}>{count}</span>
      </div>
      <p className={pageStyles.sectionIntro}>
        Alle öffentlichen Textbeiträge dieses Members zu diesem Projekt.
      </p>
      {error ? (
        <p className={styles.error}>Die Textbeiträge konnten nicht geladen werden.</p>
      ) : null}
      <div className={styles.notesGrid}>
        {items.map((note) => (
          <ProjectMemberNoteCard key={note.id} note={note} projectPath={projectPath} />
        ))}
      </div>
      {loading ? <p className={styles.loadingText}>Wird geladen …</p> : null}
      {hasMore && !loading ? (
        <div className={styles.loadMoreWrap}>
          <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
            Weitere Beiträge laden
          </Button>
        </div>
      ) : null}
    </section>
  )
}
