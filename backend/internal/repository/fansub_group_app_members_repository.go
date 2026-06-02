package repository

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FansubGroupAppMemberRepository struct {
	db *pgxpool.Pool
}

type MemberMutationConflict struct {
	Code    string
	Message string
}

func (e *MemberMutationConflict) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

func AsMemberMutationConflict(err error) (*MemberMutationConflict, bool) {
	var conflict *MemberMutationConflict
	if errors.As(err, &conflict) {
		return conflict, true
	}
	return nil, false
}

func NewFansubGroupAppMemberRepository(db *pgxpool.Pool) *FansubGroupAppMemberRepository {
	return &FansubGroupAppMemberRepository{db: db}
}

func (r *FansubGroupAppMemberRepository) SearchCandidates(
	ctx context.Context,
	fansubGroupID int64,
	query string,
	limit int,
) ([]models.FansubGroupMemberCandidate, error) {
	if fansubGroupID <= 0 {
		return nil, fmt.Errorf("search fansub group member candidates: invalid fansub id")
	}

	search := strings.TrimSpace(query)
	if len(search) < 2 {
		return []models.FansubGroupMemberCandidate{}, nil
	}

	if limit <= 0 || limit > 25 {
		limit = 12
	}

	pattern := "%" + search + "%"
	rows, err := r.db.Query(ctx, `
		SELECT
			au.id,
			m.id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS fansub_name
		FROM app_users au
		JOIN members m
			ON m.user_id = au.legacy_user_id
		LEFT JOIN fansub_group_members fgm
			ON fgm.app_user_id = au.id
			AND fgm.fansub_group_id = $1
		WHERE fgm.id IS NULL
		  AND (
			m.nickname ILIKE $2
		  )
		ORDER BY LOWER(COALESCE(NULLIF(m.nickname, ''), 'Mitglied')), au.id
		LIMIT $3
	`, fansubGroupID, pattern, limit)
	if err != nil {
		return nil, fmt.Errorf("search fansub group member candidates: %w", err)
	}
	defer rows.Close()

	candidates := make([]models.FansubGroupMemberCandidate, 0)
	for rows.Next() {
		var item models.FansubGroupMemberCandidate
		if err := rows.Scan(
			&item.AppUserID,
			&item.MemberID,
			&item.FansubName,
		); err != nil {
			return nil, fmt.Errorf("search fansub group member candidates: scan: %w", err)
		}
		candidates = append(candidates, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("search fansub group member candidates: iterate: %w", err)
	}

	return candidates, nil
}

func (r *FansubGroupAppMemberRepository) ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupAppMember, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fgm.id,
			fgm.fansub_group_id,
			fgm.app_user_id,
			fgm.status,
			fgm.created_by_app_user_id,
			fgm.updated_by_app_user_id,
			fgm.created_at,
			fgm.updated_at,
			COALESCE(m.id, 0) AS member_id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS fansub_name,
			COALESCE(
				ARRAY(
					SELECT role
					FROM fansub_group_member_roles
					WHERE fansub_group_member_id = fgm.id
					ORDER BY role
				),
				ARRAY[]::varchar[]
			) AS member_roles
		FROM fansub_group_members fgm
		JOIN app_users au ON au.id = fgm.app_user_id
		LEFT JOIN members m ON m.user_id = au.legacy_user_id
		WHERE fgm.fansub_group_id = $1
		ORDER BY LOWER(COALESCE(NULLIF(m.nickname, ''), 'Mitglied')), au.id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list fansub group members: %w", err)
	}
	defer rows.Close()

	members := make([]models.FansubGroupAppMember, 0)
	for rows.Next() {
		var member models.FansubGroupAppMember
		var memberRoles []string
		var memberIdentity models.FansubGroupMemberIdentity
		if err := rows.Scan(
			&member.ID,
			&member.FansubGroupID,
			&member.AppUserID,
			&member.Status,
			&member.CreatedByAppUser,
			&member.UpdatedByAppUser,
			&member.CreatedAt,
			&member.UpdatedAt,
			&memberIdentity.MemberID,
			&memberIdentity.FansubName,
			&memberRoles,
		); err != nil {
			return nil, fmt.Errorf("list fansub group members: scan: %w", err)
		}
		member.Roles = normalizeDistinctStrings(memberRoles)
		if memberIdentity.MemberID > 0 {
			member.Member = &memberIdentity
		}
		members = append(members, member)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list fansub group members: iterate: %w", err)
	}

	return members, nil
}

func (r *FansubGroupAppMemberRepository) Create(ctx context.Context, fansubGroupID int64, input models.FansubGroupMemberCreateInput) (*models.FansubGroupAppMember, error) {
	if fansubGroupID <= 0 || input.AppUserID <= 0 {
		return nil, fmt.Errorf("create fansub group member: invalid ids")
	}
	roles, err := normalizeFansubGroupRoles(input.Roles)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, fmt.Errorf("create fansub group member: at least one role is required")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("create fansub group member: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var memberID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO fansub_group_members (
			fansub_group_id,
			app_user_id,
			status,
			created_by_app_user_id,
			updated_by_app_user_id,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
		RETURNING id
	`, fansubGroupID, input.AppUserID, models.FansubGroupMemberStatusActive, input.CreatedByAppUserID).Scan(&memberID)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create fansub group member: %w", err)
	}

	for _, role := range roles {
		if _, err := tx.Exec(ctx, `
			INSERT INTO fansub_group_member_roles (fansub_group_member_id, role, created_by_app_user_id, created_at)
			VALUES ($1, $2, $3, NOW())
		`, memberID, role, input.CreatedByAppUserID); err != nil {
			return nil, fmt.Errorf("create fansub group member: insert role: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create fansub group member: commit: %w", err)
	}

	return r.GetByID(ctx, memberID)
}

func (r *FansubGroupAppMemberRepository) SetRole(
	ctx context.Context,
	fansubGroupID int64,
	appUserID int64,
	input models.FansubGroupMemberRoleUpdateInput,
) (*models.FansubGroupAppMember, error) {
	if fansubGroupID <= 0 || appUserID <= 0 {
		return nil, fmt.Errorf("set fansub group member role: invalid ids")
	}
	role := strings.TrimSpace(input.Role)
	if !permissions.IsKnownFansubGroupRole(role) {
		return nil, fmt.Errorf("set fansub group member role: unknown role")
	}

	memberID, err := r.lookupMemberID(ctx, fansubGroupID, appUserID)
	if err != nil {
		return nil, err
	}

	if err := r.ensureMemberMutationAllowed(ctx, fansubGroupID, appUserID, func(currentStatus string, currentRoles []string) (string, []string) {
		nextRoles := append([]string{}, currentRoles...)
		if input.Enable {
			nextRoles = append(nextRoles, role)
		} else {
			nextRoles = removeRole(nextRoles, role)
		}
		return currentStatus, normalizeDistinctStrings(nextRoles)
	}); err != nil {
		return nil, err
	}

	if input.Enable {
		if _, err := r.db.Exec(ctx, `
			INSERT INTO fansub_group_member_roles (fansub_group_member_id, role, created_by_app_user_id, created_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (fansub_group_member_id, role) DO NOTHING
		`, memberID, role, input.CreatedByAppUserID); err != nil {
			return nil, fmt.Errorf("set fansub group member role: insert role: %w", err)
		}
	} else {
		if _, err := r.db.Exec(ctx, `
			DELETE FROM fansub_group_member_roles
			WHERE fansub_group_member_id = $1 AND role = $2
		`, memberID, role); err != nil {
			return nil, fmt.Errorf("set fansub group member role: delete role: %w", err)
		}
	}

	now := time.Now().UTC()
	if _, err := r.db.Exec(ctx, `
		UPDATE fansub_group_members
		SET updated_by_app_user_id = $2, updated_at = $3
		WHERE id = $1
	`, memberID, input.CreatedByAppUserID, now); err != nil {
		return nil, fmt.Errorf("set fansub group member role: touch member: %w", err)
	}

	return r.GetByID(ctx, memberID)
}

func (r *FansubGroupAppMemberRepository) UpdateStatus(
	ctx context.Context,
	fansubGroupID int64,
	appUserID int64,
	input models.FansubGroupMemberStatusUpdateInput,
) (*models.FansubGroupAppMember, error) {
	if fansubGroupID <= 0 || appUserID <= 0 {
		return nil, fmt.Errorf("update fansub group member status: invalid ids")
	}
	status := strings.TrimSpace(input.Status)
	if status != models.FansubGroupMemberStatusActive && status != models.FansubGroupMemberStatusDisabled {
		return nil, fmt.Errorf("update fansub group member status: invalid status")
	}

	memberID, err := r.lookupMemberID(ctx, fansubGroupID, appUserID)
	if err != nil {
		return nil, err
	}

	if err := r.ensureMemberMutationAllowed(ctx, fansubGroupID, appUserID, func(_ string, currentRoles []string) (string, []string) {
		return status, currentRoles
	}); err != nil {
		return nil, err
	}

	if _, err := r.db.Exec(ctx, `
		UPDATE fansub_group_members
		SET status = $2, updated_by_app_user_id = $3, updated_at = $4
		WHERE id = $1
	`, memberID, status, input.UpdatedByAppUserID, time.Now().UTC()); err != nil {
		return nil, fmt.Errorf("update fansub group member status: %w", err)
	}

	return r.GetByID(ctx, memberID)
}

func (r *FansubGroupAppMemberRepository) EnsureInvitationAcceptance(
	ctx context.Context,
	fansubGroupID int64,
	appUserID int64,
	roles []string,
	actorAppUserID *int64,
) (*models.FansubGroupAppMember, error) {
	if fansubGroupID <= 0 || appUserID <= 0 {
		return nil, fmt.Errorf("ensure invitation acceptance: invalid ids")
	}

	normalizedRoles, err := normalizeFansubGroupRoles(roles)
	if err != nil {
		return nil, err
	}
	if len(normalizedRoles) == 0 {
		return nil, fmt.Errorf("ensure invitation acceptance: at least one role is required")
	}

	memberID, err := r.lookupMemberID(ctx, fansubGroupID, appUserID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			return nil, err
		}
		return r.Create(ctx, fansubGroupID, models.FansubGroupMemberCreateInput{
			AppUserID:          appUserID,
			Roles:              normalizedRoles,
			CreatedByAppUserID: actorAppUserID,
		})
	}

	member, err := r.GetByID(ctx, memberID)
	if err != nil {
		return nil, err
	}
	if member.Status == models.FansubGroupMemberStatusActive {
		return nil, ErrConflict
	}

	if _, err := r.UpdateStatus(ctx, fansubGroupID, appUserID, models.FansubGroupMemberStatusUpdateInput{
		Status:             models.FansubGroupMemberStatusActive,
		UpdatedByAppUserID: actorAppUserID,
	}); err != nil {
		return nil, err
	}

	existingRoles := make(map[string]struct{}, len(member.Roles))
	for _, role := range member.Roles {
		existingRoles[role] = struct{}{}
	}

	for _, role := range normalizedRoles {
		if _, ok := existingRoles[role]; ok {
			continue
		}
		if _, err := r.SetRole(ctx, fansubGroupID, appUserID, models.FansubGroupMemberRoleUpdateInput{
			Role:               role,
			Enable:             true,
			CreatedByAppUserID: actorAppUserID,
		}); err != nil {
			return nil, err
		}
	}

	return r.GetByID(ctx, memberID)
}

func (r *FansubGroupAppMemberRepository) GetByID(ctx context.Context, memberID int64) (*models.FansubGroupAppMember, error) {
	if memberID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id
		FROM fansub_group_members
		WHERE id = $1
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("get fansub group member: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotFound
	}

	var fansubGroupID int64
	if err := rows.Scan(&fansubGroupID); err != nil {
		return nil, fmt.Errorf("get fansub group member: scan group id: %w", err)
	}

	members, err := r.ListByFansubGroup(ctx, fansubGroupID)
	if err != nil {
		return nil, err
	}
	for _, member := range members {
		if member.ID == memberID {
			copy := member
			return &copy, nil
		}
	}

	return nil, ErrNotFound
}

func (r *FansubGroupAppMemberRepository) lookupMemberID(ctx context.Context, fansubGroupID int64, appUserID int64) (int64, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT id
		FROM fansub_group_members
		WHERE fansub_group_id = $1 AND app_user_id = $2
	`, fansubGroupID, appUserID).Scan(&memberID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, ErrNotFound
		}
		return 0, fmt.Errorf("lookup fansub group member: %w", err)
	}
	return memberID, nil
}

func (r *FansubGroupAppMemberRepository) ensureMemberMutationAllowed(
	ctx context.Context,
	fansubGroupID int64,
	appUserID int64,
	buildNext func(currentStatus string, currentRoles []string) (string, []string),
) error {
	state, err := r.loadGuardState(ctx, fansubGroupID, appUserID)
	if err != nil {
		return err
	}

	nextStatus, nextRoles := buildNext(state.currentStatus, state.currentRoles)
	if conflict := evaluateMemberMutationConflict(
		state.currentStatus,
		state.currentRoles,
		nextStatus,
		nextRoles,
		state.activeLeadCount,
		state.activeManagerCount,
	); conflict != nil {
		return conflict
	}

	return nil
}

type memberGuardState struct {
	currentStatus      string
	currentRoles       []string
	activeLeadCount    int
	activeManagerCount int
}

func (r *FansubGroupAppMemberRepository) loadGuardState(ctx context.Context, fansubGroupID int64, appUserID int64) (memberGuardState, error) {
	memberID, err := r.lookupMemberID(ctx, fansubGroupID, appUserID)
	if err != nil {
		return memberGuardState{}, err
	}

	var state memberGuardState
	if err := r.db.QueryRow(ctx, `
		SELECT
			fgm.status,
			COALESCE(
				ARRAY(
					SELECT role
					FROM fansub_group_member_roles
					WHERE fansub_group_member_id = fgm.id
					ORDER BY role
				),
				ARRAY[]::varchar[]
			) AS roles
		FROM fansub_group_members fgm
		WHERE fgm.id = $1
	`, memberID).Scan(&state.currentStatus, &state.currentRoles); err != nil {
		if err == pgx.ErrNoRows {
			return memberGuardState{}, ErrNotFound
		}
		return memberGuardState{}, fmt.Errorf("load fansub group member guard state: %w", err)
	}

	managerRoles := rolesGrantingMemberManagement()
	if err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(DISTINCT CASE
				WHEN fgm.status = 'active'
					AND EXISTS (
						SELECT 1
						FROM fansub_group_member_roles fgr
						WHERE fgr.fansub_group_member_id = fgm.id
						  AND fgr.role = 'fansub_lead'
					)
				THEN fgm.id
			END) AS active_lead_count,
			COUNT(DISTINCT CASE
				WHEN fgm.status = 'active'
					AND EXISTS (
						SELECT 1
						FROM fansub_group_member_roles fgr
						WHERE fgr.fansub_group_member_id = fgm.id
						  AND fgr.role = ANY($2)
					)
				THEN fgm.id
			END) AS active_manager_count
		FROM fansub_group_members fgm
		WHERE fgm.fansub_group_id = $1
	`, fansubGroupID, managerRoles).Scan(&state.activeLeadCount, &state.activeManagerCount); err != nil {
		return memberGuardState{}, fmt.Errorf("load fansub group member guard counts: %w", err)
	}

	state.currentRoles = normalizeDistinctStrings(state.currentRoles)
	return state, nil
}

func rolesGrantingMemberManagement() []string {
	roles := make([]string, 0, len(permissions.FansubGroupRoles()))
	for _, role := range permissions.FansubGroupRoles() {
		if permissions.RoleAllowsAction(role, permissions.ActionFansubGroupMembersManage) {
			roles = append(roles, role)
		}
	}
	return roles
}

func evaluateMemberMutationConflict(
	currentStatus string,
	currentRoles []string,
	nextStatus string,
	nextRoles []string,
	activeLeadCount int,
	activeManagerCount int,
) error {
	currentActive := strings.TrimSpace(currentStatus) == models.FansubGroupMemberStatusActive
	nextActive := strings.TrimSpace(nextStatus) == models.FansubGroupMemberStatusActive
	currentRoles = normalizeDistinctStrings(currentRoles)
	nextRoles = normalizeDistinctStrings(nextRoles)

	if currentActive && slices.Contains(currentRoles, permissions.RoleFansubLead) &&
		(!nextActive || !slices.Contains(nextRoles, permissions.RoleFansubLead)) &&
		activeLeadCount <= 1 {
		return &MemberMutationConflict{
			Code:    "last_active_lead",
			Message: "Der letzte aktive Fansub-Lead kann nicht entfernt oder deaktiviert werden.",
		}
	}

	if currentActive && memberRolesGrantManagement(currentRoles) &&
		(!nextActive || !memberRolesGrantManagement(nextRoles)) &&
		activeManagerCount <= 1 {
		return &MemberMutationConflict{
			Code:    "last_active_manager",
			Message: "Die letzte aktive Mitgliederverwaltung dieser Gruppe kann nicht entfernt oder deaktiviert werden.",
		}
	}

	return nil
}

func memberRolesGrantManagement(roles []string) bool {
	for _, role := range roles {
		if permissions.RoleAllowsAction(role, permissions.ActionFansubGroupMembersManage) {
			return true
		}
	}
	return false
}

func normalizeFansubGroupRoles(roles []string) ([]string, error) {
	normalized := make([]string, 0, len(roles))
	for _, role := range roles {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		if !permissions.IsKnownFansubGroupRole(trimmed) {
			return nil, fmt.Errorf("unknown fansub group role %q", trimmed)
		}
		normalized = append(normalized, trimmed)
	}
	return normalizeDistinctStrings(normalized), nil
}

func removeRole(roles []string, target string) []string {
	filtered := make([]string, 0, len(roles))
	for _, role := range roles {
		if strings.TrimSpace(role) == strings.TrimSpace(target) {
			continue
		}
		filtered = append(filtered, role)
	}
	return filtered
}
