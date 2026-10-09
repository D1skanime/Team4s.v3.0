import { Badge } from '@/components/ui'
import { resolveCategoryLabel } from '@/lib/mediaViewerMetadata'
import { CATEGORY_LABELS } from '@/types/releaseVersionMedia'

import type { PublicImageLightboxItem } from './FansubMediaLightbox'
import styles from './MediaViewerHeader.module.css'

interface MediaViewerHeaderProps {
  item: PublicImageLightboxItem
}

/**
 * Kopfbereich oben am Bühnenrand (Phase 177 Gap-Fix, D-30): Titel + Kategorie/Folge/
 * Release-Version, links neben dem Schließen-X. Entfällt komplett, wenn kein Feld vorhanden ist
 * (Graceful Omission, D-22). Ersetzt den oberen Teil des ehemaligen MediaViewerMetadataPanel.
 */
export function MediaViewerHeader({ item }: MediaViewerHeaderProps) {
  const rawTitle = item.title?.trim()
  const categoryLabel = resolveCategoryLabel(item.category, item.media_type, CATEGORY_LABELS as Record<string, string>)
  const title = rawTitle && rawTitle !== categoryLabel ? rawTitle : undefined
  const hasEpisode = Boolean(item.episode_label)
  const hasReleaseVersion = Boolean(item.release_version_label)
  const hasHeader = Boolean(title) || Boolean(categoryLabel) || hasEpisode || hasReleaseVersion
  if (!hasHeader) return null

  return (
    <div className={styles.header}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {categoryLabel || hasEpisode || hasReleaseVersion ? (
        <div className={styles.metaRow}>
          {categoryLabel ? <Badge variant="info">{categoryLabel}</Badge> : null}
          {hasEpisode ? <span className={styles.metaLabel}>Folge {item.episode_label}</span> : null}
          {hasReleaseVersion ? <span className={styles.metaLabel}>Release-Version {item.release_version_label}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
