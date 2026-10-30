'use client'

import type { ElementType } from 'react'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { computePaginationItems } from '@/lib/pagination'

import { Button } from './Button'
import { Text } from './Text'
import { classNames } from './classNames'
import styles from './Pagination.module.css'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  /** Klick-Modus: Seitenwechsel löst nur den Callback aus, ohne eigene URL -- für Admin-Tabellen
   *  mit eigenem Lade-/Filter-State. Schließt sich mit `hrefForPage` gegenseitig aus. */
  onPageChange?: (page: number) => void
  /** Link-Modus: jede Seite bekommt eine echte, über diese Funktion gebaute URL -- Weiter-/
   *  Zurück-/Seitenzahlen rendern als Link statt als reiner Klick-Button. Funktioniert ohne
   *  JavaScript und ist für Suchmaschinen crawlbar; nötig für öffentliche, SSR-fähige Listen. */
  hrefForPage?: (page: number) => string
  /** Link-Komponente für clientseitige Navigation im Link-Modus (Standard: natives `<a>`),
   *  z. B. `next/link`s `Link`. */
  linkComponent?: ElementType
  className?: string
}

/**
 * Seitennavigation für lange Listen: Weiter/Zurück plus Seitenfenster mit Lückenanzeige
 * (`computePaginationItems`) für sehr lange Listen. Unterstützt wahlweise Klick-Modus
 * (`onPageChange`) oder Link-Modus (`hrefForPage`) -- einziger Baustein für beide Fälle, damit
 * öffentliche Seiten (echte Links) und Admin-Tabellen (eigener Fetch-State) nicht länger zwei
 * eigenständige Implementierungen pflegen.
 */
export function Pagination({ currentPage, totalPages, onPageChange, hrefForPage, linkComponent, className }: PaginationProps) {
  const items = useMemo(() => computePaginationItems(currentPage, totalPages), [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  function navProps(page: number) {
    return hrefForPage
      ? { href: hrefForPage(page), as: linkComponent }
      : { onClick: () => onPageChange?.(page) }
  }

  return (
    <nav className={classNames(styles.pagination, className)} aria-label="Seitennavigation">
      <Text variant="meta" className={styles.paginationSummary}>Seite {currentPage} von {totalPages}</Text>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<ChevronLeft size={16} aria-hidden="true" />}
        disabled={currentPage === 1}
        {...navProps(Math.max(1, currentPage - 1))}
      >
        Zurück
      </Button>
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">…</span>
        ) : (
          <Button
            key={item}
            variant="ghost"
            size="sm"
            aria-current={item === currentPage ? 'page' : undefined}
            className={styles.pageButton}
            {...navProps(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        variant="secondary"
        size="sm"
        rightIcon={<ChevronRight size={16} aria-hidden="true" />}
        disabled={currentPage === totalPages}
        {...navProps(Math.min(totalPages, currentPage + 1))}
      >
        Weiter
      </Button>
    </nav>
  )
}
