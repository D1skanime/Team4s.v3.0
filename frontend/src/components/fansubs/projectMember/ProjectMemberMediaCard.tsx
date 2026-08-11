'use client'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import type { ProjectMemberMediaItem } from '@/types/projectMember'
import { CATEGORY_LABELS } from '@/types/releaseVersionMedia'

import styles from './ProjectMemberMediaGallery.module.css'

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
  const label = (CATEGORY_LABELS as Record<string, string>)[item.category] ?? item.category
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
