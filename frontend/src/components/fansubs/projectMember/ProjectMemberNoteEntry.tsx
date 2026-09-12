'use client'

import Link from 'next/link'
import { useState } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Button, DisclosureIndicator } from '@/components/ui'
import { boundedColorKey } from '@/lib/roleCatalog'
import type { ProjectMemberNote } from '@/types/projectMember'

import styles from './ProjectMemberNoteEntry.module.css'

const CLAMP_THRESHOLD = 180

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// Kompakte Timeline-Zeile für einen Textbeitrag (Phase 157, Workstream E). Ersetzt den grossen,
// vollflaechig gefaerbten Rollen-Header der geteilten PublicNoteCard fuer den
// Projekt-Member-Kontext. Rollenfarbe bleibt an JEDEM Eintrag sichtbar (P157-13) ueber die
// zentrale data-color-key -> --role-accent-Naht (globals.css); der RollenNAME erscheint nur, wenn
// der Member mehrere Projektrollen hat.
export function ProjectMemberNoteEntry({
  note,
  projectPath,
  hasMultipleRoles,
}: {
  note: ProjectMemberNote
  projectPath: string
  hasMultipleRoles: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const hasRichBody = note.body_html != null && note.body_html.trim() !== ''
  const plainText =
    note.body_text && note.body_text.trim() !== '' ? note.body_text : stripHtml(note.body_html ?? '')
  const expandable = plainText.length > CLAMP_THRESHOLD
  const bodyClass = `${styles.body}${expandable && !expanded ? ` ${styles.bodyClamped}` : ''}`

  const metaLead = [`Folge ${note.episode_label}`, note.release_version_label, formatDate(note.created_at)]
    .filter(Boolean)
    .join(' · ')
  const showRoleChip = hasMultipleRoles && Boolean(note.role_label)

  return (
    <Link
      href={`${projectPath}/releases/${note.release_version_id}`}
      className={styles.entry}
      data-note-entry
      data-color-key={boundedColorKey(note.role_color_key)}
    >
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.meta}>
          {metaLead}
          {showRoleChip ? (
            <>
              {' · '}
              <span className={styles.roleChip}>{note.role_label}</span>
            </>
          ) : null}
        </p>
        {note.title ? <p className={styles.title}>{note.title}</p> : null}
        {hasRichBody ? (
          <div className={bodyClass}>
            <RichTextRenderer bodyHtml={note.body_html} editorType="tiptap" contentSchemaVersion={1} />
          </div>
        ) : (
          <p className={`${bodyClass} ${styles.bodyText}`}>{note.body_text}</p>
        )}
        {expandable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.toggle}
            aria-expanded={expanded}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setExpanded((value) => !value)
            }}
          >
            {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </Button>
        ) : null}
      </div>
      <DisclosureIndicator className={styles.chevron} />
    </Link>
  )
}
