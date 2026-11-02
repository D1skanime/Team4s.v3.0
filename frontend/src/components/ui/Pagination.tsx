'use client'

import type { ElementType } from 'react'
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { computePaginationItems } from '@/lib/pagination'

import { Button } from './Button'
import { Text } from './Text'
import { classNames } from './classNames'
import styles from './Pagination.module.css'

interface PagesModeProps {
  mode?: 'pages'
  currentPage: number
  totalPages: number
  /** Klick-Modus: Seitenwechsel löst nur den Callback aus, ohne eigene URL -- für Admin-Tabellen
   *  mit eigenem Lade-/Filter-State. Schließt sich mit `hrefForPage` gegenseitig aus. */
  onPageChange?: (page: number) => void
  /** Link-Modus: jede Seite bekommt eine echte, über diese Funktion gebaute URL -- Weiter-/
   *  Zurück-/Seitenzahlen rendern als Link statt als reiner Klick-Button. Funktioniert ohne
   *  JavaScript und ist für Suchmaschinen crawlbar; nötig für öffentliche, SSR-fähige Listen.
   *  NUR aus Client-Komponenten übergeben -- eine Funktion ist nicht über die Server/Client-
   *  Grenze serialisierbar (siehe `hrefPattern` für Server-Komponenten). */
  hrefForPage?: (page: number) => string
  /** Link-Modus für Server-Komponenten: URL-Muster mit `{page}`-Platzhalter als reiner
   *  Datenwert statt einer Funktion -- über die Server/Client-Grenze serialisierbar (eine
   *  `async`-Serverkomponente darf keine Funktion als Prop an diesen `'use client'`-Baustein
   *  reichen, sonst bricht Next.js mit "Functions cannot be passed directly to Client
   *  Components"). Hat Vorrang vor `hrefForPage`, falls beide gesetzt sind. */
  hrefPattern?: string
  /** Link-Komponente für clientseitige Navigation im Link-Modus (Standard: natives `<a>`),
   *  z. B. `next/link`s `Link`. */
  linkComponent?: ElementType
  className?: string
}

interface LoadMoreModeProps {
  /** Lädt zusätzliche Einträge nach, statt zu einer festen Seitenzahl zu springen -- für Listen,
   *  die cursor-/batch-weise nachladen und bereits sichtbare Einträge dabei behalten (anders als
   *  der Seiten-Modus, der eine ganze Seite durch eine andere ersetzt). */
  mode: 'loadMore'
  /** Anzahl aktuell sichtbarer Einträge, für die Fortschrittsanzeige "X von Y angezeigt". */
  shownCount: number
  totalCount: number
  canShowMore: boolean
  canShowLess: boolean
  onShowMore: () => void
  onShowLess: () => void
  /** Beschriftung des "Mehr"-Buttons, z. B. "Weitere 9 Beiträge anzeigen" -- vom Aufrufer gebaut,
   *  da die Mengenangabe je Domäne unterschiedlich benannt wird (Beiträge, Bilder, ...). */
  showMoreLabel: string
  /** Standard: "Weniger anzeigen". */
  showLessLabel?: string
  /** Deaktiviert den "Mehr"-Button während eine weitere Seite lädt. */
  loading?: boolean
  className?: string
}

export type PaginationProps = PagesModeProps | LoadMoreModeProps

/**
 * Seitennavigation für lange Listen: Weiter/Zurück plus Seitenfenster mit Lückenanzeige
 * (`computePaginationItems`), wahlweise als Klick-Modus (`onPageChange`) oder Link-Modus
 * (`hrefForPage`) -- einziger Baustein für beide Fälle, damit öffentliche Seiten (echte Links)
 * und Admin-Tabellen (eigener Fetch-State) nicht länger zwei eigenständige Implementierungen
 * pflegen. `mode="loadMore"` deckt denselben Bedarf für cursor-/batch-basiertes Nachladen ab
 * (Fortschrittstext + Weniger-/Mehr-Button statt Seiten-Sprung), damit auch diese Listen keine
 * eigene Fortschritts-/Button-Reihe mehr pflegen müssen.
 */
export function Pagination(props: PaginationProps) {
  if (props.mode === 'loadMore') {
    return <LoadMorePagination {...props} />
  }
  return <PagesPagination {...props} />
}

function LoadMorePagination({
  shownCount,
  totalCount,
  canShowMore,
  canShowLess,
  onShowMore,
  onShowLess,
  showMoreLabel,
  showLessLabel = 'Weniger anzeigen',
  loading = false,
  className,
}: LoadMoreModeProps) {
  if (!canShowMore && !canShowLess) {
    return null
  }

  return (
    <div className={classNames(styles.loadMore, className)}>
      {canShowMore ? (
        <Text variant="small">{`${shownCount} von ${totalCount} angezeigt`}</Text>
      ) : null}
      <div className={styles.loadMoreActions}>
        {canShowLess ? (
          <Button type="button" variant="ghost" size="sm" onClick={onShowLess}>
            {showLessLabel}
          </Button>
        ) : null}
        {canShowMore ? (
          <Button type="button" variant="secondary" size="sm" onClick={onShowMore} disabled={loading}>
            {showMoreLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function PagesPagination({ currentPage, totalPages, onPageChange, hrefForPage, hrefPattern, linkComponent, className }: PagesModeProps) {
  const items = useMemo(() => computePaginationItems(currentPage, totalPages), [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  function navProps(page: number) {
    if (hrefPattern) {
      return { href: hrefPattern.replace('{page}', String(page)), as: linkComponent }
    }
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
