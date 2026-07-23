import styles from '../../../releaseReviews.module.css'

interface ReleaseReviewMediaPreviewProps {
  thumbnailUrl?: string | null
  originalUrl: string
  caption?: string | null
  altText: string
}

function safeMediaURL(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/media/')) return trimmed
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:' ? trimmed : null
  } catch {
    return null
  }
}

export function ReleaseReviewMediaPreview({
  thumbnailUrl,
  originalUrl,
  caption,
  altText,
}: ReleaseReviewMediaPreviewProps) {
  const safeOriginal = safeMediaURL(originalUrl)
  const safeThumbnail = safeMediaURL(thumbnailUrl)
  const preview = safeThumbnail ?? safeOriginal

  if (!safeOriginal || !preview) {
    return (
      <div className={styles.inlineError} role="alert">
        Die Bildvorschau ist nicht verfügbar.
      </div>
    )
  }

  return (
    <figure className={styles.mediaFigure}>
      {/* Review media URLs are runtime-owned and cannot use a static Next image allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.mediaImage} src={preview} alt={altText} />
      {caption?.trim() ? <figcaption>{caption}</figcaption> : null}
      <a href={safeOriginal} target="_blank" rel="noreferrer">
        Original öffnen <span className={styles.metaText}>(neuer Tab)</span>
      </a>
    </figure>
  )
}
