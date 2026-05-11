'use client'

import Link from 'next/link'
import { useReleaseVersionMedia } from '@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia'
import { CATEGORY_LABELS, ReleaseVersionMediaCategory, RELEASE_VERSION_MEDIA_CATEGORIES } from '@/types/releaseVersionMedia'

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
    .slice(0, 3)

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#6b6b70' }}>{fansubName} &middot; {releaseVersionLabel}</span>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 14, color: '#6b6b70' }}>Lade Medien...</p>
      ) : error ? (
        <p style={{ fontSize: 14, color: '#dc3545' }}>Fehler: {error}</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {RELEASE_VERSION_MEDIA_CATEGORIES.map((cat) => (
              <span key={cat} style={{ fontSize: 13, color: '#6b6b70' }}>
                {CATEGORY_LABELS[cat]}: <strong style={{ color: '#1c1c1e' }}>{countByCategory[cat] === 0 ? '–' : countByCategory[cat]}</strong>
              </span>
            ))}
          </div>

          {miniThumbnails.length > 0 ? (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {miniThumbnails.map((item) => (
                <img
                  key={item.id}
                  src={item.thumbnail_url!}
                  alt=""
                  width={32}
                  height={32}
                  style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e1e1e6' }}
                />
              ))}
            </div>
          ) : null}

          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 999,
                background: hasPreview ? '#d4edda' : '#f8d7da',
                color: hasPreview ? '#155724' : '#721c24',
              }}
            >
              {hasPreview ? 'Vorschau gesetzt' : 'Kein Vorschau'}
            </span>
          </div>
        </>
      )}

      <Link
        href={`/admin/episode-versions/${versionId}/edit/?tab=media`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 36,
          padding: '0 12px',
          borderRadius: 6,
          border: '1px solid #e1e1e6',
          background: '#ffffff',
          color: '#1c1c1e',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
          marginTop: 4,
        }}
      >
        Media verwalten
      </Link>
    </div>
  )
}
