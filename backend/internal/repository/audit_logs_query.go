package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// auditLogsQueryDBTX is the minimal query surface ListChanges needs beyond
// AuditLogRepository's existing DBTX (Exec + QueryRow, audit_logs.go).
// Mirrors the existing authzUserOverridesDBTX/releaseCrewDBTX pattern
// (authz_user_overrides.go) rather than widening the shared DBTX interface
// itself, since Write()/other AuditLogRepository callers never need Query.
type auditLogsQueryDBTX interface {
	DBTX
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// ChangeListRow mirrors AdminAuditEntry's existing field set
// (event_id/event_type/target_type/target_id/action/outcome/occurred_at)
// plus actor_app_user_id, scope_type, scope_id, and the raw payload JSONB.
// This endpoint does not interpret payload contents — a later frontend
// translation layer reads specific known keys out of it per event_type.
type ChangeListRow struct {
	EventID        int64           `json:"event_id"`
	EventType      string          `json:"event_type"`
	TargetType     string          `json:"target_type"`
	TargetID       *int64          `json:"target_id"`
	Action         string          `json:"action"`
	Outcome        string          `json:"outcome"`
	OccurredAt     time.Time       `json:"occurred_at"`
	ActorAppUserID *int64          `json:"actor_app_user_id"`
	ScopeType      string          `json:"scope_type"`
	ScopeID        *int64          `json:"scope_id"`
	Payload        json.RawMessage `json:"payload"`
}

// ChangeListFilter carries the optional, UND-verknuepften filters for
// ListChanges. All fields are optional; a nil/zero value means "no filter".
//
// benutzer maps onto AppUserID (GetUserAudit's exact OR-clause shape:
// actor_app_user_id = $N OR (target_type = 'app_user' AND target_id = $N)).
// akteur maps onto ActorAppUserID, a distinct strict actor-only match
// (actor_app_user_id = $N) — the two are independent, AND-combinable
// filters, matching the OpenAPI contract's documented semantics
// (shared/contracts/admin-capabilities.yaml).
// gruppe maps onto ScopeGroupID (scope_type = 'group' AND scope_id = $N).
// rolle/capability/claim filters do not have dedicated columns on audit_logs
// today and are intentionally NOT exposed here — only TargetType (matching
// e.g. 'role_capability', 'user_group_capability_override', 'member_claim')
// is exposed, per this plan's real-vocabulary constraint.
type ChangeListFilter struct {
	AppUserID      *int64
	ActorAppUserID *int64
	ScopeGroupID   *int64
	TargetType     *string
	From           *time.Time
	To             *time.Time
	Limit          int
	Offset         int
}

// ListChanges answers D-25/D-28's cross-group, filterable Aenderungen
// (audit) workspace query. Unlike GetUserAudit (single-user, embedded in the
// user-detail drawer), this is a platform-admin-only aggregation across ALL
// users/groups/target types. All filter values are bound via numbered
// placeholders ($N) — never string-concatenated into the query text
// (T-138-11).
//
// Date-boundary convention (documented per this plan's requirement): `from`
// is INCLUSIVE (created_at >= from), `to` is INCLUSIVE (created_at <= to).
// Callers that want an exclusive upper bound should pass the boundary minus
// one time unit; this mirrors the simpler, symmetric >=/<= convention used
// elsewhere in this codebase (e.g. member_archive_repository.go's year
// range filters) rather than inventing a half-open-interval convention here.
func (r *AuditLogRepository) ListChanges(ctx context.Context, filter ChangeListFilter) ([]ChangeListRow, int, error) {
	if r == nil || r.db == nil {
		return []ChangeListRow{}, 0, nil
	}
	queryable, ok := r.db.(auditLogsQueryDBTX)
	if !ok {
		return nil, 0, fmt.Errorf("list changes: db does not support Query")
	}

	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	args := []any{}
	paramIdx := 1
	var whereClauses []string

	if filter.AppUserID != nil && *filter.AppUserID > 0 {
		args = append(args, *filter.AppUserID)
		whereClauses = append(whereClauses, fmt.Sprintf(
			"(al.actor_app_user_id = $%d OR (al.target_type = 'app_user' AND al.target_id = $%d))",
			paramIdx, paramIdx,
		))
		paramIdx++
	}
	if filter.ActorAppUserID != nil && *filter.ActorAppUserID > 0 {
		args = append(args, *filter.ActorAppUserID)
		whereClauses = append(whereClauses, fmt.Sprintf("al.actor_app_user_id = $%d", paramIdx))
		paramIdx++
	}
	if filter.ScopeGroupID != nil && *filter.ScopeGroupID > 0 {
		args = append(args, *filter.ScopeGroupID)
		whereClauses = append(whereClauses, fmt.Sprintf("(al.scope_type = 'group' AND al.scope_id = $%d)", paramIdx))
		paramIdx++
	}
	if filter.TargetType != nil && *filter.TargetType != "" {
		args = append(args, *filter.TargetType)
		whereClauses = append(whereClauses, fmt.Sprintf("al.target_type = $%d", paramIdx))
		paramIdx++
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		whereClauses = append(whereClauses, fmt.Sprintf("al.created_at >= $%d", paramIdx))
		paramIdx++
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		whereClauses = append(whereClauses, fmt.Sprintf("al.created_at <= $%d", paramIdx))
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
			al.id,
			al.event_type,
			COALESCE(al.target_type, ''),
			al.target_id,
			COALESCE(al.action_name, ''),
			COALESCE(al.outcome, ''),
			al.created_at,
			al.actor_app_user_id,
			COALESCE(al.scope_type, ''),
			al.scope_id,
			al.payload,
			COUNT(*) OVER() AS total_count
		FROM audit_logs al
		WHERE 1 = 1%s
		ORDER BY al.created_at DESC, al.id DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitParam, offsetParam)

	rows, err := queryable.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list changes: %w", err)
	}
	defer rows.Close()

	items := make([]ChangeListRow, 0)
	var total int
	for rows.Next() {
		var row ChangeListRow
		var payload []byte
		if err := rows.Scan(
			&row.EventID,
			&row.EventType,
			&row.TargetType,
			&row.TargetID,
			&row.Action,
			&row.Outcome,
			&row.OccurredAt,
			&row.ActorAppUserID,
			&row.ScopeType,
			&row.ScopeID,
			&payload,
			&total,
		); err != nil {
			return nil, 0, fmt.Errorf("list changes: scan: %w", err)
		}
		row.Payload = payload
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list changes: iterate: %w", err)
	}

	return items, total, nil
}
