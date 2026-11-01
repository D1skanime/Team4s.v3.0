/**
 * Berechnet das sichtbare Seitenfenster für eine Pagination-Leiste: `currentPage - 2` bis
 * `currentPage + 2`, gekappt auf den gültigen Bereich `[1, totalPages]`. Einziger Helfer für die
 * Fensterlogik der einen `@/components/ui` Pagination (Klick- und Link-Modus), inklusive des
 * Grenzfalls `currentPage > totalPages`.
 */
export function computePageWindow(currentPage: number, totalPages: number): number[] {
  const from = Math.max(1, currentPage - 2)
  const to = Math.min(totalPages, currentPage + 2)
  const values: number[] = []
  for (let page = from; page <= to; page += 1) {
    values.push(page)
  }
  return values
}

/** Seitenzahl oder eine Lücke zwischen zwei nicht benachbarten Seitenzahlen. */
export type PaginationItem = number | 'ellipsis'

/**
 * Erweitert `computePageWindow` um die erste und letzte Seite, sobald sie außerhalb des
 * Fensters liegen, und markiert eine echte Lücke (mehr als eine ausgelassene Seite) mit
 * `'ellipsis'` -- einziger Helfer für die Seiten-/Lücken-Reihe der zusammengeführten
 * `@/components/ui` Pagination (vorher gab es dafür zwei eigenständige, nur fensterbasierte
 * Implementierungen ohne Erste-/Letzte-Seite und ohne Lückenanzeige). Wird genau EINE Seite
 * ausgelassen, wird sie direkt angezeigt statt durch eine Lücke für eine einzelne Zahl zu
 * ersetzen.
 */
export function computePaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const window = computePageWindow(currentPage, totalPages)
  if (window.length === 0) return []

  const items: PaginationItem[] = []
  const first = window[0]
  const last = window[window.length - 1]

  if (first > 3) {
    items.push(1, 'ellipsis')
  } else {
    for (let page = 1; page < first; page += 1) {
      items.push(page)
    }
  }

  items.push(...window)

  if (last < totalPages - 2) {
    items.push('ellipsis', totalPages)
  } else {
    for (let page = last + 1; page <= totalPages; page += 1) {
      items.push(page)
    }
  }

  return items
}
