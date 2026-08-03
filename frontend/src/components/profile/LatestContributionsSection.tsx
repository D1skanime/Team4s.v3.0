'use client'

import {
  Camera,
  FileText,
  Image as ImageIcon,
  SmilePlus,
  Type,
  type LucideIcon,
} from 'lucide-react'

import { useState } from 'react'

import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { CATEGORY_LABELS, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'
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

function contributionTitle(item: PublicMemberLatestContribution): string {
  return item.title?.trim() || item.anime_title
}

const MEDIA_CATEGORY_ICONS: Record<ReleaseVersionMediaCategory, LucideIcon> = {
  screenshot: Camera,
  typesetting_karaoke: Type,
  fun_outtake: SmilePlus,
  other: ImageIcon,
}

function mediaCategory(item: PublicMemberLatestContribution): {
  label: string
  Icon: LucideIcon
} | null {
  const category = item.media_category?.trim() as ReleaseVersionMediaCategory | undefined
  if (!category) return null
  return {
    label: CATEGORY_LABELS[category] ?? category,
    Icon: MEDIA_CATEGORY_ICONS[category] ?? ImageIcon,
  }
}

function relativeTimeLabel(occurredAt: string): string {
  const timestamp = new Date(occurredAt).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const diffMs = Date.now() - timestamp
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (absMs < minute) return 'gerade eben'

  const format = (amount: number, unit: string): string => (
    diffMs >= 0 ? `vor ${amount} ${unit}` : `in ${amount} ${unit}`
  )

  if (absMs < hour) {
    const amount = Math.max(1, Math.round(absMs / minute))
    return format(amount, amount === 1 ? 'Minute' : 'Minuten')
  }
  if (absMs < day) {
    const amount = Math.max(1, Math.round(absMs / hour))
    return format(amount, amount === 1 ? 'Stunde' : 'Stunden')
  }
  if (absMs < month) {
    const amount = Math.max(1, Math.round(absMs / day))
    return format(amount, amount === 1 ? 'Tag' : 'Tagen')
  }

  const amount = Math.max(1, Math.round(absMs / month))
  return format(amount, amount === 1 ? 'Monat' : 'Monaten')
}

function ContextLine({ item }: { item: PublicMemberLatestContribution }) {
  const timeLabel = relativeTimeLabel(item.occurred_at)

  return (
    <div className={styles.contextLine}>
      <span className={styles.projectChip}>{item.anime_title}</span>
      <span>{item.release_version_label}</span>
      {timeLabel ? <span>{timeLabel}</span> : null}
    </div>
  )
}

function usableItems(items: PublicMemberLatestContribution[]): PublicMemberLatestContribution[] {
  return items
    .filter((item) => {
      if (item.type === 'text') return textPreview(item).length > 0
      if (item.type === 'media') return mediaURL(item).length > 0
      return false
    })
}

const INITIAL_ITEM_COUNT = 3

export function LatestContributionsSection({ items }: LatestContributionsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const allUsableItems = usableItems(items)
  const visibleItems = expanded ? allUsableItems : allUsableItems.slice(0, INITIAL_ITEM_COUNT)
  const listId = 'latest-contributions-list'
  if (allUsableItems.length === 0) return null

  return (
    <section className={styles.section}>
      <SectionHeader title="Letzte Beiträge" />
      <ul className={styles.list} aria-label="Letzte Beiträge">
        {visibleItems.map((item) => {
          if (item.type === 'media') {
            const previewURL = mediaURL(item)
            const description = textPreview(item)
            const category = mediaCategory(item)
            const CategoryIcon = category?.Icon

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
                    {category && CategoryIcon ? (
                      <span className={styles.mediaTypePill}>
                        <CategoryIcon size={13} aria-hidden="true" />
                        {category.label}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.mediaBody}>
                    <ContextLine item={item} />
                    <Badge variant="info">
                      <ImageIcon size={14} aria-hidden="true" />
                      Medienbeitrag
                    </Badge>
                    <strong>{contributionTitle(item)}</strong>
                    {description ? <p>{description}</p> : null}
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
                  <ContextLine item={item} />
                  <Badge variant="success">
                    <FileText size={14} aria-hidden="true" />
                    Textbeitrag
                  </Badge>
                  <strong>{contributionTitle(item)}</strong>
                  <p data-line-clamp="2">{textPreview(item)}</p>
                </span>
              </Card>
            </li>
          )
        })}
      </ul>
      {!expanded && allUsableItems.length > INITIAL_ITEM_COUNT ? (
        <Button variant="secondary" size="sm" aria-expanded={false} aria-controls={listId} onClick={() => setExpanded(true)}>
          Weitere Beiträge anzeigen
        </Button>
      ) : null}
    </section>
  )
}
