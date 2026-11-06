export interface ResolvedArchiveParams {
  rolle?: string
  gruppe?: string
  von?: string
  bis?: string
  page?: string
}

/** Baut die Archiv-URL mit allen aktiven Filtern und einer neuen Seite. `page` akzeptiert neben
 *  einer echten Seitenzahl auch den literalen Platzhalter-String `'{page}'`, damit die
 *  Server-Komponente einmalig ein `hrefPattern` für `Pagination` bauen kann, statt eine nicht
 *  über die Server/Client-Grenze serialisierbare Funktion zu übergeben. */
export function buildArchivUrl(params: ResolvedArchiveParams, page: number | string): string {
  const q = new URLSearchParams()
  if (params.rolle) q.set('rolle', params.rolle)
  if (params.gruppe) q.set('gruppe', params.gruppe)
  if (params.von) q.set('von', params.von)
  if (params.bis) q.set('bis', params.bis)
  q.set('page', String(page))
  const qs = q.toString()
  // URLSearchParams kodiert geschweifte Klammern (%7B/%7D) -- beim Platzhalter-Aufruf muss der
  // literale `{page}`-Text erhalten bleiben, damit `Pagination` ihn pro Seitenzahl ersetzen kann.
  // Der Ersatz ist zwingend auf den Query-Schlüssel `page=` verankert (nicht ein blinder erster
  // Treffer): `rolle`/`gruppe`/`von`/`bis` sind Nutzereingaben und könnten zufällig denselben
  // codierten Wert `%7Bpage%7D` tragen (z. B. `/archiv?rolle=%7Bpage%7D`) -- ohne Verankerung
  // würde dann der falsche Query-Parameter entschlüsselt und die Seitennavigation dauerhaft
  // falsch verlinkt (die echte Seitenzahl ließe sich nie mehr ändern).
  const href = `/archiv${qs ? `?${qs}` : ''}`
  return page === '{page}' ? href.replace(/([?&]page=)%7Bpage%7D(?=&|$)/, '$1{page}') : href
}
