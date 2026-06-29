import { Badge, Card, EmptyState } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { MemberProfileRecentMedia } from '@/types/profile'

import styles from './profile.module.css'

type RecentMediaSectionProps = {
  items: MemberProfileRecentMedia[]
  canView: boolean
  isPublicView?: boolean
}

function formatReleaseVersionTitle(item: MemberProfileRecentMedia): string {
  const releaseVersionID = Number.isFinite(item.release_version_id) ? item.release_version_id : null
  const label = item.release_version_label?.trim() ?? ''
  if (releaseVersionID == null) return `Bild aus ${item.anime_title}`
  return label
    ? `Release-Version #${releaseVersionID} (${label})`
    : `Release-Version #${releaseVersionID}`
}

function formatMediaTitle(item: MemberProfileRecentMedia, fallback: string): string {
  const caption = item.caption?.trim() ?? ''
  return caption || fallback
}

export function RecentMediaSection({ items, canView }: RecentMediaSectionProps) {
  if (!canView || items.length === 0) {
    return <EmptyState title="Noch keine Medien hochgeladen." />
  }

  return (
    <ul className={styles.recentMediaGrid} aria-label="Letzte Medien">
      {items.slice(0, 3).map((item, index) => {
        const thumbnailURL = resolveApiUrl(item.thumbnail_url || '')
        const previewLabel = `Vorschau ${index + 1}`
        const mediaTitle = formatMediaTitle(item, previewLabel)

        return (
          <li key={item.id}>
            <Card variant="flat" className={styles.recentMediaCard}>
              <div className={styles.recentMediaThumb}>
                {thumbnailURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailURL} alt={`Medienbild zu ${item.anime_title}`} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{item.anime_title.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.recentItemBody}>
                <Badge variant="info">{previewLabel}</Badge>
                <strong>{mediaTitle}</strong>
                <span>{formatReleaseVersionTitle(item)}</span>
                <span>{item.anime_title}</span>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
