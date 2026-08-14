const STORED_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Kanonische Member-Slug-Normalisierung – syntax-only, unabhängig von Identität,
 * Sichtbarkeit, Auth, API oder Datenbank. Nimmt den bereits URL-dekodierten
 * Pfad-Slug und liefert die kanonische Form (getrimmt + lowercased), oder null,
 * wenn der Slug nicht sicher kanonisierbar ist (leer, zu lang, rein numerisch,
 * oder mit nicht-kanonischen/unsicheren Zeichen). Bei null darf NICHT umgeleitet
 * werden – die Route fällt dann auf die neutrale notFound-Ausgabe zurück.
 */
export function canonicalMemberSlug(decodedSlug: string): string | null {
  const canonical = decodedSlug.trim().toLowerCase()

  if (
    canonical.length === 0
    || canonical.length > 512
    || /^[0-9]+$/.test(canonical)
    || !STORED_SLUG.test(canonical)
  ) {
    return null
  }

  return canonical
}
