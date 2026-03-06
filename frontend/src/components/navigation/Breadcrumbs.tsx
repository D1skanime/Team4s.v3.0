'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import styles from './Breadcrumbs.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol className={styles.breadcrumbsList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className={styles.breadcrumbsItem}>
              {item.href && !isLast ? (
                <Link href={item.href} prefetch={false} className={styles.breadcrumbsLink}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbsCurrent} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
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
