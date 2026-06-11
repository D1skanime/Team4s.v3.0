/**
 * Tab-Routing-Hilfsdatei — wird von page.tsx importiert und von page.test.tsx getestet.
 *
 * Zweck: parseMainTab und MAIN_TABS isoliert exportieren, damit Unit-Tests ohne
 * den gesamten page.tsx-Kontext (next/navigation, React, API-Abhängigkeiten) auskommen.
 */

export type MainTab =
  | 'basic'
  | 'media'
  | 'links'
  | 'collaboration'
  | 'releases'
  | 'notes'
  | 'mitglieder'
  | 'claims'
  | 'vorschlaege'
  | 'readiness'

export const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: 'basic', label: 'Grunddaten' },
  { key: 'notes', label: 'Gruppengeschichte' },
  { key: 'media', label: 'Medien' },
  { key: 'collaboration', label: 'Fansub Members' },
  { key: 'vorschlaege', label: 'Vorschläge' },
  { key: 'releases', label: 'Anime & Veröffentlichungen' },
  { key: 'readiness', label: 'Veröffentlichung' },
]

/**
 * Parst den ?tab=<value>-Query-Parameter in einen gültigen MainTab-Wert.
 * Legacy-Redirects:
 *   - "rollen" | "mitglieder" | "claims" → "collaboration"
 *   - "anime-projekte" → "releases"  (D-13: Tab entfernt, Legacy-URL weiterleiten)
 * Unbekannte Werte → "basic"
 */
export function parseMainTab(value: string | null): MainTab {
  if (value === 'rollen' || value === 'mitglieder' || value === 'claims') return 'collaboration'
  if (value === 'anime-projekte') return 'releases' // D-13: Legacy-Redirect
  return MAIN_TABS.some((tab) => tab.key === value) ? (value as MainTab) : 'basic'
}
