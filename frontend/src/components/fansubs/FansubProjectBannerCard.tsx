import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { buildPublicFansubProjectHref } from '@/lib/fansubProjectRoutes'
import type { PublicFansubProject } from '@/types/fansub'

import styles from './FansubProjectsSection.module.css'

interface FansubProjectBannerCardProps {
  project: PublicFansubProject
  groupId: number
  fansubSlug?: string | null
  statusLabel: string
  statusVariant?: 'warning' | 'success' | 'danger' | 'neutral'
}

const BANNER_IMAGE_SIZES = '(max-width: 640px) 100vw, 480px'

/**
 * AO6-01/AO6-06: 16:9-Banner-Projektkarte mit Titel-Overlay + Status-Pill.
 * Bildquelle: banner_url (Anime-Banner) mit Fallback auf cover_image (Poster);
 * ohne beides Skeleton-Platzhalter derselben Flaeche (kein Layout-Sprung).
 */
export function FansubProjectBannerCard({
  project,
  groupId,
  fansubSlug,
  statusLabel,
  statusVariant = 'neutral',
}: FansubProjectBannerCardProps) {
  const source = project.banner_url || project.cover_image || ''
  const resolvedImageUrl = source ? resolveApiUrl(source) : ''
  const href = buildPublicFansubProjectHref({ project, groupId, fansubSlug })

  return (
    <Link
      href={href}
      className={styles.bannerCard}
      aria-label={`Fansub-Projekt öffnen: ${project.title}`}
    >
      <div className={styles.bannerFrame}>
        {resolvedImageUrl ? (
          <Image
            src={resolvedImageUrl}
            alt={project.title}
            fill
            sizes={BANNER_IMAGE_SIZES}
            loading="lazy"
            className={styles.bannerImage}
            unoptimized
          />
        ) : (
          <div className={styles.bannerSkeleton} aria-hidden="true" />
        )}
        <Badge variant={statusVariant} className={styles.bannerStatusPill}>
          {statusLabel}
        </Badge>
        <div className={styles.bannerOverlay}>
          <strong className={styles.bannerTitle}>{project.title}</strong>
        </div>
      </div>
    </Link>
  )
}
