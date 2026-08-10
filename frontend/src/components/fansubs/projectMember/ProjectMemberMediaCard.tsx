'use client'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import styles from './ProjectMemberMediaGallery.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  screenshot: 'Screenshot',
  typesetting_karaoke: 'Typeset / Karaoke',
  fun_outtake: 'Outtake',
  other: 'Medium',
}

// Galerie-Thumbnail-Karte (Brief 11): fokussierbarer Button, ResponsiveImage-Thumbnail mit fester
// aspect-ratio (kein CLS), kompakter Kontext (Typ, Folge, Version). Öffnet den Viewer über onOpen.
export function ProjectMemberMediaCard({
  item,
  index,
  onOpen,
}: {
  item: ProjectMemberMediaItem
  index: number
  onOpen: (index: number) => void
}) {
  const label = CATEGORY_LABELS[item.category] ?? item.category
  const src = item.thumbnail_url || item.preview_url
  const alt = `${label} – Folge ${item.episode_label}`

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onOpen(index)}
      aria-label={`${alt} öffnen`}
    >
      <span className={styles.thumb}>
        {src ? (
          <ResponsiveImage
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 560px) 50vw, (max-width: 900px) 33vw, (max-width: 1680px) 25vw, 16vw"
            className={styles.thumbImg}
          />
        ) : (
          <span className={styles.thumbFallback}>{label}</span>
        )}
      </span>
      <span className={styles.cardMeta}>
        <span className={styles.cardType}>{label}</span>
        <span className={styles.cardContext}>
          Folge {item.episode_label} · {item.release_version_label}
        </span>
      </span>
    </button>
  )
}
