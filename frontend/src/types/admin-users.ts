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
