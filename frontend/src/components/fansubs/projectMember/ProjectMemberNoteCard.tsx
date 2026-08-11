'use client'

import Link from 'next/link'
import { useState } from 'react'

import { roleColorCode } from '@/lib/roleColors'
import type { ProjectMemberNote } from '@/types/projectMember'

import styles from './ProjectMemberNotesSection.module.css'

const CLAMP_THRESHOLD = 180

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

// Textbeitrag-Karte (Brief 3.2, D-15): Rolle im farbigen Header-Band (Team4s-Rollenfarbe),
// "Notiz zu Folge X" als Sekundärzeile, optionaler Titel, Clamp + Mehr/Weniger,
// Release-Metadatum als farbiges Footer-Band. data-role-code am Karten-Element vererbt
// --role-accent an Header/Footer.
export function ProjectMemberNoteCard({
  note,
  projectPath,
}: {
  note: ProjectMemberNote
  projectPath: string
}) {
  const [expanded, setExpanded] = useState(false)
  const canToggle = note.body_text.length > CLAMP_THRESHOLD
  const releaseHref = `${projectPath}/releases/${note.release_version_id}`
  const versionSuffix = note.release_version_label ? ` · ${note.release_version_label}` : ''

  return (
    <article
      className={styles.noteCard}
      data-role-code={roleColorCode(note.role_label || 'Mitwirkung')}
    >
      <div className={styles.noteHead}>
        <span className={styles.noteRole}>{note.role_label || 'Mitwirkung'}</span>
        <span className={styles.noteDate}>{formatDate(note.created_at)}</span>
      </div>
      <div className={styles.noteContent}>
        {note.episode_label ? (
          <p className={styles.noteEpisode}>Notiz zu Folge {note.episode_label}</p>
        ) : null}
        {note.title ? <p className={styles.noteTitle}>{note.title}</p> : null}
        <p className={`${styles.noteBody} ${canToggle && !expanded ? styles.noteBodyClamped : ''}`}>
          {note.body_text}
        </p>
        {canToggle ? (
          <button
            type="button"
            className={styles.noteToggle}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>
        ) : null}
      </div>
      <Link href={releaseHref} className={styles.noteFooter}>
        Folge {note.episode_label}
        {versionSuffix} →
      </Link>
    </article>
  )
}
