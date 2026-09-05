'use client'

import { useState } from 'react'

import { PublicNoteCard } from '@/components/public/PublicNoteCard'
import { Button, SectionHeader } from '@/components/ui'
import { getGroupReleaseNotes } from '@/lib/api'
import type { PublicReleaseGroup, PublicReleaseNote } from '@/types/releaseDetail'

import styles from './ReleaseNotesList.module.css'

interface Props { animeID: number; groupID: number; releaseVersionID: number; initialNotes: PublicReleaseNote[]; totalCount: number; groups?: PublicReleaseGroup[] }

export function formatReleaseNoteDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function selectInitialReleaseNotes(notes: PublicReleaseNote[], target = 3) {
  const selected: PublicReleaseNote[] = []
  const seenGroups = new Set<string>()
  for (const note of notes) {
    const key = note.fansub_group_id == null ? 'unassigned' : String(note.fansub_group_id)
    if (!seenGroups.has(key)) { selected.push(note); seenGroups.add(key) }
  }
  if (selected.length < target) {
    for (const note of notes) {
      if (selected.some(item => item.id === note.id)) continue
      selected.push(note)
      if (selected.length >= target) break
    }
  }
  return selected
}

export function ReleaseNotesList({ animeID, groupID, releaseVersionID, initialNotes, totalCount, groups = [] }: Props) {
  const [items, setItems] = useState(initialNotes)
  const [revealed, setRevealed] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialNotes.length < totalCount)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!totalCount) return null

  const visibleItems = revealed ? items : selectInitialReleaseNotes(items)
  const groupNamesByID = new Map(groups.map(group => [group.id, group.name]))
  const buckets = [...new Set(visibleItems.map(note => note.role_label || 'Weitere Beiträge'))]
    .map(role => ({ key: role, label: role, items: visibleItems.filter(note => (note.role_label || 'Weitere Beiträge') === role) }))
  const remaining = Math.max(0, totalCount - visibleItems.length)

  async function loadMore() {
    if (!revealed) { setRevealed(true); if (items.length >= totalCount) return }
    setLoading(true); setError(null)
    try {
      const page = await getGroupReleaseNotes(animeID, groupID, releaseVersionID, { cursor: cursor ?? undefined, limit: 20 })
      setItems(previous => { const seen = new Set(previous.map(note => note.id)); return [...previous, ...page.items.filter(note => !seen.has(note.id))] })
      setCursor(page.next_cursor); setHasMore(page.has_more)
    } catch { setError('Weitere Texte konnten nicht geladen werden. Bitte versuche es erneut.') }
    finally { setLoading(false) }
  }

  return <section id="textbeitraege" className={styles.section}>
    <SectionHeader title="Stimmen aus dem Team" underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.roleGrid} data-role-grid="responsive">
      {buckets.map(bucket => <section key={bucket.key} className={styles.roleGroup}>
        <div className={styles.list}>{bucket.items.map(note => {
          const sourceGroupName = note.fansub_group_id ? groupNamesByID.get(note.fansub_group_id) : null
          return <PublicNoteCard
            key={note.id}
            roleLabel={note.role_label}
            roleCode={note.role_code}
            roleColorKey={note.role_color_key}
            title={note.title}
            author={{ name: note.member_name, avatarUrl: note.member_avatar_url }}
            metaSuffix={sourceGroupName ?? null}
            dateLabel={formatReleaseNoteDate(note.created_at)}
            bodyHtml={note.body_html}
            bodyId={`release-note-body-${note.id}`}
            clampThreshold={320}
            moreLabel="Weiterlesen"
            lessLabel="Weniger anzeigen"
          />
        })}</div>
      </section>)}
    </div>
    {remaining > 0 && (!revealed || hasMore) ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={loadMore}>Weitere {remaining} Texte anzeigen</Button></div> : null}
  </section>
}
