import Link from 'next/link'

import { Badge } from '@/components/ui'
import { resolveCaption, resolveCategoryLabel } from '@/lib/mediaViewerMetadata'
import { CATEGORY_LABELS } from '@/types/releaseVersionMedia'

import type { PublicImageLightboxItem } from './FansubMediaLightbox'
import styles from './MediaViewerMetadataPanel.module.css'

interface MediaViewerMetadataPanelProps {
  item: PublicImageLightboxItem
}

/**
 * Gestapeltes, vollbreites Metadaten-Panel unterhalb der Bild-Bühne (D-21).
 * Jedes Feld wird unabhängig voneinander weggelassen, wenn sein Wert fehlt
 * (Graceful Omission, D-22) -- keine Platzhalter-Striche.
 */
export function MediaViewerMetadataPanel({ item }: MediaViewerMetadataPanelProps) {
  const title = item.title?.trim()
  const categoryLabel = resolveCategoryLabel(item.category, item.media_type, CATEGORY_LABELS as Record<string, string>)
  const caption = resolveCaption(item.caption, item.description)
  const hasReleaseHref = Boolean(item.release_href && item.release_href.trim())

  return (
    <div className={styles.panel}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {categoryLabel ? <Badge variant="info">{categoryLabel}</Badge> : null}
      {item.episode_label ? <p className={styles.label}>Folge {item.episode_label}</p> : null}
      {item.release_version_label ? <p className={styles.label}>Release-Version {item.release_version_label}</p> : null}
      {caption ? <p className={styles.body}>{caption}</p> : null}
      {hasReleaseHref ? (
        <Link href={item.release_href as string} className={styles.cta}>
          Release öffnen →
        </Link>
      ) : null}
    </div>
  )
}
