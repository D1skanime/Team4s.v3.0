package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// authzUserOverridesDBTX is the minimal query surface this repository needs.
// It embeds the shared DBTX (Exec + QueryRow) and adds Query for batched
// reads, mirroring the existing releaseCrewDBTX pattern
// (release_crew_snapshot_repository.go) so the same repository code runs
// unmodified against both *pgxpool.Pool and a caller-owned pgx.Tx.
type authzUserOverridesDBTX interface {
	DBTX
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// UserGroupCapabilityOverride is one current group-scoped personal
// allow/deny row. It never crosses fansub-group boundaries: every read is
// filtered by an explicit (app_user_id, fansub_group_id) pair.
type UserGroupCapabilityOverride struct {
	AppUserID     int64
	FansubGroupID int64
	ActionCode    string
	Effect        string // "allow" | "deny"
}

// TargetMembership is the server-resolved, lockable membership row a
// mutation must validate against before writing an override. Status
// reflects the membership's actual lifecycle state (e.g. "active"/
// "disabled") so the caller can distinguish an inactive membership from a
// genuinely missing one (ErrNotFound) without a second, unscoped lookup.
type TargetMembership struct {
	MembershipID  int64
	AppUserID     int64
	FansubGroupID int64
	MemberID      *int64
	Status        string
	AppUserStatus string
}

// CapabilityOverridePolicy is the catalog fact a mutation must validate
// before attempting to persist an override; user_overridable=false is also
// enforced by the database's composite FK (migration 0146) as a fail-closed
// backstop independent of this service-level check.
type CapabilityOverridePolicy struct {
	ActionCode      string
	UserOverridable bool
}

// UserGroupCapabilityOverrideHistoryEntry is one immutable, append-only
// transition record. The database rejects UPDATE/DELETE on the underlying
// table (migration 0146's trigger); this repository only ever inserts and
// lists.
type UserGroupCapabilityOverrideHistoryEntry struct {
	ID                   int64
	AppUserID            int64
	FansubGroupID        int64
	ActionCode           string
	ActorAppUserID       int64
	ActorIsPlatformAdmin bool
	BeforeEffect         *string
	AfterEffect          *string
	ReasonCategory       *string
	ReasonText           *string
	OccurredAt           time.Time
}

// AuthzUserOverridesRepository provides batch-oriented, group-scoped,
// transaction-compatible persistence primitives for per-user capability
// overrides. It never evaluates precedence or business rules -- that
// belongs to the resolver/mutation service built in a later Phase-137 plan.
type AuthzUserOverridesRepository struct {
	db authzUserOverridesDBTX
}

func NewAuthzUserOverridesRepository(db authzUserOverridesDBTX) *AuthzUserOverridesRepository {
	return &AuthzUserOverridesRepository{db: db}
}

func (r *AuthzUserOverridesRepository) WithDB(db authzUserOverridesDBTX) *AuthzUserOverridesRepository {
	return NewAuthzUserOverridesRepository(db)
}

// LoadCurrentOverrides batch-loads every current override row for exactly
// one (app_user_id, fansub_group_id) pair in one query -- the resolver must
// never issue a query per action code (D09/QUAL-03).
func (r *AuthzUserOverridesRepository) LoadCurrentOverrides(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
) ([]UserGroupCapabilityOverride, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return nil, fmt.Errorf("load current overrides: %w", ErrValidation)
	}

	rows, err := r.db.Query(ctx, `
		SELECT app_user_id, fansub_group_id, action_code, effect
		FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = $2
		ORDER BY action_code
	`, appUserID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("load current overrides app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	defer rows.Close()

	overrides := make([]UserGroupCapabilityOverride, 0)
	for rows.Next() {
		var o UserGroupCapabilityOverride
		if err := rows.Scan(&o.AppUserID, &o.FansubGroupID, &o.ActionCode, &o.Effect); err != nil {
			return nil, fmt.Errorf("load current overrides app_user=%d fansub_group=%d: scan: %w", appUserID, fansubGroupID, err)
		}
		overrides = append(overrides, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load current overrides app_user=%d fansub_group=%d: iterate: %w", appUserID, fansubGroupID, err)
	}
	return overrides, nil
}

// LoadCurrentOverridesForGroups batch-loads every current override row for one app_user_id
// across ALL of fansubGroupIDs in ONE query (Plan 139-05 Task 2, F-01/UADM-06) -- the batched
// rights-summary orchestration must never issue a query per group. Mirrors LoadCurrentOverrides'
// exact single-group query shape, only widening the fansub_group_id predicate to ANY($2::bigint[]).
func (r *AuthzUserOverridesRepository) LoadCurrentOverridesForGroups(
	ctx context.Context,
	appUserID int64,
	fansubGroupIDs []int64,
) (map[int64][]UserGroupCapabilityOverride, error) {
	result := make(map[int64][]UserGroupCapabilityOverride, len(fansubGroupIDs))
	if r == nil || r.db == nil || appUserID <= 0 || len(fansubGroupIDs) == 0 {
		return result, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT app_user_id, fansub_group_id, action_code, effect
		FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = ANY($2::bigint[])
		ORDER BY fansub_group_id, action_code
	`, appUserID, fansubGroupIDs)
	if err != nil {
		return nil, fmt.Errorf("load current overrides for groups app_user=%d: %w", appUserID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var o UserGroupCapabilityOverride
		if err := rows.Scan(&o.AppUserID, &o.FansubGroupID, &o.ActionCode, &o.Effect); err != nil {
			return nil, fmt.Errorf("load current overrides for groups app_user=%d: scan: %w", appUserID, err)
		}
		result[o.FansubGroupID] = append(result[o.FansubGroupID], o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load current overrides for groups app_user=%d: iterate: %w", appUserID, err)
	}
	return result, nil
}

// LockTargetMembership resolves and row-locks exactly the membership
// identified by (app_user_id, fansub_group_id), regardless of its status,
// so a caller-owned transaction can safely validate and mutate against it.
// Returns ErrNotFound only when no membership row exists for that exact
// user+group pair; an existing-but-inactive membership is returned with its
// real Status so the caller can distinguish the two cases without a second,
// unscoped query, and a manipulated/foreign fansub_group_id simply resolves
// no row (BOLA/IDOR-safe by construction).
func (r *AuthzUserOverridesRepository) LockTargetMembership(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
) (*TargetMembership, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return nil, fmt.Errorf("lock target membership: %w", ErrValidation)
	}

	var membership TargetMembership
	err := r.db.QueryRow(ctx, `
		SELECT fgm.id, fgm.app_user_id, fgm.fansub_group_id, fgm.member_id, fgm.status, au.status
		FROM fansub_group_members fgm
		JOIN app_users au ON au.id = fgm.app_user_id
		WHERE fgm.app_user_id = $1 AND fgm.fansub_group_id = $2
		FOR UPDATE OF fgm
	`, appUserID, fansubGroupID).Scan(
		&membership.MembershipID,
		&membership.AppUserID,
		&membership.FansubGroupID,
		&membership.MemberID,
		&membership.Status,
		&membership.AppUserStatus,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("target membership app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("lock target membership app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	return &membership, nil
}

// LoadOverridePolicy returns the catalog's user_overridable fact for one
// action code, letting a mutation service reject a non-overridable action
// with a clean validation error instead of a raw FK-violation from
// Postgres.
func (r *AuthzUserOverridesRepository) LoadOverridePolicy(
	ctx context.Context,
	actionCode string,
) (*CapabilityOverridePolicy, error) {
	actionCode = strings.TrimSpace(actionCode)
	if r == nil || r.db == nil || actionCode == "" {
		return nil, fmt.Errorf("load override policy: %w", ErrValidation)
	}

	var policy CapabilityOverridePolicy
	err := r.db.QueryRow(ctx, `
		SELECT code, user_overridable
		FROM action_definitions
		WHERE code = $1
	`, actionCode).Scan(&policy.ActionCode, &policy.UserOverridable)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("override policy action=%q: %w", actionCode, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("load override policy action=%q: %w", actionCode, err)
	}
	return &policy, nil
}

// UpsertOverride locks the current override row (if any) and then inserts
// or updates it to the requested effect in one caller-owned transaction,
// returning both the before-state (nil if none existed) and the after-state
// to the caller so a mutation service can compute a real-change-vs-no-op
// decision without a second read. effect must be exactly "allow" or "deny".
func (r *AuthzUserOverridesRepository) UpsertOverride(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
	actionCode string,
	effect string,
	actorAppUserID int64,
) (beforeEffect *string, afterEffect string, err error) {
	actionCode = strings.TrimSpace(actionCode)
	effect = strings.TrimSpace(effect)
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 || actionCode == "" || actorAppUserID <= 0 {
		return nil, "", fmt.Errorf("upsert override: %w", ErrValidation)
	}
	if effect != "allow" && effect != "deny" {
		return nil, "", fmt.Errorf("upsert override: %w", ErrValidation)
	}

	var before *string
	lockErr := r.db.QueryRow(ctx, `
		SELECT effect
		FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
		FOR UPDATE
	`, appUserID, fansubGroupID, actionCode).Scan(&before)
	if lockErr != nil && !errors.Is(lockErr, pgx.ErrNoRows) {
		return nil, "", fmt.Errorf(
			"upsert override lock app_user=%d fansub_group=%d action=%q: %w",
			appUserID, fansubGroupID, actionCode, lockErr,
		)
	}

	if _, err := r.db.Exec(ctx, `
		INSERT INTO user_group_capability_overrides (
			app_user_id, fansub_group_id, action_code, effect,
			created_by_app_user_id, updated_by_app_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $5)
		ON CONFLICT (app_user_id, fansub_group_id, action_code)
		DO UPDATE SET
			effect = EXCLUDED.effect,
			updated_by_app_user_id = EXCLUDED.updated_by_app_user_id,
			updated_at = NOW()
	`, appUserID, fansubGroupID, actionCode, effect, actorAppUserID); err != nil {
		return nil, "", fmt.Errorf(
			"upsert override app_user=%d fansub_group=%d action=%q: %w",
			appUserID, fansubGroupID, actionCode, err,
		)
	}

	return before, effect, nil
}

// DeleteOverride atomically locks and removes exactly the current override
// row for (app_user_id, fansub_group_id, action_code), returning its
// before-state (nil if no row existed -- a true no-op, not an error).
func (r *AuthzUserOverridesRepository) DeleteOverride(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
	actionCode string,
) (beforeEffect *string, err error) {
	actionCode = strings.TrimSpace(actionCode)
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 || actionCode == "" {
		return nil, fmt.Errorf("delete override: %w", ErrValidation)
	}

	var before *string
	err = r.db.QueryRow(ctx, `
		DELETE FROM user_group_capability_overrides
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
		RETURNING effect
	`, appUserID, fansubGroupID, actionCode).Scan(&before)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf(
			"delete override app_user=%d fansub_group=%d action=%q: %w",
			appUserID, fansubGroupID, actionCode, err,
		)
	}
	return before, nil
}

// AppendHistory inserts exactly one immutable transition record. The
// database's append-only trigger (migration 0146) is the last line of
// defense against later mutation; this repository never issues UPDATE or
// DELETE against the history table.
func (r *AuthzUserOverridesRepository) AppendHistory(
	ctx context.Context,
	entry UserGroupCapabilityOverrideHistoryEntry,
) (int64, error) {
	actionCode := strings.TrimSpace(entry.ActionCode)
	if r == nil || r.db == nil || entry.AppUserID <= 0 || entry.FansubGroupID <= 0 || actionCode == "" || entry.ActorAppUserID <= 0 {
		return 0, fmt.Errorf("append override history: %w", ErrValidation)
	}

	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO user_group_capability_override_history (
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			actor_is_platform_admin, before_effect, after_effect,
			reason_category, reason_text
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`,
		entry.AppUserID, entry.FansubGroupID, actionCode, entry.ActorAppUserID,
		entry.ActorIsPlatformAdmin, entry.BeforeEffect, entry.AfterEffect,
		entry.ReasonCategory, entry.ReasonText,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf(
			"append override history app_user=%d fansub_group=%d action=%q: %w",
			entry.AppUserID, entry.FansubGroupID, actionCode, err,
		)
	}
	return id, nil
}

// ListHistoryForSubject lists history rows always constrained by an
// explicit (app_user_id, fansub_group_id) pair -- callers must never be
// able to list another group's or another user's history through this
// method.
func (r *AuthzUserOverridesRepository) ListHistoryForSubject(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
	limit int,
	offset int,
) ([]UserGroupCapabilityOverrideHistoryEntry, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return nil, fmt.Errorf("list override history: %w", ErrValidation)
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, app_user_id, fansub_group_id, action_code, actor_app_user_id,
		       actor_is_platform_admin, before_effect, after_effect,
		       reason_category, reason_text, occurred_at
		FROM user_group_capability_override_history
		WHERE app_user_id = $1 AND fansub_group_id = $2
		ORDER BY occurred_at DESC, id DESC
		LIMIT $3 OFFSET $4
	`, appUserID, fansubGroupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list override history app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	defer rows.Close()

	entries := make([]UserGroupCapabilityOverrideHistoryEntry, 0)
	for rows.Next() {
		var e UserGroupCapabilityOverrideHistoryEntry
		if err := rows.Scan(
			&e.ID, &e.AppUserID, &e.FansubGroupID, &e.ActionCode, &e.ActorAppUserID,
			&e.ActorIsPlatformAdmin, &e.BeforeEffect, &e.AfterEffect,
			&e.ReasonCategory, &e.ReasonText, &e.OccurredAt,
		); err != nil {
			return nil, fmt.Errorf("list override history app_user=%d fansub_group=%d: scan: %w", appUserID, fansubGroupID, err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list override history app_user=%d fansub_group=%d: iterate: %w", appUserID, fansubGroupID, err)
	}
	return entries, nil
}
