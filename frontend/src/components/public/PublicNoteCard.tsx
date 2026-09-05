'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { RichTextRenderer } from '@/components/editor'
import { resolveApiUrl } from '@/lib/api'

import styles from './PublicNoteCard.module.css'

export interface PublicNoteAuthor {
  name: string
  avatarUrl?: string | null
}

export interface PublicNoteFooterLink {
  href: string
  label: string
}

export interface PublicNoteCardProps {
  /** Rolle → färbt das Header-Band (--role-accent) und wird in der Rollen-Variante als Titel gezeigt. */
  roleLabel?: string | null
  /** Stabiler Rollen-Code (role_definitions.code) für data-role-code; unabhängig vom Anzeigelabel. */
  roleCode?: string | null
  /** Autor-Variante (z. B. Release-Seite): Avatar + Name im Band. Ohne Autor = Rollen-Variante. */
  author?: PublicNoteAuthor | null
  /** Zusatz in der Autor-Meta-Zeile, z. B. Herkunftsgruppe. */
  metaSuffix?: string | null
  /** Fertig formatiertes Datum (Aufrufer formatiert selbst — SSR/Hydration-kritisch). */
  dateLabel: string
  /** Sekundärzeile im Inhalt, z. B. „Notiz zu Folge 8". */
  contextLine?: string | null
  title?: string | null
  bodyHtml?: string | null
  bodyText?: string | null
  /** DOM-id des Body-Containers (für aria-controls des Toggles). */
  bodyId?: string | null
  /** Ab wie vielen Klartext-Zeichen der „Mehr/Weniger"-Toggle erscheint. */
  clampThreshold?: number
  moreLabel?: string
  lessLabel?: string
  footer?: PublicNoteFooterLink | null
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// Geteilte, rein präsentationale Notiz-Karte für den Public-Bereich (Release-Detail,
// Projekt-Member-Seite …). Rollenfarbiges Header-Band + unterer Rollenfarbstreifen; optionaler
// Autor-Header; Body als RichText (bodyHtml) oder Klartext (bodyText); optionaler Footer-Link.
export function PublicNoteCard({
  roleLabel,
  roleCode,
  author,
  metaSuffix,
  dateLabel,
  contextLine,
  title,
  bodyHtml,
  bodyText,
  bodyId,
  clampThreshold = 240,
  moreLabel = 'Mehr anzeigen',
  lessLabel = 'Weniger anzeigen',
  footer,
}: PublicNoteCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasRichBody = bodyHtml != null && bodyHtml.trim() !== ''
  const plainText = bodyText && bodyText.trim() !== '' ? bodyText : stripHtml(bodyHtml ?? '')
  const expandable = plainText.length > clampThreshold
  const bodyClass = `${styles.body}${expandable && !expanded ? ` ${styles.bodyClamped}` : ''}`

  return (
    <article className={styles.card} data-role-code={roleCode || 'other'}>
      <div className={styles.head}>
        {author ? (
          <div className={styles.author}>
            {author.avatarUrl ? (
              <Image
                className={styles.avatar}
                src={resolveApiUrl(author.avatarUrl)}
                alt=""
                width={40}
                height={40}
                unoptimized
              />
            ) : (
              <span className={styles.avatar} aria-hidden="true">
                {author.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={styles.authorText}>
              <strong className={styles.authorName}>{author.name}</strong>
              <span className={styles.authorMeta}>
                {[roleLabel, metaSuffix, dateLabel].filter(Boolean).join(' · ')}
              </span>
            </span>
          </div>
        ) : (
          <>
            <span className={styles.role}>{roleLabel || 'Mitwirkung'}</span>
            <span className={styles.date}>{dateLabel}</span>
          </>
        )}
      </div>

      <div className={styles.content}>
        {contextLine ? <p className={styles.context}>{contextLine}</p> : null}
        {title ? <p className={styles.title}>{title}</p> : null}
        {hasRichBody ? (
          <div id={bodyId ?? undefined} className={bodyClass}>
            <RichTextRenderer bodyHtml={bodyHtml as string} editorType="tiptap" contentSchemaVersion={1} />
          </div>
        ) : (
          <p id={bodyId ?? undefined} className={`${bodyClass} ${styles.bodyText}`}>
            {bodyText}
          </p>
        )}
        {expandable ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={bodyId ?? undefined}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? lessLabel : moreLabel}
          </button>
        ) : null}
      </div>

      {footer ? (
        <Link href={footer.href} className={styles.footer}>
          {footer.label}
        </Link>
      ) : null}
    </article>
  )
}
