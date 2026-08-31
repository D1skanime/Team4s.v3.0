package repository

import (
	"context"
	"fmt"
	"time"
)

// ClaimListRow is the richer, cross-group Claims-workspace row (D-23). It is a
// distinct type from MemberClaimRow (member_claims_repository.go) because the
// shape and call sites differ: this row adds fansub-group context and app-user
// display identity for clickable navigation, and is never mutated in place.
type ClaimListRow struct {
	ClaimID            int64      `json:"claim_id"`
	AppUserID          int64      `json:"app_user_id"`
	AppUserEmail       string     `json:"app_user_email"`
	AppUserDisplayName string     `json:"app_user_display_name"`
	MemberID           int64      `json:"member_id"`
	MemberNickname     string     `json:"member_nickname"`
	ClaimStatus        string     `json:"claim_status"`
	ClaimType          string     `json:"claim_type"`
	FansubGroupID      int64      `json:"fansub_group_id"`
	FansubGroupName    string     `json:"fansub_group_name"`
	Note               string     `json:"note"`
	CreatedAt          time.Time  `json:"created_at"`
	VerifiedAt         *time.Time `json:"verified_at"`
	IsActiveMember     bool       `json:"is_active_member"`
}

// ClaimListFilter carries the optional, UND-verknuepften filters for
// ListClaims. All fields are optional; a nil/zero value means "no filter".
type ClaimListFilter struct {
	Status        *string
	Type          *string
	FansubGroupID *int64
	AppUserID     *int64
	From          *time.Time
	To            *time.Time
	Limit         int
	Offset        int
}

// adminListDefaultLimit/adminListMaxLimit mirror the admin_users_repository.go
// / member_archive_repository.go pagination clamp convention (default 25, hard
// max 100) rather than trusting a raw client-supplied limit (T-138-12). Shared
// by ListClaims (this file) and ListChanges (audit_logs_query.go) via
// ClampAdminListPage so the clamp behavior never drifts between the two new
// D-23/D-25 list endpoints.
const (
	adminListDefaultLimit = 25
	adminListMaxLimit     = 100
)

// ClampAdminListPage clamps a client-supplied limit/offset pair to the shared
// admin-list-page convention: limit defaults to 25 when <= 0 and is capped at
// 100; offset floors at 0. Exported so handlers can echo the EFFECTIVE
// (already-clamped) values back in a response envelope's meta block instead
// of the raw, unclamped request values.
func ClampAdminListPage(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = adminListDefaultLimit
	}
	if limit > adminListMaxLimit {
		limit = adminListMaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// ListClaims answers D-23's cross-group, filterable Claims workspace query.
// Unlike ListPendingClaimsForGroup (group-scoped, pending-only), this is a
// platform-admin-only aggregation over ALL groups and ALL claim_status
// values, joining app_users for click-through identity and
// hist_fansub_group_members/fansub_groups for the claim's group context.
// All filter values are bound via numbered placeholders ($N) — never
// string-concatenated into the query text (T-138-11).
func (r *MemberClaimsRepository) ListClaims(ctx context.Context, filter ClaimListFilter) ([]ClaimListRow, int, error) {
	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	args := []any{}
	paramIdx := 1
	var whereClauses []string

	if filter.Status != nil && *filter.Status != "" {
		args = append(args, *filter.Status)
		whereClauses = append(whereClauses, fmt.Sprintf("mc.claim_status = $%d", paramIdx))
		paramIdx++
	}
	if filter.Type != nil && *filter.Type != "" {
		// claim_type has exactly one real value today ('claim', hardcoded — no
		// claim_type column exists on member_claims). The filter is accepted for
		// forward-compatibility per the plan's literal spec, matching against the
		// same literal the SELECT always projects.
		args = append(args, *filter.Type)
		whereClauses = append(whereClauses, fmt.Sprintf("'claim' = $%d", paramIdx))
		paramIdx++
	}
	if filter.FansubGroupID != nil && *filter.FansubGroupID > 0 {
		args = append(args, *filter.FansubGroupID)
		whereClauses = append(whereClauses, fmt.Sprintf("hgm.fansub_group_id = $%d", paramIdx))
		paramIdx++
	}
	if filter.AppUserID != nil && *filter.AppUserID > 0 {
		args = append(args, *filter.AppUserID)
		whereClauses = append(whereClauses, fmt.Sprintf("mc.app_user_id = $%d", paramIdx))
		paramIdx++
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		whereClauses = append(whereClauses, fmt.Sprintf("mc.created_at >= $%d", paramIdx))
		paramIdx++
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		whereClauses = append(whereClauses, fmt.Sprintf("mc.created_at <= $%d", paramIdx))
		paramIdx++
	}

	whereSQL := ""
	for _, clause := range whereClauses {
		whereSQL += " AND " + clause
	}

	args = append(args, limit, offset)
	limitParam := paramIdx
	offsetParam := paramIdx + 1

	query := fmt.Sprintf(`
		SELECT
			mc.id,
			COALESCE(mc.app_user_id, 0),
			COALESCE(au.email, ''),
			COALESCE(NULLIF(au.display_name, ''), NULLIF(au.preferred_username, ''), au.email, ''),
			mc.member_id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied'),
			mc.claim_status,
			'claim',
			hgm.fansub_group_id,
			COALESCE(fg.name, ''),
			COALESCE(mc.note, ''),
			mc.created_at,
			mc.verified_at,
			EXISTS (
				SELECT 1
				FROM fansub_group_members fgm
				WHERE fgm.fansub_group_id = hgm.fansub_group_id
					AND fgm.app_user_id = mc.app_user_id
					AND fgm.status = 'active'
			) AS is_active_member,
			COUNT(*) OVER() AS total_count
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN hist_fansub_group_members hgm ON hgm.member_id = mc.member_id
		JOIN fansub_groups fg ON fg.id = hgm.fansub_group_id
		LEFT JOIN app_users au ON au.id = mc.app_user_id
		WHERE 1 = 1%s
		ORDER BY mc.created_at DESC, mc.id DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitParam, offsetParam)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list claims: %w", err)
	}
	defer rows.Close()

	items := make([]ClaimListRow, 0)
	var total int
	for rows.Next() {
		var row ClaimListRow
		if err := rows.Scan(
			&row.ClaimID,
			&row.AppUserID,
			&row.AppUserEmail,
			&row.AppUserDisplayName,
			&row.MemberID,
			&row.MemberNickname,
			&row.ClaimStatus,
			&row.ClaimType,
			&row.FansubGroupID,
			&row.FansubGroupName,
			&row.Note,
			&row.CreatedAt,
			&row.VerifiedAt,
			&row.IsActiveMember,
			&total,
		); err != nil {
			return nil, 0, fmt.Errorf("list claims: scan: %w", err)
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list claims: iterate: %w", err)
	}

	return items, total, nil
}
