'use client'

import { Badge, Button, Card, LoadingState, SectionHeader } from '@/components/ui'
import type { SearchResultItem } from '@/types/search'

import styles from './SuggestionList.module.css'

/** Trefferzahl-Copy mit Singular-Sonderfall (UI-SPEC Copywriting Contract). */
function trefferLabel(count: number): string {
  return count === 1 ? '1 Treffer' : `${count} Treffer`
}

interface SuggestionListProps {
  /** id des Listbox-Containers (Combobox `aria-controls`). */
  id: string
  /** Aktueller Suchbegriff (für die „Alle Treffer anzeigen"-Zeile). */
  query: string
  animeItems: SearchResultItem[]
  fansubItems: SearchResultItem[]
  animeTotal: number
  fansubTotal: number
  isLoading: boolean
  /** Flacher Index der aktuell per Tastatur markierten Option (-1 = keine). */
  activeIndex: number
  /** Bildet einen flachen Index auf die stabile Options-id ab (aria-activedescendant). */
  optionId: (index: number) => string
  /** Flacher Index der „Alle Treffer anzeigen"-Zeile (letzte Option). */
  showAllIndex: number
  /** Aktiviert die Option am flachen Index (Navigation zu Detailseite bzw. Vollsuche). */
  onSelect: (index: number) => void
}

/** Eine einzelne Vorschlagszeile als `role="option"` (kein natives Markup — Div-Option). */
function SuggestionRow({
  item,
  index,
  optionId,
  active,
  onSelect,
}: {
  item: SearchResultItem
  index: number
  optionId: (index: number) => string
  active: boolean
  onSelect: (index: number) => void
}) {
  return (
    <div
      role="option"
      id={optionId(index)}
      aria-selected={active}
      className={active ? `${styles.row} ${styles.rowActive}` : styles.row}
      // Klick soll das Feld nicht vorher unfokussieren (Dropdown bliebe sonst nicht offen).
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(index)}
    >
      <span className={styles.rowTitle}>{item.title}</span>
      {item.subtitle ? <span className={styles.rowMeta}>{item.subtitle}</span> : null}
    </div>
  )
}

/**
 * Gruppierte Vorschlagsliste (Anime / Fansubgruppen) als Combobox-`listbox`.
 *
 * Jede Gruppe zeigt ihren `SectionHeader` mit Trefferzahl-`Badge`, darunter die
 * (serverseitig begrenzten) Treffer als `role="option"`-Zeilen. Eine abschließende
 * „Alle Treffer anzeigen"-Zeile (`Button variant="ghost"`) führt zur Vollsuche. Während
 * der Suggestions-Abfrage erscheint ein `LoadingState` (kein Layout-Shift der Gruppen).
 */
export function SuggestionList({
  id,
  query,
  animeItems,
  fansubItems,
  animeTotal,
  fansubTotal,
  isLoading,
  activeIndex,
  optionId,
  showAllIndex,
  onSelect,
}: SuggestionListProps) {
  const hasAnime = animeItems.length > 0
  const hasFansub = fansubItems.length > 0
  const isEmpty = !hasAnime && !hasFansub
  // Fansub-Optionen folgen im flachen Index direkt hinter den Anime-Optionen.
  const fansubOffset = animeItems.length

  return (
    <Card variant="elevated" className={styles.dropdown}>
      <div id={id} role="listbox" aria-label="Suchvorschläge" className={styles.listbox}>
        {isLoading && isEmpty ? (
          <LoadingState
            title="Suche läuft"
            description="Passende Anime und Fansubgruppen werden geladen."
          />
        ) : null}

        {hasAnime ? (
          <div className={styles.group}>
            <SectionHeader
              title="Anime"
              actions={<Badge variant="neutral">{trefferLabel(animeTotal)}</Badge>}
            />
            {animeItems.map((item, i) => (
              <SuggestionRow
                key={`anime-${item.id}`}
                item={item}
                index={i}
                optionId={optionId}
                active={activeIndex === i}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : null}

        {hasFansub ? (
          <div className={styles.group}>
            <SectionHeader
              title="Fansubgruppen"
              actions={<Badge variant="neutral">{trefferLabel(fansubTotal)}</Badge>}
            />
            {fansubItems.map((item, i) => (
              <SuggestionRow
                key={`fansub-${item.id}`}
                item={item}
                index={fansubOffset + i}
                optionId={optionId}
                active={activeIndex === fansubOffset + i}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : null}

        <Button
          variant="ghost"
          fullWidth
          role="option"
          id={optionId(showAllIndex)}
          aria-selected={activeIndex === showAllIndex}
          className={styles.allRow}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(showAllIndex)}
        >
          {`Alle Treffer für „${query}" anzeigen`}
        </Button>
      </div>
    </Card>
  )
}
