import Image from 'next/image'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface AvatarStackItem {
  id: string | number
  label: string
  imageUrl?: string | null
}

export interface AvatarStackProps {
  items: AvatarStackItem[]
  maxVisible?: number
  className?: string
  ariaLabel?: string
  onOverflowClick?: () => void
  overflowExpanded?: boolean
  overflowControls?: string
  overflowAriaLabel?: string
}

function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
}

export function AvatarStack({
  items,
  maxVisible = 3,
  className,
  ariaLabel,
  onOverflowClick,
  overflowExpanded,
  overflowControls,
  overflowAriaLabel,
}: AvatarStackProps) {
  const visibleItems = items.slice(0, Math.max(0, maxVisible))
  const overflow = Math.max(0, items.length - visibleItems.length)

  return (
    <span className={classNames(styles.avatarStack, className)} aria-label={ariaLabel ?? `${items.length} Einträge`}>
      {visibleItems.map((item) => (
        <span key={item.id} className={styles.avatarStackItem} title={item.label}>
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              width={32}
              height={32}
              className={styles.avatarStackImage}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">{initials(item.label)}</span>
          )}
          <span className={styles.visuallyHidden}>{item.label}</span>
        </span>
      ))}
      {overflow > 0 ? onOverflowClick ? (
        <button
          type="button"
          className={classNames(styles.avatarStackOverflow, styles.avatarStackOverflowButton)}
          aria-label={overflowAriaLabel ?? `${overflow} weitere anzeigen`}
          aria-expanded={overflowExpanded}
          aria-controls={overflowControls}
          onClick={onOverflowClick}
        >
          +{overflow}
        </button>
      ) : (
        <span className={styles.avatarStackOverflow} aria-label={`${overflow} weitere`}>
          +{overflow}
        </span>
      ) : null}
    </span>
  )
}
