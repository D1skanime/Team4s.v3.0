'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef } from 'react'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import styles from './ProjectMemberMediaGallery.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  screenshot: 'Release-Screenshot',
  typesetting_karaoke: 'Typeset / Karaoke',
  fun_outtake: 'Outtake',
  other: 'Medium',
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

function prefetch(url: string | undefined) {
  if (!url) return
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') return
  const img = new window.Image()
  img.src = url
}

interface ProjectMemberMediaViewerProps {
  items: ProjectMemberMediaItem[]
  index: number
  projectPath: string
  memberDisplayName?: string
  onClose: () => void
  onIndexChange: (index: number) => void
}

// Responsiver Media Viewer (Brief 14–18): Desktop Bild + Info-Sidebar, Mobile gestapelt
// (Bild oben, Infos darunter), Tablet breitenabhängig (CSS). Prev/Next, Tastatur, Nachbar-Prefetch,
// Fokus beim Öffnen in den Dialog (Rückgabe an das auslösende Element übernimmt die Galerie).
export function ProjectMemberMediaViewer({
  items,
  index,
  projectPath,
  memberDisplayName,
  onClose,
  onIndexChange,
}: ProjectMemberMediaViewerProps) {
  const total = items.length
  const item = items[index]
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const goPrev = useCallback(() => onIndexChange((index - 1 + total) % total), [index, total, onIndexChange])
  const goNext = useCallback(() => onIndexChange((index + 1) % total), [index, total, onIndexChange])

  // Tastatur + Fokus beim Öffnen.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') goPrev()
      else if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, goNext])

  // Nachbar-Prefetch (Brief 17): angrenzende Previews gezielt vorladen.
  useEffect(() => {
    if (total <= 1) return
    prefetch(items[(index + 1) % total]?.preview_url)
    prefetch(items[(index - 1 + total) % total]?.preview_url)
  }, [index, total, items])

  if (!item) return null
  const releaseHref = `${projectPath}/releases/${item.release_version_id}`
  const label = CATEGORY_LABELS[item.category] ?? item.category
  const date = formatDate(item.created_at)

  return (
    <div
      className={styles.viewerBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Medienansicht"
      onClick={onClose}
    >
      <div
        className={styles.viewer}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.viewerClose} onClick={onClose} aria-label="Schließen">
          ×
        </button>

        <div className={styles.viewerMain}>
          <div className={styles.viewerImageWrap}>
            {item.preview_url ? (
              <ResponsiveImage
                src={item.preview_url}
                alt={`${label} – Folge ${item.episode_label}`}
                width={1600}
                height={900}
                sizes="(max-width: 900px) 100vw, 68vw"
                className={styles.viewerImage}
              />
            ) : null}
          </div>

          <aside className={styles.viewerInfo}>
            <p className={styles.viewerCategory}>{label}</p>
            <p className={styles.viewerMeta}>
              Folge {item.episode_label} · {item.release_version_label}
            </p>
            {memberDisplayName ? (
              <p className={styles.viewerFrom}>Von {memberDisplayName}</p>
            ) : null}
            {date ? <p className={styles.viewerDate}>{date}</p> : null}
            {item.caption ? <p className={styles.viewerCaption}>{item.caption}</p> : null}
            <Link href={releaseHref} className={styles.viewerReleaseLink}>
              Release öffnen →
            </Link>
          </aside>
        </div>

        <div className={styles.viewerNav}>
          <button type="button" onClick={goPrev} aria-label="Vorheriges Bild">
            ‹
          </button>
          <span>
            {index + 1} / {total}
          </span>
          <button type="button" onClick={goNext} aria-label="Nächstes Bild">
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
