'use client'

import { useState } from 'react'
import { RichTextRenderer } from '@/components/editor'
import { Button, Card, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseNotes, resolveApiUrl } from '@/lib/api'
import type { PublicReleaseNote } from '@/types/releaseDetail'
import styles from './ReleaseNotesList.module.css'

interface Props { animeID: number; groupID: number; releaseVersionID: number; initialNotes: PublicReleaseNote[]; totalCount: number }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) }

export function ReleaseNotesList({ animeID, groupID, releaseVersionID, initialNotes, totalCount }: Props) {
  const [items, setItems] = useState(initialNotes), [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(initialNotes.length < totalCount), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null)
  if (!totalCount) return null
  async function loadMore() { setLoading(true); setError(null); try { const page = await getGroupReleaseNotes(animeID, groupID, releaseVersionID, { cursor: cursor ?? undefined, limit: 20 }); setItems(previous => { const seen = new Set(previous.map(note => note.id)); return [...previous, ...page.items.filter(note => !seen.has(note.id))] }); setCursor(page.next_cursor); setHasMore(page.has_more) } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Weitere Beiträge konnten nicht geladen werden.') } finally { setLoading(false) } }
  const roles = [...new Set(items.map(note => note.role_label || 'Weitere Beiträge'))]
  return <section id="textbeitraege" className={styles.section}>
    <SectionHeader title="Stimmen aus dem Team" description={`${totalCount} Texte, nach Rolle geordnet`} underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    {roles.map(role => <section key={role} className={styles.roleGroup}><h3>{role}</h3><div className={styles.list}>{items.filter(note => (note.role_label || 'Weitere Beiträge') === role).map(note => <Card key={note.id} variant="flat" className={styles.card}>
      <header className={styles.cardHeader}>{note.member_avatar_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.avatar} src={resolveApiUrl(note.member_avatar_url)} alt="" /> : <span className={styles.avatar} aria-hidden="true">{note.member_name.charAt(0).toUpperCase()}</span>}<div><strong>{note.member_name}</strong><p>{role} · {formatDate(note.created_at)}</p></div></header>
      <div className={styles.cardBody}><RichTextRenderer bodyHtml={note.body_html} editorType="tiptap" contentSchemaVersion={1} /></div>
    </Card>)}</div></section>)}
    {hasMore ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={loadMore}>Weitere Texte anzeigen</Button></div> : null}
  </section>
}
