'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

import { Input } from '@/components/ui'
import type { SearchResultItem } from '@/types/search'

import { SuggestionList } from './SuggestionList'
import { MIN_QUERY_LENGTH, useDebouncedSearch } from './useDebouncedSearch'
import styles from './SearchField.module.css'

/** Max. Vorschläge je Gruppe im Dropdown (Server begrenzt zusätzlich, D-09). */
const SUGGESTION_LIMIT_PER_GROUP = 5

/** Detailseiten-URL eines Vorschlags (Anime → /anime/:id, Fansubgruppe → /fansubs/:slug). */
export function suggestionHref(item: SearchResultItem): string {
  return item.type === 'anime' ? `/anime/${item.id}` : `/fansubs/${item.slug}`
}

/**
 * Zentrales Suchfeld (`@/components/ui` `Input`) — visueller Anker der Suchseite.
 *
 * Kapselt Search-as-you-type (≥ 2 Zeichen, 250 ms Debounce über `useDebouncedSearch`)
 * und die Combobox-Tastaturbedienung (↓/↑ navigiert Vorschläge, Enter aktiviert den
 * markierten Vorschlag bzw. löst die Vollsuche aus, Esc schließt das Dropdown mit
 * Fokusrückgabe). Rendert die gruppierte `SuggestionList` als `role="listbox"` und
 * verweist per `aria-activedescendant` auf die aktuell markierte Option.
 */
export function SearchField() {
  const router = useRouter()
  const { q, suggestions, isLoading, setQuery } = useDebouncedSearch()

  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  // Verhindert, dass die Fokusrückgabe nach Esc das gerade geschlossene Dropdown sofort
  // über onFocus wieder öffnet.
  const suppressFocusOpenRef = useRef(false)
  const listboxId = useId()
  const optionBaseId = useId()

  const optionId = useCallback((index: number) => `${optionBaseId}-opt-${index}`, [optionBaseId])

  // Serverseitig gelieferte Vorschläge, zusätzlich clientseitig je Gruppe begrenzt.
  const animeItems = useMemo(
    () => (suggestions?.anime.items ?? []).slice(0, SUGGESTION_LIMIT_PER_GROUP),
    [suggestions],
  )
  const fansubItems = useMemo(
    () => (suggestions?.fansub.items ?? []).slice(0, SUGGESTION_LIMIT_PER_GROUP),
    [suggestions],
  )
  // Flache Navigationsreihenfolge: Anime, dann Fansubgruppen — Indizes stimmen mit der Liste überein.
  const flatItems = useMemo(() => [...animeItems, ...fansubItems], [animeItems, fansubItems])

  const trimmed = q.trim()
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH
  const dropdownOpen = isOpen && hasQuery
  // Die "Alle Treffer anzeigen"-Zeile ist die letzte navigierbare Option.
  const showAllIndex = flatItems.length
  const optionCount = hasQuery ? flatItems.length + 1 : 0

  const goToFullSearch = useCallback(() => {
    setIsOpen(false)
    setActiveIndex(-1)
    router.push(`/suche?q=${encodeURIComponent(trimmed)}`)
  }, [router, trimmed])

  const activateOption = useCallback(
    (index: number) => {
      if (index < 0 || index === showAllIndex) {
        goToFullSearch()
        return
      }
      const item = flatItems[index]
      if (!item) {
        goToFullSearch()
        return
      }
      setIsOpen(false)
      setActiveIndex(-1)
      router.push(suggestionHref(item))
    },
    [flatItems, goToFullSearch, router, showAllIndex],
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
      setIsOpen(true)
      setActiveIndex(-1)
    },
    [setQuery],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          if (optionCount === 0) return
          event.preventDefault()
          setIsOpen(true)
          setActiveIndex((prev) => (prev + 1) % optionCount)
          break
        case 'ArrowUp':
          if (optionCount === 0) return
          event.preventDefault()
          setIsOpen(true)
          setActiveIndex((prev) => (prev - 1 + optionCount) % optionCount)
          break
        case 'Enter':
          if (!hasQuery) return
          event.preventDefault()
          activateOption(activeIndex)
          break
        case 'Escape':
          if (!dropdownOpen) return
          event.preventDefault()
          suppressFocusOpenRef.current = true
          setIsOpen(false)
          setActiveIndex(-1)
          inputRef.current?.focus()
          break
        default:
          break
      }
    },
    [activateOption, activeIndex, dropdownOpen, hasQuery, optionCount],
  )

  const activeDescendant = dropdownOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined

  return (
    <div className={styles.field}>
      <span className={styles.icon} aria-hidden="true">
        <Search size={20} strokeWidth={2} />
      </span>
      <Input
        ref={inputRef}
        type="search"
        className={styles.input}
        value={q}
        onChange={handleChange}
        onFocus={() => {
          if (suppressFocusOpenRef.current) {
            suppressFocusOpenRef.current = false
            return
          }
          if (hasQuery) setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Anime oder Fansubgruppe suchen …"
        aria-label="Suchbegriff eingeben"
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        autoComplete="off"
      />
      {dropdownOpen ? (
        <SuggestionList
          id={listboxId}
          query={trimmed}
          animeItems={animeItems}
          fansubItems={fansubItems}
          animeTotal={suggestions?.anime.total ?? animeItems.length}
          fansubTotal={suggestions?.fansub.total ?? fansubItems.length}
          isLoading={isLoading}
          activeIndex={activeIndex}
          optionId={optionId}
          showAllIndex={showAllIndex}
          onSelect={activateOption}
        />
      ) : null}
    </div>
  )
}
