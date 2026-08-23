/**
 * Display-Mapping: technische action_definitions.category → fachlicher Anzeigename (D-11).
 *
 * Die vollständigen sieben technischen Kategorien in der DB (live gegen team4s_v2 bestätigt,
 * Plan 138-13, 138-RESEARCH.md Pitfall 2) sind:
 *   "gruppe" | "gruppenmedien" | "gruppenseite" | "projekt" | "rechteverwaltung" | "release" | "review"
 * Der ursprüngliche Drei-Kategorien-Stand (94-06) deckte nur "gruppe"/"projekt"/"release" ab und
 * ließ die übrigen vier auf den `capitalizeFirst`-Fallback fallen -- diese sind jetzt deliberate
 * deutsche Anzeigenamen statt eines rein technischen Kapitalisierungs-Fallbacks.
 *
 * Keine Migration nötig — rein frontEnd-seitiges Präsentations-Mapping (D-11/Pattern 5).
 */

const CATEGORY_LABEL_MAP: Record<string, string> = {
  gruppe: 'Gruppe',
  gruppenmedien: 'Gruppenmedien',
  gruppenseite: 'Gruppenseite',
  projekt: 'Projekt',
  rechteverwaltung: 'Rechteverwaltung',
  release: 'Release',
  review: 'Review',
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
