'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import styles from './ProjectMemberMediaGallery.module.css'

interface ProjectMemberMediaViewerProps {
  items: ProjectMemberMediaItem[]
  index: number
  projectPath: string
  onClose: () => void
  onIndexChange: (index: number) => void
}

// Basis-Media-Viewer (Brief 13/17). In 122-09 zu Desktop-Sidebar / Mobile-Stacked-Layout,
// Nachbar-Prefetch und vollem Fokusmanagement ausgebaut. Bereits jetzt: Bild (preview),
// Prev/Next, Zähler, Escape/ArrowLeft/ArrowRight, Release-Link.
export function ProjectMemberMediaViewer({
  items,
  index,
  projectPath,
  onClose,
  onIndexChange,
}: ProjectMemberMediaViewerProps) {
  const total = items.length
  const item = items[index]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') onIndexChange((index - 1 + total) % total)
      else if (event.key === 'ArrowRight') onIndexChange((index + 1) % total)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, total, onClose, onIndexChange])

  if (!item) return null
  const releaseHref = `${projectPath}/releases/${item.release_version_id}`

  return (
    <div
      className={styles.viewerBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Medienansicht"
      onClick={onClose}
    >
      <div className={styles.viewer} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.viewerClose} onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <div className={styles.viewerImageWrap}>
          {item.preview_url ? (
            <ResponsiveImage
              src={item.preview_url}
              alt={`${item.category} – Folge ${item.episode_label}`}
              width={1280}
              height={720}
              sizes="(max-width: 900px) 100vw, 70vw"
              className={styles.viewerImage}
            />
          ) : null}
        </div>
        <div className={styles.viewerInfo}>
          <p className={styles.viewerMeta}>
            Folge {item.episode_label} · {item.release_version_label}
          </p>
          {item.caption ? <p>{item.caption}</p> : null}
          <Link href={releaseHref} className={styles.viewerReleaseLink}>
            Release öffnen →
          </Link>
        </div>
        <div className={styles.viewerNav}>
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + total) % total)}
            aria-label="Vorheriges Bild"
          >
            ‹
          </button>
          <span>
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % total)}
            aria-label="Nächstes Bild"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
