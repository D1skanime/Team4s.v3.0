'use client'

import { useMemo } from 'react'

import { Button } from './Button'
import { classNames } from './classNames'
import styles from './ui.module.css'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    const from = Math.max(1, currentPage - 2)
    const to = Math.min(totalPages, currentPage + 2)
    const values: number[] = []
    for (let page = from; page <= to; page += 1) {
      values.push(page)
    }
    return values
  }, [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className={styles.pagination} aria-label="Seitennavigation">
      <span className={styles.paginationSummary}>Seite {currentPage} von {totalPages}</span>
      <Button variant="secondary" size="sm" onClick={() => onPageChange?.(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
        Zurück
      </Button>
      {pages.map((page) => (
        <Button
          key={page}
          variant="ghost"
          size="sm"
          className={classNames(styles.pageButton, page === currentPage && styles.pageButtonActive)}
          onClick={() => onPageChange?.(page)}
        >
          {page}
        </Button>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
        Weiter
      </Button>
    </nav>
  )
}
