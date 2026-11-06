'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { classNames } from '@/components/ui/classNames'

import styles from './Breadcrumbs.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  textHalo?: boolean
  /** 'scrim' stellt die helle Scrim-Tonalität für Breadcrumbs auf einem Foto-/Bannerhintergrund
   *  bereit (meist zusammen mit `textHalo` genutzt) -- die dunklen Admin-Standardfarben wären
   *  dort unlesbar. Ohne Angabe bleiben die Standardfarben aktiv. */
  variant?: 'default' | 'scrim'
}

export function Breadcrumbs({ items, textHalo = false, variant = 'default' }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={classNames(styles.breadcrumbs, variant === 'scrim' && styles.breadcrumbsScrim)}
    >
      <ol className={styles.breadcrumbsList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={item.href ?? item.label} className={styles.breadcrumbsItem}>
              {item.href && !isLast ? (
                <Link href={item.href} prefetch={false} className={styles.breadcrumbsLink}>
                  {textHalo ? (
                    <span className={styles.textHalo}>
                      <span className={styles.haloCopy} aria-hidden="true">{item.label}</span>
                      <span className={styles.haloForeground}>{item.label}</span>
                    </span>
                  ) : item.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbsCurrent} aria-current={isLast ? 'page' : undefined}>
                  {textHalo ? (
                    <span className={styles.textHalo}>
                      <span className={styles.haloCopy} aria-hidden="true">{item.label}</span>
                      <span className={styles.haloForeground}>{item.label}</span>
                    </span>
                  ) : item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={14}
                  className={styles.breadcrumbsSeparator}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
