// Typen für das personalisierte Dashboard (Phase 116, D-03/D-04).
//
// Diese Datei ist die einzige Quelle für die Own-Dashboard-DTO-Form. Spätere
// Phase-116-Pläne (Backend-Aggregation, frontend/src/lib/api.ts, die fünf
// Dashboard-Sektionskomponenten) importieren diese Interfaces direkt statt
// die Form erneut abzuleiten oder eigene Shapes zu erfinden.
//
// category_progress enthält bewusst KEINE Punkt-Meilenstein- oder
// Rollen-Volumen-Zeilen — diese werden client-seitig in Plan 116-05 aus
// total_points/role_volume plus den in memberBadgeLabels.ts exportierten
// Schwellen-Helfern (resolveNextPointMilestone/resolveNextRoleVolumeThreshold)
// berechnet, niemals serverseitig dupliziert.

/** Einzelne Rollen-Volumen-Zeile (Anzahl gewährter Credits je Rollencode). */
export interface OwnDashboardRoleVolumeEntry {
  role_code: string
  count: number
}

/** Fortschritts-Zeile je Contribution-Familie (D-04, Phase 113 Tier-Schwellen). */
export interface OwnDashboardCategoryProgress {
  family: 'contribution_projects' | 'contribution_chronicle' | 'contribution_archivist'
  current_tier: string
  current_count: number
  next_threshold: number | null
}

/** Aggregierte Kennzahlen des eingeloggten Members für /me/dashboard (D-03). */
export interface OwnDashboardData {
  has_member_profile: boolean
  total_points: number
  badges_count: number
  projects_count: number
  images_count: number
  contributions_count: number
  role_volume: OwnDashboardRoleVolumeEntry[]
  category_progress: OwnDashboardCategoryProgress[]
}

/** Response-Envelope für GET /api/v1/me/dashboard. */
export interface OwnDashboardResponse {
  data: OwnDashboardData
}
