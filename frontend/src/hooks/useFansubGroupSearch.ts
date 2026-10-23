'use client'

import { useEffect, useState } from 'react'

import { ApiError, getFansubList } from '@/lib/api'
import type { FansubGroup } from '@/types/fansub'

const SEARCH_DEBOUNCE_MS = 180
const EMPTY_RESULT_MESSAGE = 'Keine passende Gruppe oder kein passender Alias gefunden.'

/**
 * Durchsucht Fansub-Gruppen debounced über Name und Alias (`getFansubList`) und blendet
 * Treffer aus, deren ID in der vom Aufrufer übergebenen `excludeIds`-Liste steht (z. B.
 * bereits ausgewählte Gruppen). Der Hook besitzt ausschließlich die Such-Interaktion
 * (Eingabetext, Treffer, Ladezustand, Meldungstext) — welche Gruppen als "ausgewählt"
 * gelten und was eine Auswahl fachlich bedeutet, entscheidet und verwaltet allein der
 * Aufrufer. So lässt sich dieselbe Debounce-/Filter-Logik für mehrere, strukturell
 * unabhängige Auswahl-Flächen wiederverwenden (z. B. Partnergruppen-Auswahl im
 * Release-Editor und künftig die Zielgruppen-Auswahl im Hinweis-Formular), ohne eine
 * zweite Kopie der Suche zu pflegen.
 */
export function useFansubGroupSearch({ excludeIds }: { excludeIds: number[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FansubGroup[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 1) {
      // Setter-Funktionsform statt direkter Werte: verhindert einen Render-Zyklus (und damit
      // bei instabiler `excludeIds`-Referenz eine Render-Schleife), wenn der Zustand ohnehin
      // schon "leer" ist — React vergleicht neue Array-/Objekt-Literale nie als gleich zum
      // Vorzustand, auch wenn der Inhalt identisch ist.
      setResults((current) => (current.length === 0 ? current : []))
      setMessage((current) => (current === null ? current : null))
      setIsSearching((current) => (current ? false : current))
      return
    }

    let cancelled = false
    const timeoutID = window.setTimeout(async () => {
      setIsSearching(true)
      setMessage(null)
      try {
        const response = await getFansubList({ q: trimmedQuery, page: 1, per_page: 10 })
        if (cancelled) return

        const excludeSet = new Set(excludeIds)
        const nextResults = response.data.filter((group) => !excludeSet.has(group.id))
        setResults(nextResults)
        if (nextResults.length === 0) setMessage(EMPTY_RESULT_MESSAGE)
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof ApiError ? `(${error.status}) ${error.message}` : 'Anfrage fehlgeschlagen.')
        }
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutID)
    }
    // excludeIds muss der Aufrufer referenzstabil halten (z. B. per useMemo), sonst läuft die
    // Debounce-Suche bei jedem Render des Aufrufers neu an statt nur bei echten Änderungen —
    // exakt wie beim Vorbild, dessen Abhängigkeit die stabile `selectedGroups`-State-Referenz war.
  }, [query, excludeIds])

  // `addGroup` räumt nur die Such-Interaktion auf (Eingabe/Treffer/Meldung leeren), nachdem
  // der Aufrufer eine Gruppe übernommen hat. Es gibt bewusst KEIN `removeGroup` auf diesem
  // Hook: Entfernen einer bereits getroffenen Auswahl betrifft ausschließlich die vom
  // Aufrufer gehaltene Auswahl-Liste, die Suche selbst hat dabei nichts aufzuräumen.
  function addGroup(_group: FansubGroup) {
    setQuery('')
    setResults([])
    setMessage(null)
  }

  return { query, setQuery, results, isSearching, message, addGroup }
}
