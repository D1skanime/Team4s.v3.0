package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminUsersRepository enthält alle Datenbankabfragen für die Admin-User-Übersicht.
// Tab-Queries (Claims, Memberships, Rights, Contributions, Media, Audit) sind in
// admin_users_tab_repository.go ausgelagert (Datei-Limit <= 450 Zeilen).
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
