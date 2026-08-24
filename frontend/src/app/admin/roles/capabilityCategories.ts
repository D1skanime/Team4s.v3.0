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

// Deliberate Reihenfolge der 7 realen Kategorien (138-RESEARCH.md Pitfall 2, Plan 138-13);
// unbekannte Kategorien fallen alphabetisch ans Ende (siehe sortCategories unten). Einzige
// kanonische Kopie -- RoleCapabilityDetail.tsx und RolesClient.tsx (Quick 260824-ek3) importieren
// beide sortCategories von hier statt eine zweite, potenziell divergente Sortierlogik zu pflegen.
const CATEGORY_ORDER = [
  'gruppe',
  'gruppenmedien',
  'gruppenseite',
  'projekt',
  'rechteverwaltung',
  'release',
  'review',
]

/**
 * Sortiert Kategorien deterministisch: CATEGORY_ORDER zuerst, unbekannte Kategorien
 * alphabetisch ans Ende.
 */
export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
