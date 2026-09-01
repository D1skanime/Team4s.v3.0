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
  role_code: string;
  count: number;
}

/** Fortschritts-Zeile je Contribution-Familie (D-04, Phase 113 Tier-Schwellen). */
export interface OwnDashboardCategoryProgress {
  family:
    | "contribution_projects"
    | "contribution_chronicle"
    | "contribution_archivist";
  current_tier: string;
  current_count: number;
  next_threshold: number | null;
}

/** Aggregierte Kennzahlen des eingeloggten Members für /me/dashboard (D-03). */
export interface OwnDashboardPendingClaim {
  claim_id: number;
  fansub_group_id: number;
  fansub_group_name: string;
  member_nickname: string;
  created_at: string;
}

export interface OwnDashboardPendingGroupMediaReview {
  fansub_group_id: number;
  fansub_group_name: string;
  count: number;
}

export interface OwnDashboardPendingReleaseReview {
  fansub_group_id: number;
  anime_id: number;
  anime_title: string;
  image_count: number;
  text_count: number;
}

/** Einzelne abgelehnte eigene Notiz innerhalb einer Anime+Gruppe-Gruppierung (Phase 143, Criterion 7). */
export interface OwnDashboardPendingOwnNoteRevisionItem {
  release_version_id: number;
  episode_number: string | null;
  note_title: string;
}

/** Gruppierung abgelehnter eigener Notizen je Anime-Projekt + Fansub-Gruppe (Phase 143, Criterion 7). */
export interface OwnDashboardPendingOwnNoteRevisionGroup {
  anime_id: number;
  anime_title: string;
  fansub_group_id: number;
  fansub_group_name: string;
  items: OwnDashboardPendingOwnNoteRevisionItem[];
}

export interface OwnDashboardData {
  has_member_profile: boolean;
  total_points: number;
  badges_count: number;
  projects_count: number;
  images_count: number;
  contributions_count: number;
  role_volume: OwnDashboardRoleVolumeEntry[];
  category_progress: OwnDashboardCategoryProgress[];
  pending_claims: OwnDashboardPendingClaim[];
  pending_group_media_reviews: OwnDashboardPendingGroupMediaReview[];
  pending_release_reviews: OwnDashboardPendingReleaseReview[];
  pending_own_note_revisions: OwnDashboardPendingOwnNoteRevisionGroup[];
}

/** Response-Envelope für GET /api/v1/me/dashboard. */
export interface OwnDashboardResponse {
  data: OwnDashboardData;
}
