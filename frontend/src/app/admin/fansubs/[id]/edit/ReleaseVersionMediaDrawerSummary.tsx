'use client'

import Link from 'next/link'
import { useReleaseVersionMedia } from '@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia'
import { CATEGORY_LABELS, ReleaseVersionMediaCategory, RELEASE_VERSION_MEDIA_CATEGORIES } from '@/types/releaseVersionMedia'
import styles from './FansubEdit.module.css'

interface ReleaseVersionMediaDrawerSummaryProps {
  versionId: number
  fansubName: string
  releaseVersionLabel: string
}

export function ReleaseVersionMediaDrawerSummary({
  versionId,
  fansubName,
  releaseVersionLabel,
}: ReleaseVersionMediaDrawerSummaryProps) {
  const { items: rawItems, isLoading, error } = useReleaseVersionMedia(versionId)
  const items = Array.isArray(rawItems) ? rawItems : []

  const countByCategory = RELEASE_VERSION_MEDIA_CATEGORIES.reduce<Record<ReleaseVersionMediaCategory, number>>(
    (acc, cat) => {
      acc[cat] = items.filter((item) => item.category === cat).length
      return acc
    },
    { screenshot: 0, typesetting_karaoke: 0, fun_outtake: 0, other: 0 },
  )

  const hasPreview = items.some((item) => item.is_preview_candidate)

  const miniThumbnails = items
    .filter((item) => item.thumbnail_url !== null)
    .slice(0, 4)

  return (
    <div className={styles.fansubEditReleaseDrawerMediaSummary}>
      <div className={styles.fansubEditReleaseDrawerMediaIntro}>
        <span className={styles.fansubEditReleaseDrawerMediaEyebrow}>{fansubName} · {releaseVersionLabel}</span>
        <h3>Release-Medien im Überblick</h3>
        <p>Screenshots, Typesetting-Beispiele und weitere Assets auf einen Blick, bevor du in die volle Medienverwaltung springst.</p>
      </div>

      {isLoading ? (
        <p className={styles.fansubEditReleaseDrawerMediaState}>Lade Medien...</p>
      ) : error ? (
        <p className={styles.fansubEditReleaseDrawerMediaError}>Fehler: {error}</p>
      ) : (
        <>
          <div className={styles.fansubEditReleaseDrawerMediaStats}>
            {RELEASE_VERSION_MEDIA_CATEGORIES.map((cat) => (
              <article key={cat} className={styles.fansubEditReleaseDrawerMediaStatCard}>
                <span>{CATEGORY_LABELS[cat]}:</span>
                <strong>{countByCategory[cat] === 0 ? '–' : countByCategory[cat]}</strong>
              </article>
            ))}
          </div>

          {miniThumbnails.length > 0 ? (
            <div className={styles.fansubEditReleaseDrawerMediaPreviewGrid}>
              {miniThumbnails.map((item) => (
                <img
                  key={item.id}
                  src={item.thumbnail_url!}
                  alt=""
                  width={104}
                  height={104}
                  className={styles.fansubEditReleaseDrawerMediaPreviewImage}
                />
              ))}
            </div>
          ) : (
            <div className={styles.fansubEditReleaseDrawerMediaEmpty}>
              Noch keine Vorschaubilder geladen. Über die Medienverwaltung kannst du Screenshots und weitere Assets ergänzen.
            </div>
          )}

          <div className={styles.fansubEditReleaseDrawerMediaMetaRow}>
            <span className={`${styles.fansubEditReleaseDrawerMediaBadge} ${hasPreview ? styles.fansubEditReleaseDrawerMediaBadgeSuccess : styles.fansubEditReleaseDrawerMediaBadgeMuted}`}>
              {hasPreview ? 'Vorschau gesetzt' : 'Keine Vorschau'}
            </span>
            <span className={styles.fansubEditReleaseDrawerMediaCount}>{items.length} Medium{items.length === 1 ? '' : 'en'} verfügbar</span>
          </div>
        </>
      )}

      <Link
        href={`/admin/episode-versions/${versionId}/edit/?tab=media`}
        className={styles.fansubEditReleaseDrawerMediaCTA}
      >
        Media verwalten
      </Link>
    </div>
  )
}
