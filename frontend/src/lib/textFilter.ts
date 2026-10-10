// D-15: umlaut-tolerante Textsuche. Accent-strip-only (Option A) — keine ae/oe/ue/ss-
// Digraph-Expansion; 'ß' bleibt nach NFD-Normalisierung unveraendert (hat keine
// kanonische Dekomposition) und matcht daher nie 'ss'.
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(
  haystacks: Array<string | null | undefined>,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query.trim())
  if (normalizedQuery.length === 0) return true
  return haystacks
    .filter(Boolean)
    .some((value) => normalizeSearchText(String(value)).includes(normalizedQuery))
}
