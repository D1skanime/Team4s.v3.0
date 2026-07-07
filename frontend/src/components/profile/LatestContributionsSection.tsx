import { FileText, Image as ImageIcon } from 'lucide-react'

import { Badge, Card, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicMemberLatestContribution } from '@/types/profile'

import styles from './LatestContributionsSection.module.css'

type LatestContributionsSectionProps = {
  items: PublicMemberLatestContribution[]
}

function textPreview(item: PublicMemberLatestContribution): string {
  return (item.text_preview ?? '').replace(/\s+/g, ' ').trim()
}

function mediaURL(item: PublicMemberLatestContribution): string {
  return resolveApiUrl((item.image_url || item.thumbnail_url || '').trim())
}

function contextLabel(item: PublicMemberLatestContribution): string {
  const releaseLabel = item.release_version_label?.trim()
  return releaseLabel ? `${item.anime_title} - ${releaseLabel}` : item.anime_title
}

function usableItems(items: PublicMemberLatestContribution[]): PublicMemberLatestContribution[] {
  return items
    .filter((item) => {
      if (item.type === 'text') return textPreview(item).length > 0
      if (item.type === 'media') return mediaURL(item).length > 0
      return false
    })
    .slice(0, 3)
}

export function LatestContributionsSection({ items }: LatestContributionsSectionProps) {
  const visibleItems = usableItems(items)
  if (visibleItems.length === 0) return null

  return (
    <section className={styles.section}>
      <SectionHeader title="Letzte Beiträge" />
      <ul className={styles.list} aria-label="Letzte Beiträge">
        {visibleItems.map((item) => {
          if (item.type === 'media') {
            const previewURL = mediaURL(item)
            const caption = (item.caption ?? '').trim()
            return (
              <li key={`${item.type}:${item.id}`}>
                <Card variant="flat" className={styles.mediaCard} data-contribution-type="media">
                  <div
                    className={styles.mediaPreview}
                    data-testid="latest-contribution-media-preview"
                    style={{ aspectRatio: '16 / 9' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewURL}
                      alt={`Medienbeitrag zu ${item.anime_title}`}
                      loading="lazy"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.mediaBody}>
                    <Badge variant="info">
                      <ImageIcon size={14} aria-hidden="true" />
                      Medienbeitrag
                    </Badge>
                    <strong>{item.anime_title}</strong>
                    <span>{contextLabel(item)}</span>
                    {caption ? <p>{caption}</p> : null}
                  </div>
                </Card>
              </li>
            )
          }

          return (
            <li key={`${item.type}:${item.id}`}>
              <Card variant="flat" className={styles.textCard} data-contribution-type="text">
                <span className={styles.iconField} aria-hidden="true">
                  <FileText size={18} />
                </span>
                <span className={styles.textBody}>
                  <Badge variant="success">Textbeitrag</Badge>
                  <strong>{item.anime_title}</strong>
                  <span>{contextLabel(item)}</span>
                  <p data-line-clamp="2">{textPreview(item)}</p>
                </span>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
