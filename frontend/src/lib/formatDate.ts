/**
 * Zwei zentrale formatDate-Helfer, je einer pro Verhaltens-Gruppe (F-07/D-02). Die beiden
 * Fallback-Philosophien bleiben bewusst unterschiedlich und werden NICHT vereinheitlicht.
 */

/**
 * Cluster A: try/catch-Fallback auf den ursprünglichen iso-String bei Exception. Byte-identische
 * Übernahme aus den vormals 4 getrennten Kopien (u. a. UserClaimsTab.tsx, ClaimsClient.tsx,
 * ReviewQueue.tsx, ContributionsReviewSection.tsx).
 */
export function formatDateDeOrIso(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/**
 * Cluster B: Leerstring-Fallback bei falsy Wert oder nicht parsbarem Datum. Byte-identische
 * Übernahme aus den vormals 3 getrennten Kopien (GroupMediaReviewGrid.tsx,
 * GroupMediaReviewDetailDrawer.tsx, useGroupMediaReviewFilters.ts), entstanden in Phase 180.
 */
export function formatDateDeOrEmpty(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
