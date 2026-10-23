import type { FansubGroupHintStatus } from '@/types/fansub-group-hints'

// 191-23/D-18: EINZIGE Quelle der fansub_group_hints-Status-zu-Copy/Badge-Variante-Zuordnung
// -- bis Plan 191-23 lokal in FansubGroupHintsAdminClient.tsx (der plattform-weiten
// "Hinweise ohne Leitung"-Liste, D-11) definiert. Die member-seitige Sicht auf die eigenen
// gesendeten Hinweise (MyProposalsSection.tsx, /me/contributions) braucht dieselbe
// Status-Darstellung fuer dieselbe Datenquelle -- ohne diese Extraktion wuerde die neue
// Verwendung entweder ueber die app/admin/...-Routengrenze importieren oder (schlimmer) eine
// zweite, potenziell abweichende Kopie der Zuordnung erfinden. Dieselbe "einzige Quelle statt
// Kopie"-Linie wie contributionsEligibility.ts (Plan 191-17).

/** Deutsches Anzeige-Label je Hinweis-Status (offen/bestaetigt/abgelehnt). */
export function hintStatusLabel(status: FansubGroupHintStatus): string {
  switch (status) {
    case 'open':
      return 'Offen'
    case 'acknowledged':
      return 'Bestätigt'
    case 'rejected':
      return 'Abgelehnt'
    default:
      return status
  }
}

/** Badge-Variante je Hinweis-Status. */
export function hintStatusVariant(status: FansubGroupHintStatus): 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'open':
      return 'warning'
    case 'acknowledged':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}
