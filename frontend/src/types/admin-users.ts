/**
 * Phase-80-Typen für die Admin-User-Übersicht und den User-Detail-Drawer.
 * Spiegelt die json-Tags aus backend/internal/models/admin_users.go 1:1.
 *
 * Basistypen (AppUser, CurrentUserData) werden aus auth.ts importiert,
 * nicht dupliziert.
 */

// ---------------------------------------------------------------------------
// Listen-Endpunkt
// ---------------------------------------------------------------------------

/** Eine Zeile in der paginierten Admin-User-Übersichtsliste. */
export interface AdminUserListItem {
  id: number
  email: string
  display_name: string
  status: 'pending' | 'active' | 'disabled'
  global_roles: string[]

  // Member-Profil-Anker (via member_claims, verified)
  member_profile_id: number | null
  member_profile_name: string | null

  // D-05-Aggregat-Counts
  group_membership_count: number
  leader_context_count: number
  open_claims_count: number
  open_contributions_count: number
  total_contributions_count: number
  media_upload_count: number
  release_scope_count: number
  conflict_count: number
  last_activity_at: string | null
}

/** Filter- und Paginierungsparameter für die Admin-User-Liste. */
export interface AdminUserListParams {
  q?: string
  status?: string
  global_role?: string
  has_conflicts?: boolean
  sort?: string
  limit?: number
  offset?: number
}

/** Response-Envelope der paginierten Admin-User-Liste. */
export interface AdminUserListResponse {
  data: AdminUserListItem[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// ---------------------------------------------------------------------------
// Übersicht-Tab
// ---------------------------------------------------------------------------

/** Ein einzelner Konflikt-Eintrag im Übersicht-Tab. */
export interface AdminConflictDetail {
  type: string
  message: string
}

/** Response des Übersicht-Tab-Endpunkts. */
export interface AdminUserOverviewResponse {
  id: number
  email: string
  display_name: string
  status: 'pending' | 'active' | 'disabled'
  global_roles: string[]

  // Zusammenfassung-Counts
  group_membership_count: number
  leader_context_count: number
  open_claims_count: number
  open_contributions_count: number
  total_contributions_count: number
  media_upload_count: number
  release_scope_count: number

  // Conflict-Aufschlüsselung (D-19)
  conflict_details: AdminConflictDetail[]

  // Zeitstempel
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Rollen-Tab
// ---------------------------------------------------------------------------

/** Response des Rollen-Tab-Endpunkts. */
export interface AdminUserGlobalRolesResponse {
  roles: string[]
  assignable_roles: string[]
}

// ---------------------------------------------------------------------------
// Claims-Tab
// ---------------------------------------------------------------------------

export interface AdminMemberProfileSummary {
  member_id: number
  fansub_name: string
  profile_status: string
  avatar_url: string | null
}

export interface AdminClaimSummary {
  claim_id: number
  claim_type: string
  claim_status: string
  member_id: number
  fansub_name: string
  created_at: string
  resolved_at: string | null
}

/** Response des Claims-Tab-Endpunkts. */
export interface AdminUserMemberClaimsResponse {
  member_profile: AdminMemberProfileSummary | null
  claims: AdminClaimSummary[]
}

// ---------------------------------------------------------------------------
// Gruppenmitgliedschaften-Tab
// ---------------------------------------------------------------------------

export interface AdminGroupMembershipSummary {
  fansub_group_id: number
  fansub_group_name: string
  member_status: string
  roles: string[]
  joined_at: string
}

/** Response des Gruppenmitgliedschaften-Tab-Endpunkts. */
export interface AdminUserGroupMembershipsResponse {
  memberships: AdminGroupMembershipSummary[]
}

// ---------------------------------------------------------------------------
// Gruppenrechte-Tab (read-only, D-03)
// ---------------------------------------------------------------------------

export interface AdminGroupRightsSummary {
  fansub_group_id: number
  fansub_group_name: string
  granted_roles: string[]
  can_view_members: boolean
  can_edit_content: boolean
}

/** Response des Gruppenrechte-Tab-Endpunkts (read-only). */
export interface AdminUserGroupRightsResponse {
  group_rights: AdminGroupRightsSummary[]
}

// ---------------------------------------------------------------------------
// Contributions-Tab (Phase-83-aware, D-13)
// ---------------------------------------------------------------------------

/** Eine einzelne Contribution eines Users. */
export interface AdminContributionItem {
  contribution_id: number
  fansub_group_id: number
  fansub_group_name: string
  anime_id: number
  anime_title: string
  release_version_id: number | null
  contribution_type: 'project_default' | 'release_override'
  dispute_state: string
  role_codes: string[]
  // D-29: die echte fachliche Version (release_versions.version) und die
  // Episodennummer für die Anzeige — release_version_id bleibt intern
  // und wird nie mehr roh im UI gerendert. episode_number ist string
  // (episodes.episode_number ist in der Datenbank TEXT), nicht number.
  release_version_label: string | null
  episode_number: string | null
}

/** Response des Contributions-Tab-Endpunkts (vier Gruppen, D-13). */
export interface AdminUserContributionsResponse {
  project_defaults: AdminContributionItem[]
  release_overrides: AdminContributionItem[]
  open_disputes: AdminContributionItem[]
  legacy_historical: AdminContributionItem[]
}

// ---------------------------------------------------------------------------
// Medien-Tab
// ---------------------------------------------------------------------------

export interface AdminMediaItemSummary {
  media_asset_id: number
  media_type: string
  original_filename: string
  public_url: string
  file_size_bytes: number
  uploaded_at: string
  owner_context: string
}

/** Response des Medien-Tab-Endpunkts. */
export interface AdminUserMediaResponse {
  media_items: AdminMediaItemSummary[]
}

// ---------------------------------------------------------------------------
// Audit-Tab
// ---------------------------------------------------------------------------

export interface AdminAuditEntry {
  event_id: number
  event_type: string
  target_type: string
  target_id: number | null
  action: string
  outcome: string
  occurred_at: string
}

/** Response des Audit-Tab-Endpunkts. */
export interface AdminUserAuditResponse {
  entries: AdminAuditEntry[]
}

// ---------------------------------------------------------------------------
// Zentrale Claims-Arbeitsqueue (D-23, Plan 138-05)
// ---------------------------------------------------------------------------

/** Eine Zeile in der gruppenuebergreifenden Claims-Arbeitsqueue. */
export interface AdminClaimListRow {
  claim_id: number
  app_user_id: number
  app_user_email: string
  app_user_display_name: string
  member_id: number
  member_nickname: string
  claim_status: 'pending' | 'verified' | 'rejected'
  claim_type: string
  fansub_group_id: number
  fansub_group_name: string
  note: string
  created_at: string
  verified_at: string | null
}

/** Filter- und Paginierungsparameter für GET /admin/claims. */
export interface AdminClaimsListParams {
  status?: string
  claim_type?: string
  fansub_group_id?: number
  app_user_id?: number
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Response-Envelope der zentralen Claims-Arbeitsqueue. */
export interface AdminClaimsListResponse {
  data: AdminClaimListRow[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// ---------------------------------------------------------------------------
// Zentrale Aenderungen/Audit-Arbeitsqueue (D-25/D-28, Plan 138-05)
// ---------------------------------------------------------------------------

/** Eine Zeile in der gruppenuebergreifenden Aenderungen-Arbeitsqueue. */
export interface AdminChangeEntry {
  event_id: number
  event_type: string
  target_type: string
  target_id: number | null
  action: string
  outcome: string
  occurred_at: string
  actor_app_user_id: number | null
  scope_type: string
  scope_id: number | null
  payload: Record<string, unknown> | null
  actor_display_name: string | null
  target_display_name: string | null
}

/** Filter- und Paginierungsparameter für GET /admin/changes. */
export interface AdminChangesListParams {
  benutzer?: number
  akteur?: number
  gruppe?: number
  target_type?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Response-Envelope der zentralen Aenderungen-Arbeitsqueue. */
export interface AdminChangesListResponse {
  data: AdminChangeEntry[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// ---------------------------------------------------------------------------
// Phase-139: skalierbare User-Admin-Projektionen (Beitraege/Medien/Rechte)
//
// Diese Typen sind additiv. Sie ersetzen NICHT AdminUserContributionsResponse/
// AdminUserMediaResponse/AdminContributionItem/AdminMediaItemSummary, deren
// Envelope-Form weiterhin von anderen Konsumenten genutzt wird — spiegeln
// 1:1 die json-Tags aus backend/internal/models/admin_users.go (Plan 139-01).
// ---------------------------------------------------------------------------

/** Geteilte Paginierungs-Meta-Huelle fuer neue Phase-139-Listen-Endpunkte. */
export interface AdminListMeta {
  total: number
  limit: number
  offset: number
}

/** Generisches {id,name}-Paar fuer filter_options-Eintraege. */
export interface AdminFilterOption {
  id: number
  name: string
}

/** Die immer sichtbare Projektstandard-Zeile (D03). */
export interface AdminContributionStandardSummary {
  role_codes: string[]
  contributor_labels: string[]
}

/**
 * Ein zusammengefasster Bereich oder eine einzelne Abweichung (D04/D05/D06).
 * is_deviation wird ausschliesslich durch einen echten semantischen Diff
 * gesetzt, niemals durch reine Anwesenheit von release_version_id.
 */
export interface AdminContributionRangeEntry {
  from_label: string
  to_label: string
  is_deviation: boolean
  deviation_detail: string | null
  role_codes: string[]
}

/** Ein Seiten-Element: ein Anime+Projekt-Block (D08). */
export interface AdminContributionProjectBlock {
  anime_id: number
  anime_title: string
  fansub_group_id: number
  fansub_group_name: string
  project_standard: AdminContributionStandardSummary
  range_entries: AdminContributionRangeEntry[]
}

/**
 * Auf die Beitragshistorie des jeweils einen Users beschraenkt (UI-SPEC
 * Filter Data Contract) — niemals ein zweiter unbegrenzter Lookup-Endpunkt.
 */
export interface AdminContributionFilterOptions {
  animes: AdminFilterOption[]
  groups: AdminFilterOption[]
}

/** Die neue paginierte Response-Huelle fuer den Contributions-Tab. */
export interface AdminUserContributionsPage {
  data: AdminContributionProjectBlock[]
  meta: AdminListMeta
  filter_options: AdminContributionFilterOptions
}

/**
 * Ein einzelnes Media-Item innerhalb eines Release-/Episoden-Blocks. Bewusst
 * OHNE owner_context-Feld und ohne Scope-/Berechtigungs-Flag (D19) — dies
 * ist ein neuer Typ, keine Mutation des bestehenden AdminMediaItemSummary.
 */
export interface AdminMediaItem {
  media_asset_id: number
  media_type: string
  original_filename: string
  public_url: string
  file_size_bytes: number
  uploaded_at: string
}

/** Ein Seiten-Element: ein Release-/Episoden-Block (D12). */
export interface AdminMediaReleaseBlock {
  anime_id: number
  anime_title: string
  fansub_group_id: number
  fansub_group_name: string
  release_version_id: number
  release_version_label: string
  episode_number: string | null
  items: AdminMediaItem[]
}

/** Die verfuegbaren Filter fuer den Medien-Tab. */
export interface AdminMediaFilterOptions {
  animes: AdminFilterOption[]
  groups: AdminFilterOption[]
  releases_or_episodes: AdminFilterOption[]
  media_types: string[]
}

/** Die neue paginierte Response-Huelle fuer den Medien-Tab. */
export interface AdminUserMediaPage {
  data: AdminMediaReleaseBlock[]
  meta: AdminListMeta
  filter_options: AdminMediaFilterOptions
}

/** F-01-Kompaktzusammenfassung einer einzelnen Faehigkeit. */
export interface AdminHeadlineCapabilityState {
  action_code: string
  label: string
  allowed: boolean
}

/** F-01-Seiten-Element: eine Gruppe mit kompakter Rechte-Zusammenfassung. */
export interface AdminUserGroupRightsSummaryItem {
  fansub_group_id: number
  fansub_group_name: string
  role_label: string
  headline_states: AdminHeadlineCapabilityState[]
  has_deviation: boolean
  open_claims_count: number
}

/** Die neue paginierte, gebuendelte F-01-Response-Huelle fuer die Rechte-Uebersicht. */
export interface AdminUserRightsSummaryPage {
  data: AdminUserGroupRightsSummaryItem[]
  meta: AdminListMeta
}

/** Filter- und Paginierungsparameter fuer GET /admin/users/:userId/contributions. */
export interface AdminUserContributionsParams {
  anime_id?: number
  fansub_group_id?: number
  role_code?: string
  only_deviations?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Filter- und Paginierungsparameter fuer GET /admin/users/:userId/media. */
export interface AdminUserMediaParams {
  anime_id?: number
  fansub_group_id?: number
  release_version_id?: number
  media_type?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}
