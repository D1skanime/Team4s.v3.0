'use client'

import { useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SectionHeader,
  Tabs,
  getErrorStateCopy,
} from '@/components/ui'
import type { TabItem } from '@/components/ui'
import type { SearchResultItem, SearchType } from '@/types/search'

import { MIN_QUERY_LENGTH, useDebouncedSearch } from './useDebouncedSearch'
import styles from './SearchResults.module.css'

/** Trefferzahl-Copy mit Singular-Sonderfall (UI-SPEC Copywriting Contract). */
function trefferLabel(count: number): string {
  return count === 1 ? '1 Treffer' : `${count} Treffer`
}

/** Detailseiten-URL eines Treffers (Anime → /anime/:id, Fansubgruppe → /fansubs/:slug). */
function resultHref(item: SearchResultItem): string {
  return item.type === 'anime' ? `/anime/${item.id}` : `/fansubs/${item.slug}`
}

/** Meta-Zeile eines Treffers (Anime: Jahr/Typ; Fansubgruppe: Untertitel bzw. Slug). */
function resultMeta(item: SearchResultItem): string {
  if (item.type === 'anime') {
    return [item.year ?? undefined, item.format ?? undefined]
      .filter((value) => value !== undefined && value !== null && `${value}`.length > 0)
      .join(' · ')
  }
  return item.subtitle ?? item.slug
}

/** Eine klickbare Ergebniskarte (`Card` in einem Link zur Detailseite). */
function ResultCard({ item }: { item: SearchResultItem }) {
  const meta = resultMeta(item)
  return (
    <a href={resultHref(item)} className={styles.resultCard}>
      <Card variant="interactive" className={styles.resultCardInner}>
        <span className={styles.resultTitle}>{item.title}</span>
        {meta ? <span className={styles.resultMeta}>{meta}</span> : null}
      </Card>
    </a>
  )
}

/** Karten-Raster einer Entität. */
function ResultGrid({ items }: { items: SearchResultItem[] }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <ResultCard key={`${item.type}-${item.id}`} item={item} />
      ))}
    </div>
  )
}

/**
 * Panel-Wrapper, der beim Aktivwerden (Mount durch die Tabs-Primitive) den zugehörigen
 * `type` in den URL-Zustand schreibt — der Baustein der URL-gebundenen Tab-Strategie.
 * Da die `@/components/ui` `Tabs`-Primitive unkontrolliert ist (kein `onChange`), wird nur
 * das aktive Panel gemountet; dessen Effekt spiegelt die Auswahl zurück in die URL. In
 * Kombination mit `key`-Remount + `defaultTabId` (siehe unten) überlebt der Tab den Reload.
 */
function ResultTabPanel({
  tabType,
  currentType,
  onActivate,
  children,
}: {
  tabType: SearchType
  currentType: SearchType
  onActivate: (type: SearchType) => void
  children: ReactNode
}) {
  useEffect(() => {
    // Nur beim echten Wechsel schreiben — der initiale Mount des aktiven Tabs darf den
    // aus der URL wiederhergestellten Seitenzustand (page) nicht zurücksetzen.
    if (tabType !== currentType) onActivate(tabType)
  }, [tabType, currentType, onActivate])

  return (
    <div className={styles.panel} aria-live="polite">
      {children}
    </div>
  )
}

/**
 * Ergebnisfläche der Suche: URL-gebundene Tabs (Alle/Anime/Fansubgruppen) mit
 * Trefferzahl-Badges, Ergebniskarten, Pagination und den Lade-/Empty-/Fehlerzuständen.
 *
 * Nutzt `useDebouncedSearch({ role: 'results' })` — eine eigene Hook-Instanz, die sich den
 * Zustand über die URL mit SearchField/SearchFilters teilt und nur die Ergebnissuche feuert
 * (kein doppelter Request). Der aktive Tab kommt aus dem URL-`type`; ein Tab-Wechsel schreibt
 * `type` zurück in die URL, und `key={type}` remountet `Tabs`, sodass `defaultTabId` den
 * URL-Wert übernimmt (Reload-fest, teilbar).
 */
export function SearchResults() {
  const { q, type, page, results, meta, isLoading, error, setType, setPage } =
    useDebouncedSearch({ role: 'results' })

  const trimmedQuery = q.trim()

  // Erneut-Versuchen erzeugt einen neuen Zustand (gleiche Seite) und stößt so den Refetch an.
  const retry = useCallback(() => setPage(page), [setPage, page])

  // Vor der Mindestlänge zeigt die Ergebnisfläche denselben Initial-Leerzustand wie die Shell.
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return (
      <div className={styles.stateSlot}>
        <EmptyState
          title="Wonach suchst du?"
          description="Gib einen Anime-Titel oder eine Fansubgruppe ein, um loszulegen."
        />
      </div>
    )
  }

  const emptyState = (
    <EmptyState
      title={`Keine Treffer für „${trimmedQuery}"`}
      description="Prüfe die Schreibweise oder versuche einen kürzeren bzw. alternativen Begriff."
    />
  )

  /** Panel-Inhalt für einen Tab (Zustände global, Karten je Entität). */
  function panelContent(tabType: SearchType): ReactNode {
    if (error) {
      const copy = getErrorStateCopy(error, {
        defaultTitle: 'Suche nicht verfügbar',
        defaultDescription:
          'Die Suche konnte gerade nicht ausgeführt werden. Bitte versuche es in einem Moment erneut.',
      })
      return (
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            <Button variant="secondary" onClick={retry}>
              Erneut versuchen
            </Button>
          }
        />
      )
    }

    if (isLoading && !results) {
      return (
        <LoadingState
          title="Suche läuft"
          description="Passende Anime und Fansubgruppen werden geladen."
        />
      )
    }

    if (!results) return null

    const animeItems = results.anime.items
    const fansubItems = results.fansub.items

    if (tabType === 'anime') {
      return animeItems.length ? <ResultGrid items={animeItems} /> : emptyState
    }
    if (tabType === 'fansub') {
      return fansubItems.length ? <ResultGrid items={fansubItems} /> : emptyState
    }

    if (animeItems.length + fansubItems.length === 0) return emptyState
    return (
      <>
        {animeItems.length ? (
          <section className={styles.entityGroup}>
            <SectionHeader
              title="Anime"
              actions={<Badge variant="neutral">{trefferLabel(results.anime.total)}</Badge>}
            />
            <ResultGrid items={animeItems} />
          </section>
        ) : null}
        {fansubItems.length ? (
          <section className={styles.entityGroup}>
            <SectionHeader
              title="Fansubgruppen"
              actions={<Badge variant="neutral">{trefferLabel(results.fansub.total)}</Badge>}
            />
            <ResultGrid items={fansubItems} />
          </section>
        ) : null}
      </>
    )
  }

  /** Voller Panel-Body inkl. Pagination und URL-Rückschreibung bei Tab-Aktivierung. */
  function panelBody(tabType: SearchType): ReactNode {
    return (
      <ResultTabPanel tabType={tabType} currentType={type} onActivate={setType}>
        {panelContent(tabType)}
        {results && !error ? (
          <Pagination
            currentPage={page}
            totalPages={meta?.total_pages ?? 1}
            onPageChange={setPage}
          />
        ) : null}
      </ResultTabPanel>
    )
  }

  // Badges nur, wenn das Backend Trefferzahlen geliefert hat (D-06).
  const alleBadge = results ? trefferLabel(results.anime.total + results.fansub.total) : undefined
  const animeBadge = results ? trefferLabel(results.anime.total) : undefined
  const fansubBadge = results ? trefferLabel(results.fansub.total) : undefined

  const tabs: TabItem[] = [
    {
      id: 'alle',
      label: 'Alle',
      badge: alleBadge ? <Badge variant="neutral">{alleBadge}</Badge> : undefined,
      content: panelBody('alle'),
    },
    {
      id: 'anime',
      label: 'Anime',
      badge: animeBadge ? <Badge variant="neutral">{animeBadge}</Badge> : undefined,
      content: panelBody('anime'),
    },
    {
      id: 'fansub',
      label: 'Fansubgruppen',
      badge: fansubBadge ? <Badge variant="neutral">{fansubBadge}</Badge> : undefined,
      content: panelBody('fansub'),
    },
  ]

  return (
    <div className={styles.results}>
      {/* key-Remount: bei type-Wechsel übernimmt defaultTabId den aktuellen URL-Wert. */}
      <Tabs key={type} defaultTabId={type} items={tabs} />
    </div>
  )
}
