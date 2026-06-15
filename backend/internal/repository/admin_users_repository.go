package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminUsersRepository enthält alle Datenbankabfragen für die Admin-User-Übersicht.
type AdminUsersRepository struct {
	db *pgxpool.Pool
}

// NewAdminUsersRepository erstellt ein AdminUsersRepository mit dem übergebenen Pool.
func NewAdminUsersRepository(db *pgxpool.Pool) *AdminUsersRepository {
	return &AdminUsersRepository{db: db}
}

// ListAdminUsersPage gibt eine paginierte User-Liste mit allen D-05-Aggregat-Counts zurück.
// Verwendet eine Page-First-CTE mit LATERAL-Joins, um N+1-Abfragen zu vermeiden (D-07).
func (r *AdminUsersRepository) ListAdminUsersPage(
	ctx context.Context,
	params models.AdminUserListParams,
) (*models.AdminUserListResult, error) {
	limit := params.Limit
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	rows, err := r.db.Query(ctx, adminUsersListQuery,
		params.Q,
		params.Status,
		params.GlobalRole,
		params.HasConflicts,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list admin users page: %w", err)
	}
	defer rows.Close()

	items := make([]models.AdminUserListItem, 0)
	var total int
	for rows.Next() {
		var item models.AdminUserListItem
		var roleArr []string
		if err := rows.Scan(
			&total,
			&item.ID,
			&item.Email,
			&item.DisplayName,
			&item.Status,
			&roleArr,
			&item.MemberProfileID,
			&item.MemberProfileName,
			&item.GroupMembershipCount,
			&item.LeaderContextCount,
			&item.OpenClaimsCount,
			&item.OpenContributionsCount,
			&item.TotalContributionsCount,
			&item.MediaUploadCount,
			&item.ReleaseScopeCount,
			&item.ConflictCount,
			&item.LastActivityAt,
		); err != nil {
			return nil, fmt.Errorf("list admin users page: scan: %w", err)
		}
		if roleArr != nil {
			item.GlobalRoles = roleArr
		} else {
			item.GlobalRoles = []string{}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list admin users page: iterate: %w", err)
	}

	result := &models.AdminUserListResult{}
	result.Data = items
	result.Meta.Total = total
	result.Meta.Limit = limit
	result.Meta.Offset = offset
	return result, nil
}

// GetUserOverview gibt die Detail-Übersicht eines Users inkl. Conflict-Aufschlüsselung zurück.
func (r *AdminUsersRepository) GetUserOverview(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserOverview, error) {
	row := r.db.QueryRow(ctx, adminUsersOverviewQuery, appUserID)

	var ov models.AdminUserOverview
	var roleArr []string
	if err := row.Scan(
		&ov.ID,
		&ov.Email,
		&ov.DisplayName,
		&ov.Status,
		&roleArr,
		&ov.GroupMembershipCount,
		&ov.LeaderContextCount,
		&ov.OpenClaimsCount,
		&ov.OpenContributionsCount,
		&ov.TotalContributionsCount,
		&ov.MediaUploadCount,
		&ov.ReleaseScopeCount,
		&ov.LastLoginAt,
		&ov.CreatedAt,
		&ov.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get user overview: %w", err)
	}
	if roleArr != nil {
		ov.GlobalRoles = roleArr
	} else {
		ov.GlobalRoles = []string{}
	}

	// Conflict-Details separat laden (D-19)
	conflicts, err := r.getUserConflictDetails(ctx, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user overview: conflicts: %w", err)
	}
	ov.ConflictDetails = conflicts
	return &ov, nil
}

// getUserConflictDetails berechnet alle Conflict-Typen (D-17 + D-18) für einen User.
func (r *AdminUsersRepository) getUserConflictDetails(
	ctx context.Context,
	appUserID int64,
) ([]models.AdminConflict, error) {
	rows, err := r.db.Query(ctx, adminUsersConflictDetailsQuery, appUserID)
	if err != nil {
		return nil, fmt.Errorf("conflict details: %w", err)
	}
	defer rows.Close()

	conflicts := make([]models.AdminConflict, 0)
	for rows.Next() {
		var c models.AdminConflict
		if err := rows.Scan(&c.Type, &c.Message); err != nil {
			return nil, fmt.Errorf("conflict details: scan: %w", err)
		}
		conflicts = append(conflicts, c)
	}
	return conflicts, rows.Err()
}

// GetUserGlobalRoles gibt die globalen Rollen eines Users zurück.
func (r *AdminUsersRepository) GetUserGlobalRoles(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserGlobalRolesResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role FROM app_user_global_roles
		WHERE app_user_id = $1 ORDER BY role
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user global roles: %w", err)
	}
	defer rows.Close()

	roles := make([]string, 0)
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("get user global roles: scan: %w", err)
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("get user global roles: iterate: %w", err)
	}
	return &models.AdminUserGlobalRolesResult{
		Roles:           roles,
		AssignableRoles: []string{"platform_admin", "content_admin", "user"},
	}, nil
}

// GetUserMemberClaims gibt das Member-Profil und alle Claims eines Users zurück.
func (r *AdminUsersRepository) GetUserMemberClaims(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserMemberClaimsResult, error) {
	result := &models.AdminUserMemberClaimsResult{
		Claims: []models.AdminClaimSummary{},
	}

	// Member-Profil (verifizierter Claim)
	profRow := r.db.QueryRow(ctx, `
		SELECT m.id, fg.name, m.profile_status, NULL
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN fansub_group_members fgm ON fgm.member_id = m.id
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		WHERE mc.app_user_id = $1 AND mc.claim_status = 'verified'
		ORDER BY mc.id LIMIT 1
	`, appUserID)
	var prof models.AdminMemberProfileSummary
	if err := profRow.Scan(&prof.MemberID, &prof.FansubName, &prof.ProfileStatus, &prof.AvatarURL); err == nil {
		result.MemberProfile = &prof
	}

	// Alle Claims
	rows, err := r.db.Query(ctx, `
		SELECT mc.id, mc.claim_type, mc.claim_status, mc.member_id,
		       fg.name, mc.created_at::text, mc.resolved_at::text
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN fansub_group_members fgm ON fgm.member_id = m.id
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		WHERE mc.app_user_id = $1
		ORDER BY mc.created_at DESC
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user member claims: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c models.AdminClaimSummary
		if err := rows.Scan(&c.ClaimID, &c.ClaimType, &c.ClaimStatus, &c.MemberID,
			&c.FansubName, &c.CreatedAt, &c.ResolvedAt); err != nil {
			return nil, fmt.Errorf("get user member claims: scan: %w", err)
		}
		result.Claims = append(result.Claims, c)
	}
	return result, rows.Err()
}

// GetUserGroupMemberships gibt alle Gruppenmitgliedschaften eines Users zurück.
func (r *AdminUsersRepository) GetUserGroupMemberships(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserGroupMembershipsResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT fg.id, fg.name, fgm.member_status,
		       COALESCE(
		           ARRAY_AGG(fgmr.role_code ORDER BY fgmr.role_code) FILTER (WHERE fgmr.role_code IS NOT NULL),
		           ARRAY[]::text[]
		       ),
		       fgm.joined_at::text
		FROM fansub_group_members fgm
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
		WHERE fgm.app_user_id = $1
		GROUP BY fg.id, fg.name, fgm.member_status, fgm.joined_at
		ORDER BY fg.name
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user group memberships: %w", err)
	}
	defer rows.Close()

	memberships := make([]models.AdminGroupMembershipSummary, 0)
	for rows.Next() {
		var m models.AdminGroupMembershipSummary
		if err := rows.Scan(&m.FansubGroupID, &m.FansubGroupName, &m.MemberStatus,
			&m.Roles, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("get user group memberships: scan: %w", err)
		}
		memberships = append(memberships, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("get user group memberships: iterate: %w", err)
	}
	return &models.AdminUserGroupMembershipsResult{Memberships: memberships}, nil
}

// GetUserGroupRights gibt die scoped Gruppenrechte eines Users zurück (read-only, D-03).
func (r *AdminUsersRepository) GetUserGroupRights(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserGroupRightsResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT fg.id, fg.name,
		       COALESCE(
		           ARRAY_AGG(DISTINCT fgmr.role_code ORDER BY fgmr.role_code) FILTER (WHERE fgmr.role_code IS NOT NULL),
		           ARRAY[]::text[]
		       ),
		       bool_or(fgmr.role_code IS NOT NULL) AS can_view_members,
		       bool_or(fgmr.role_code IN ('leader', 'editor', 'contributor')) AS can_edit_content
		FROM fansub_group_members fgm
		JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
		LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
		WHERE fgm.app_user_id = $1
		GROUP BY fg.id, fg.name
		ORDER BY fg.name
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user group rights: %w", err)
	}
	defer rows.Close()

	rights := make([]models.AdminGroupRightsSummary, 0)
	for rows.Next() {
		var gr models.AdminGroupRightsSummary
		if err := rows.Scan(&gr.FansubGroupID, &gr.FansubGroupName, &gr.GrantedRoles,
			&gr.CanViewMembers, &gr.CanEditContent); err != nil {
			return nil, fmt.Errorf("get user group rights: scan: %w", err)
		}
		rights = append(rights, gr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("get user group rights: iterate: %w", err)
	}
	return &models.AdminUserGroupRightsResult{GroupRights: rights}, nil
}

// ListUserContributions gibt alle Contributions eines Users zurück (D-12/D-13).
// Verwendet member_id als kanonischen Anker (Migration 0105).
func (r *AdminUsersRepository) ListUserContributions(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserContributionsResult, error) {
	// member_id des Users über verified claim ermitteln
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT mc.member_id FROM member_claims mc
		WHERE mc.app_user_id = $1 AND mc.claim_status = 'verified'
		ORDER BY mc.id LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		// Kein verified claim → leere Listen zurückgeben
		return &models.AdminUserContributionsResult{
			ProjectDefaults:  []models.AdminContributionItem{},
			ReleaseOverrides: []models.AdminContributionItem{},
			OpenDisputes:     []models.AdminContributionItem{},
			LegacyHistorical: []models.AdminContributionItem{},
		}, nil
	}

	result := &models.AdminUserContributionsResult{
		ProjectDefaults:  []models.AdminContributionItem{},
		ReleaseOverrides: []models.AdminContributionItem{},
		OpenDisputes:     []models.AdminContributionItem{},
		LegacyHistorical: []models.AdminContributionItem{},
	}

	// Alle Contributions via member_id (kanonischer Anker, D-12)
	rows, err := r.db.Query(ctx, `
		SELECT
			ac.id,
			ac.fansub_group_id,
			fg.name AS fansub_group_name,
			ac.anime_id,
			a.title AS anime_title,
			ac.release_version_id,
			CASE WHEN ac.release_version_id IS NULL THEN 'project_default' ELSE 'release_override' END,
			COALESCE(ac.dispute_state, ''),
			COALESCE(
				ARRAY_AGG(acr.role_code ORDER BY acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL),
				ARRAY[]::text[]
			)
		FROM anime_contributions ac
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.member_id = $1
		GROUP BY ac.id, fg.name, a.title
		ORDER BY a.title, ac.release_version_id NULLS FIRST, ac.id
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("list user contributions: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item models.AdminContributionItem
		if err := rows.Scan(
			&item.ContributionID,
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.AnimeID,
			&item.AnimeTitle,
			&item.ReleaseVersionID,
			&item.ContributionType,
			&item.DisputeState,
			&item.RoleCodes,
		); err != nil {
			return nil, fmt.Errorf("list user contributions: scan: %w", err)
		}
		if item.DisputeState == "open" {
			result.OpenDisputes = append(result.OpenDisputes, item)
		} else if item.ContributionType == "project_default" {
			result.ProjectDefaults = append(result.ProjectDefaults, item)
		} else {
			result.ReleaseOverrides = append(result.ReleaseOverrides, item)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list user contributions: iterate: %w", err)
	}

	return result, nil
}

// GetUserMedia gibt alle Medien-Uploads eines Users zurück.
func (r *AdminUsersRepository) GetUserMedia(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserMediaResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvm.media_asset_id,
			ma.media_type,
			COALESCE(ma.original_filename, ''),
			COALESCE(ma.public_url, ''),
			COALESCE(ma.file_size_bytes, 0),
			rvm.created_at::text,
			'release_version:' || rvm.release_version_id::text
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		WHERE rvm.uploaded_by_app_user_id = $1
		ORDER BY rvm.created_at DESC
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user media: %w", err)
	}
	defer rows.Close()

	items := make([]models.AdminMediaItemSummary, 0)
	for rows.Next() {
		var m models.AdminMediaItemSummary
		if err := rows.Scan(
			&m.MediaAssetID, &m.MediaType, &m.OriginalFilename,
			&m.PublicURL, &m.FileSizeBytes, &m.UploadedAt, &m.OwnerContext,
		); err != nil {
			return nil, fmt.Errorf("get user media: scan: %w", err)
		}
		items = append(items, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("get user media: iterate: %w", err)
	}
	return &models.AdminUserMediaResult{MediaItems: items}, nil
}

// GetUserAudit gibt die Audit-Einträge für einen User zurück (als Actor oder Target).
func (r *AdminUsersRepository) GetUserAudit(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserAuditResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			al.id,
			al.event_type,
			COALESCE(al.target_type, ''),
			al.target_id,
			COALESCE(al.action_name, ''),
			COALESCE(al.outcome, ''),
			al.created_at::text
		FROM audit_logs al
		WHERE al.actor_app_user_id = $1
		   OR (al.target_type = 'app_user' AND al.target_id = $1)
		ORDER BY al.created_at DESC
		LIMIT 100
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("get user audit: %w", err)
	}
	defer rows.Close()

	entries := make([]models.AdminAuditEntry, 0)
	for rows.Next() {
		var e models.AdminAuditEntry
		if err := rows.Scan(
			&e.EventID, &e.EventType, &e.TargetType, &e.TargetID,
			&e.Action, &e.Outcome, &e.OccurredAt,
		); err != nil {
			return nil, fmt.Errorf("get user audit: scan: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("get user audit: iterate: %w", err)
	}
	return &models.AdminUserAuditResult{Entries: entries}, nil
}

// UpdateAppUserStatus setzt den Status eines App-Users (erlaubt: active, disabled).
func (r *AdminUsersRepository) UpdateAppUserStatus(
	ctx context.Context,
	appUserID int64,
	status string,
) error {
	if _, err := r.db.Exec(ctx, `
		UPDATE app_users SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, appUserID, status); err != nil {
		return fmt.Errorf("update app user status: %w", err)
	}
	return nil
}
