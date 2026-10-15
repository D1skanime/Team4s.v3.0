/**
 * Berechnet das sichtbare Seitenfenster für eine Pagination-Leiste: `currentPage - 2` bis
 * `currentPage + 2`, gekappt auf den gültigen Bereich `[1, totalPages]`.
 *
 * Einziger Helfer für die zuvor byte-identische Fensterlogik aus
 * `frontend/src/components/ui/Pagination.tsx` und `frontend/src/components/anime/Pagination.tsx`
 * (F-07/D-02). Verhalten unverändert zu beiden Vorgänger-Implementierungen, inklusive des
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
