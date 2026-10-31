import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { classNames } from './classNames'
import styles from './AvatarStack.module.css'

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
        <Avatar key={item.id} label={item.label} src={item.imageUrl} size="sm" className={styles.avatarStackItem} />
      ))}
      {overflow > 0 ? (
        onOverflowClick ? (
          <IconButton
            variant="accent"
            shape="round"
            size="sm"
            overlap
            icon={`+${overflow}`}
            aria-label={overflowAriaLabel ?? `${overflow} weitere anzeigen`}
            aria-expanded={overflowExpanded}
            aria-controls={overflowControls}
            onClick={onOverflowClick}
          />
        ) : (
          <Avatar label={`${overflow} weitere`} count={overflow} size="sm" className={styles.avatarStackItem} />
        )
      ) : null}
    </span>
  )
}
