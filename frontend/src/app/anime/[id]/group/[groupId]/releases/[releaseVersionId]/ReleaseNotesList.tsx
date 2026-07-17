'use client'

import Image from 'next/image'
import { useState } from 'react'

import { RichTextRenderer } from '@/components/editor'
import { Button, Card, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseNotes, resolveApiUrl } from '@/lib/api'
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
  const buckets = groups.length ? [
    ...groups.map(group => ({ key: String(group.id), label: group.name, items: visibleItems.filter(note => note.fansub_group_id === group.id) })),
    { key: 'unassigned', label: 'Nicht eindeutig zugeordnet', items: visibleItems.filter(note => note.fansub_group_id == null) },
  ].filter(bucket => bucket.items.length > 0) : [...new Set(visibleItems.map(note => note.role_label || 'Weitere Beiträge'))].map(role => ({ key: role, label: role, items: visibleItems.filter(note => (note.role_label || 'Weitere Beiträge') === role) }))
  const remaining = Math.max(0, totalCount - visibleItems.length)

  async function loadMore() {
    if (!revealed) { setRevealed(true); if (items.length >= totalCount) return }
    setLoading(true); setError(null)
    try {
      const page = await getGroupReleaseNotes(animeID, groupID, releaseVersionID, { cursor: cursor ?? undefined, limit: 20 })
      setItems(previous => { const seen = new Set(previous.map(note => note.id)); return [...previous, ...page.items.filter(note => !seen.has(note.id))] })
      setCursor(page.next_cursor); setHasMore(page.has_more)
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Weitere Beiträge konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }

  return <section id="textbeitraege" className={styles.section}>
    <SectionHeader title="Stimmen aus dem Team" description={`${totalCount} Texte, nach Herkunftsgruppe geordnet`} underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.roleGrid} data-role-grid="responsive">
      {buckets.map(bucket => <section key={bucket.key} className={styles.roleGroup}>
        <SectionHeader eyebrow="Herkunftsgruppe" title={bucket.label} underline />
        <div className={styles.list}>{bucket.items.map(note => <Card key={note.id} variant="flat" className={styles.card}>
          <header className={styles.cardHeader}>
            {note.member_avatar_url ? <Image className={styles.avatar} src={resolveApiUrl(note.member_avatar_url)} alt="" width={42} height={42} unoptimized /> : <span className={styles.avatar} aria-hidden="true">{note.member_name.charAt(0).toUpperCase()}</span>}
            <div><strong>{note.member_name}</strong><p>{note.role_label || 'Beitrag'} · {formatReleaseNoteDate(note.created_at)}</p></div>
          </header>
          <div className={styles.cardBody}><RichTextRenderer bodyHtml={note.body_html} editorType="tiptap" contentSchemaVersion={1} /></div>
        </Card>)}</div>
      </section>)}
    </div>
    {remaining > 0 || hasMore ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={loadMore}>Weitere {remaining || ''} Texte anzeigen</Button></div> : null}
  </section>
}
