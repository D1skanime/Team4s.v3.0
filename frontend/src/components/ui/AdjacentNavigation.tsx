import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { classNames } from './classNames'
import styles from './AdjacentNavigation.module.css'

export interface AdjacentNavigationItem {
  href: string
  label: string
  ariaLabel?: string
}

export interface AdjacentNavigationProps {
  previous?: AdjacentNavigationItem | null
  next?: AdjacentNavigationItem | null
  centerLabel?: string
  ariaLabel?: string
  variant?: 'inline' | 'floating'
  className?: string
}

export function AdjacentNavigation({
  previous,
  next,
  centerLabel,
  ariaLabel = 'Benachbarte Inhalte',
  variant = 'inline',
  className,
}: AdjacentNavigationProps) {
  if (!previous && !next && !centerLabel) {
    return null
  }

  return (
    <nav
      className={classNames(
        styles.adjacentNav,
        variant === 'floating' ? styles.adjacentNavFloating : styles.adjacentNavInline,
        className,
      )}
      aria-label={ariaLabel}
    >
      {previous ? (
        <Link
          href={previous.href}
          className={classNames(styles.adjacentNavItem, styles.adjacentNavPrevious)}
          aria-label={previous.ariaLabel ?? `Vorheriger Inhalt: ${previous.label}`}
        >
          <ChevronLeft size={19} aria-hidden="true" />
          <span className={styles.adjacentNavLabel}>{previous.label}</span>
        </Link>
      ) : null}
      {centerLabel ? <span className={styles.adjacentNavCenterLabel}>{centerLabel}</span> : null}
      {next ? (
        <Link
          href={next.href}
          className={classNames(styles.adjacentNavItem, styles.adjacentNavNext)}
          aria-label={next.ariaLabel ?? `Nächster Inhalt: ${next.label}`}
        >
          <span className={styles.adjacentNavLabel}>{next.label}</span>
          <ChevronRight size={19} aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  )
}
