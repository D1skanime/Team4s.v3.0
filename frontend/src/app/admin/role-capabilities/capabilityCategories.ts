/**
 * Display-Mapping: technische action_definitions.category → fachlicher Anzeigename (D-11).
 *
 * Die drei technischen Kategorien in der DB (Migration 0108) sind:
 *   "gruppe" | "projekt" | "release"
 *
 * Keine Migration nötig — rein frontEnd-seitiges Präsentations-Mapping (D-11/Pattern 5).
 */

const CATEGORY_LABEL_MAP: Record<string, string> = {
  gruppe: 'Gruppe',
  projekt: 'Projekt',
  release: 'Release',
}

/**
 * Gibt den deutschen Anzeigenamen für eine technische Kategorie zurück.
 * Unbekannte Kategorien erhalten einen robusten Fallback (kein Crash).
 */
export function categoryDisplayLabel(category: string): string {
  return CATEGORY_LABEL_MAP[category] ?? capitalizeFirst(category)
}

function capitalizeFirst(s: string): string {
  if (!s) return 'Sonstige'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
