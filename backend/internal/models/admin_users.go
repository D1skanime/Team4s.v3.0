package models

import "time"

// Conflict-Typ-Konstanten für Phase-80-Conflict-Detection (D-17/D-18).
// Handler validiert Type-Wert vor DB-Query (Phase 80-03, T-80-01-01).
const (
	AdminConflictTypeOpenClaim                      = "open_claim_with_profile"
	AdminConflictTypeMemberWithoutRole              = "member_without_role"
	AdminConflictTypeMediaWithoutScope              = "media_without_scope"
	AdminConflictTypeOpenDispute                    = "open_dispute"
	AdminConflictTypeInvalidReleaseOverride         = "invalid_release_override"
	AdminConflictTypeOverrideContradiction          = "override_contradiction"
	AdminConflictTypeMediaWithoutContributionRights = "media_without_contribution_rights"
)

// AdminUserListItem ist eine Zeile in der paginierten Admin-User-Übersichtsliste.
// Enthält AppUser-Basisfelder plus alle D-05-Aggregat-Counts.
type AdminUserListItem struct {
	ID          int64    `json:"id"`
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Status      string   `json:"status"`
	GlobalRoles []string `json:"global_roles"`

	// Member-Profil-Anker (via member_claims, verified)
	MemberProfileID   *int64  `json:"member_profile_id"`
	MemberProfileName *string `json:"member_profile_name"`

	// D-05-Aggregat-Counts
	GroupMembershipCount      int    `json:"group_membership_count"`
	LeaderContextCount        int    `json:"leader_context_count"`
	OpenClaimsCount           int    `json:"open_claims_count"`
	OpenContributionsCount    int    `json:"open_contributions_count"`
	TotalContributionsCount   int    `json:"total_contributions_count"`
	MediaUploadCount          int    `json:"media_upload_count"`
	ReleaseScopeCount         int    `json:"release_scope_count"`
	ConflictCount             int    `json:"conflict_count"`
	LastActivityAt            *string `json:"last_activity_at"`
}

// AdminUserListParams enthält Filter- und Paginierungsparameter für die User-Liste.
type AdminUserListParams struct {
	Q            string `json:"q"`
	Status       string `json:"status"`
	GlobalRole   string `json:"global_role"`
	HasConflicts bool   `json:"has_conflicts"`
	Sort         string `json:"sort"`
	Limit        int    `json:"limit"`
	Offset       int    `json:"offset"`
}

// AdminUserListResult ist das Response-DTO der paginierten User-Liste.
type AdminUserListResult struct {
	Data []AdminUserListItem `json:"data"`
	Meta struct {
		Total  int `json:"total"`
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	} `json:"meta"`
}

// AdminConflict beschreibt einen einzelnen Konflikt im Übersicht-Tab des User-Detail-Drawers.
type AdminConflict struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// AdminUserOverview ist das Haupt-DTO für den Übersicht-Tab des User-Detail-Drawers.
type AdminUserOverview struct {
	ID          int64    `json:"id"`
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Status      string   `json:"status"`
	GlobalRoles []string `json:"global_roles"`

	// Zusammenfassung-Counts (D-05)
	GroupMembershipCount    int `json:"group_membership_count"`
	LeaderContextCount      int `json:"leader_context_count"`
	OpenClaimsCount         int `json:"open_claims_count"`
	OpenContributionsCount  int `json:"open_contributions_count"`
	TotalContributionsCount int `json:"total_contributions_count"`
	MediaUploadCount        int `json:"media_upload_count"`
	ReleaseScopeCount       int `json:"release_scope_count"`

	// Conflict-Aufschlüsselung (D-19)
	ConflictDetails []AdminConflict `json:"conflict_details"`

	// Zeitstempel
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AdminUserGlobalRolesResult ist das DTO für den Rollen-Tab.
type AdminUserGlobalRolesResult struct {
	Roles           []string `json:"roles"`
	AssignableRoles []string `json:"assignable_roles"`
}

// AdminMemberProfileSummary fasst das verlinktes Member-Profil zusammen.
type AdminMemberProfileSummary struct {
	MemberID      int64   `json:"member_id"`
	FansubName    string  `json:"fansub_name"`
	ProfileStatus string  `json:"profile_status"`
	AvatarURL     *string `json:"avatar_url,omitempty"`
}

// AdminClaimSummary beschreibt einen einzelnen Claim/eine Einladung.
type AdminClaimSummary struct {
	ClaimID       int64   `json:"claim_id"`
	ClaimType     string  `json:"claim_type"`
	ClaimStatus   string  `json:"claim_status"`
	MemberID      int64   `json:"member_id"`
	FansubName    string  `json:"fansub_name"`
	CreatedAt     string  `json:"created_at"`
	ResolvedAt    *string `json:"resolved_at,omitempty"`
}

// AdminUserMemberClaimsResult ist das DTO für den Claims-Tab.
type AdminUserMemberClaimsResult struct {
	MemberProfile *AdminMemberProfileSummary `json:"member_profile"`
	Claims        []AdminClaimSummary        `json:"claims"`
}

// AdminGroupMembershipSummary beschreibt eine einzelne Grupenmitgliedschaft.
type AdminGroupMembershipSummary struct {
	FansubGroupID   int64    `json:"fansub_group_id"`
	FansubGroupName string   `json:"fansub_group_name"`
	MemberStatus    string   `json:"member_status"`
	Roles           []string `json:"roles"`
	JoinedAt        string   `json:"joined_at"`
}

// AdminUserGroupMembershipsResult ist das DTO für den Gruppenmitgliedschaften-Tab.
type AdminUserGroupMembershipsResult struct {
	Memberships []AdminGroupMembershipSummary `json:"memberships"`
}

// AdminGroupRightsSummary beschreibt die scoped Rechte eines Users in einer Gruppe (read-only, D-03).
type AdminGroupRightsSummary struct {
	FansubGroupID   int64    `json:"fansub_group_id"`
	FansubGroupName string   `json:"fansub_group_name"`
	GrantedRoles    []string `json:"granted_roles"`
	CanViewMembers  bool     `json:"can_view_members"`
	CanEditContent  bool     `json:"can_edit_content"`
}

// AdminUserGroupRightsResult ist das DTO für den Gruppenrechte-Tab (read-only).
type AdminUserGroupRightsResult struct {
	GroupRights []AdminGroupRightsSummary `json:"group_rights"`
}

// AdminContributionItem beschreibt eine einzelne Contribution eines Users.
// Orientiert sich an Phase-83-Auflösungslogik (member_id-Anker, D-12/D-13).
type AdminContributionItem struct {
	ContributionID   int64    `json:"contribution_id"`
	FansubGroupID    int64    `json:"fansub_group_id"`
	FansubGroupName  string   `json:"fansub_group_name"`
	AnimeID          int64    `json:"anime_id"`
	AnimeTitle       string   `json:"anime_title"`
	ReleaseVersionID *int64   `json:"release_version_id"`
	ContributionType string   `json:"contribution_type"` // "project_default" | "release_override"
	DisputeState     string   `json:"dispute_state"`
	RoleCodes        []string `json:"role_codes"`
}

// AdminUserContributionsResult ist das DTO für den Contributions-Tab (D-13: vier Gruppen).
type AdminUserContributionsResult struct {
	ProjectDefaults   []AdminContributionItem `json:"project_defaults"`
	ReleaseOverrides  []AdminContributionItem `json:"release_overrides"`
	OpenDisputes      []AdminContributionItem `json:"open_disputes"`
	LegacyHistorical  []AdminContributionItem `json:"legacy_historical"`
}

// AdminMediaItemSummary beschreibt ein einzelnes Media-Item eines Users.
type AdminMediaItemSummary struct {
	MediaAssetID     int64   `json:"media_asset_id"`
	MediaType        string  `json:"media_type"`
	OriginalFilename string  `json:"original_filename"`
	PublicURL        string  `json:"public_url"`
	FileSizeBytes    int64   `json:"file_size_bytes"`
	UploadedAt       string  `json:"uploaded_at"`
	OwnerContext     string  `json:"owner_context"` // z. B. "release_version:42"
}

// AdminUserMediaResult ist das DTO für den Medien-Tab.
type AdminUserMediaResult struct {
	MediaItems []AdminMediaItemSummary `json:"media_items"`
}

// AdminAuditEntry beschreibt einen einzelnen Audit-Log-Eintrag.
type AdminAuditEntry struct {
	EventID    int64   `json:"event_id"`
	EventType  string  `json:"event_type"`
	TargetType string  `json:"target_type"`
	TargetID   *int64  `json:"target_id,omitempty"`
	Action     string  `json:"action"`
	Outcome    string  `json:"outcome"`
	OccurredAt string  `json:"occurred_at"`
}

// AdminUserAuditResult ist das DTO für den Audit-Tab.
type AdminUserAuditResult struct {
	Entries []AdminAuditEntry `json:"entries"`
}
