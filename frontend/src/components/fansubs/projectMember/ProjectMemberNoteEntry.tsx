'use client'

import Link from 'next/link'
import { useId } from 'react'

import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Button, DisclosureIndicator } from '@/components/ui'
import { boundedColorKey } from '@/lib/roleCatalog'
import { useClampedOverflow } from '@/hooks/useClampedOverflow'
import type { ProjectMemberNote } from '@/types/projectMember'

import styles from './ProjectMemberNoteEntry.module.css'

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
  const bodyId = useId()

  const hasRichBody = note.body_html != null && note.body_html.trim() !== ''
  const plainText =
    note.body_text && note.body_text.trim() !== '' ? note.body_text : stripHtml(note.body_html ?? '')
  const { contentRef, isExpanded, setIsExpanded, isOverflowing } =
    useClampedOverflow(hasRichBody ? note.body_html : plainText)
  const bodyClass = `${styles.body}${!isExpanded ? ` ${styles.bodyClamped}` : ''}`

  const metaLead = [`Folge ${note.episode_label}`, note.release_version_label, formatDate(note.created_at)]
    .filter(Boolean)
    .join(' · ')
  const showRoleChip = hasMultipleRoles && Boolean(note.role_label)

  // 157-06 Operator-Politur (2. Runde, Punkt 5): gemessen (nicht vermutet) via computed styles/
  // getBoundingClientRect an einem echten Live-Eintrag (Titel "test", Text "test 3"): keine
  // versteckte min-height, kein ueberschuessiger gap/line-height -- die 108px Gesamthoehe sind
  // exakt 14px+14px Padding + 2px Rand + 78px Inhalt (Meta-Zeile 19.69 + 4px Abstand + Titel 24 +
  // 4px Abstand + Text 26.39). Das Padding/die Abstaende sind fuer NORMALE Eintraege (145-190
  // Zeichen Text bei den restlichen 11 Notizen dieses Members) angemessen -- bei einem derart
  // winzigen Eintrag wirken dieselben 14px/4px aber unverhaeltnismaessig gross. Fix ist deshalb
  // gezielt an die tatsaechliche Inhaltslaenge gekoppelt (kein globales Verkleinern aller
  // Eintraege): nur Eintraege mit sehr wenig Gesamttext bekommen ueber `data-compact` engere
  // Innenabstaende, lange Eintraege bleiben unveraendert luftig.
  const combinedTextLength = (note.title?.length ?? 0) + plainText.length
  const isCompact = combinedTextLength > 0 && combinedTextLength <= 60

  return (
    <Link
      href={`${projectPath}/releases/${note.release_version_id}`}
      className={styles.entry}
      data-note-entry
      data-color-key={boundedColorKey(note.role_color_key)}
      data-compact={isCompact ? 'true' : undefined}
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
        <div id={bodyId} ref={contentRef} className={bodyClass}>
          {hasRichBody ? (
            <RichTextRenderer bodyHtml={note.body_html} editorType="tiptap" contentSchemaVersion={1} />
          ) : (
            <p className={styles.bodyText}>{plainText}</p>
          )}
        </div>
        {isOverflowing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.toggle}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsExpanded((value) => !value)
            }}
          >
            {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </Button>
        ) : null}
      </div>
      <DisclosureIndicator className={styles.chevron} />
    </Link>
  )
}
