package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HistGroupMemberRow struct {
	ID            int64
	FansubGroupID int64
	MemberID      int64
	JoinedDate    *time.Time
	LeftDate      *time.Time
	Status        string
	Visibility    string
	ConfirmedBy   *int64
	ConfirmedAt   *time.Time
	CreatedBy     *int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type HistGroupMemberInput struct {
	FansubGroupID int64
	MemberID      int64
	JoinedDate    *time.Time
	LeftDate      *time.Time
	Status        string
	Visibility    string
	ConfirmedBy   *int64
	CreatedBy     *int64
}

type HistGroupMemberPatchInput struct {
	JoinedDate  **time.Time
	LeftDate    **time.Time
	Status      *string
	Visibility  *string
	ConfirmedBy *int64
}

type HistGroupMembersRepository struct {
	db *pgxpool.Pool
}

func NewHistGroupMembersRepository(db *pgxpool.Pool) *HistGroupMembersRepository {
	return &HistGroupMembersRepository{db: db}
}

// HistGroupMemberDisplayRow is the frontend-facing response type for hist_fansub_group_members,
// enriched with display data from the members table.
type HistGroupMemberDisplayRow struct {
	ID                     int64      `json:"id"`
	FansubGroupID          int64      `json:"fansub_group_id"`
	MemberID               int64      `json:"member_id"`
	DisplayName            string     `json:"display_name"`
	AppUserID              *int64     `json:"app_user_id"`
	AppUsername            *string    `json:"app_username"`
	ActiveAppMemberID      *int64     `json:"active_app_member_id,omitempty"`
	JoinedDate             *time.Time `json:"joined_date"`
	LeftDate               *time.Time `json:"left_date"`
	Status                 string     `json:"status"`
	ConfirmedByAppUserID   *int64     `json:"confirmed_by_app_user_id"`
	ConfirmedByDisplayName *string    `json:"confirmed_by_display_name"`
	ConfirmedAt            *time.Time `json:"confirmed_at"`
	CreatedAt              time.Time  `json:"created_at"`
}

// ListByFansubGroupWithDisplay returns members of a fansub group enriched with display names
// from the members table. Used by admin endpoints that serve data to the frontend.
func (r *HistGroupMembersRepository) ListByFansubGroupWithDisplay(ctx context.Context, fansubGroupID int64) ([]HistGroupMemberDisplayRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT hfgm.id, hfgm.fansub_group_id, hfgm.member_id,
		       m.nickname AS display_name,
		       claimed_user.id AS app_user_id,
		       COALESCE(NULLIF(TRIM(claimed_user.preferred_username), ''), NULLIF(TRIM(claimed_user.display_name), ''), NULLIF(TRIM(claimed_user.email), '')) AS app_username,
		       active_group_member.id AS active_app_member_id,
		       hfgm.joined_date, hfgm.left_date, hfgm.status,
		       hfgm.confirmed_by AS confirmed_by_app_user_id,
		       COALESCE(NULLIF(TRIM(confirmer.preferred_username), ''), NULLIF(TRIM(confirmer.display_name), ''), NULLIF(TRIM(confirmer.email), '')) AS confirmed_by_display_name,
		       hfgm.confirmed_at,
		       hfgm.created_at
		FROM hist_fansub_group_members hfgm
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN LATERAL (
			SELECT mc.app_user_id
			FROM member_claims mc
			WHERE mc.member_id = hfgm.member_id
			  AND mc.claim_status = 'verified'
			ORDER BY mc.verified_at DESC NULLS LAST, mc.id DESC
			LIMIT 1
		) verified_claim ON true
		LEFT JOIN app_users claimed_user ON claimed_user.id = verified_claim.app_user_id
		LEFT JOIN fansub_group_members active_group_member
			ON active_group_member.fansub_group_id = hfgm.fansub_group_id
		   AND active_group_member.app_user_id = verified_claim.app_user_id
		   AND active_group_member.status = 'active'
		LEFT JOIN app_users confirmer ON confirmer.id = hfgm.confirmed_by
		WHERE hfgm.fansub_group_id = $1
		ORDER BY COALESCE(hfgm.joined_date, '9999-01-01'::date), hfgm.id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list hist group members with display: %w", err)
	}
	defer rows.Close()

	result := make([]HistGroupMemberDisplayRow, 0)
	for rows.Next() {
		var row HistGroupMemberDisplayRow
		if err := rows.Scan(
			&row.ID, &row.FansubGroupID, &row.MemberID,
			&row.DisplayName, &row.AppUserID, &row.AppUsername,
			&row.ActiveAppMemberID,
			&row.JoinedDate, &row.LeftDate, &row.Status,
			&row.ConfirmedByAppUserID, &row.ConfirmedByDisplayName, &row.ConfirmedAt,
			&row.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("list hist group members with display: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list hist group members with display: iterate: %w", err)
	}
	return result, nil
}

func (r *HistGroupMembersRepository) ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]HistGroupMemberRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE fansub_group_id = $1
		ORDER BY COALESCE(joined_date, '9999-01-01'::date), id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list hist group members: %w", err)
	}
	defer rows.Close()

	result := make([]HistGroupMemberRow, 0)
	for rows.Next() {
		var row HistGroupMemberRow
		if err := rows.Scan(
			&row.ID, &row.FansubGroupID, &row.MemberID,
			&row.JoinedDate, &row.LeftDate,
			&row.Status, &row.Visibility,
			&row.ConfirmedBy, &row.ConfirmedAt,
			&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("list hist group members: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list hist group members: iterate: %w", err)
	}
	return result, nil
}

func (r *HistGroupMembersRepository) GetByID(ctx context.Context, id int64) (*HistGroupMemberRow, error) {
	var row HistGroupMemberRow
	err := r.db.QueryRow(ctx, `
		SELECT id, fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE id = $1
	`, id).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedDate, &row.LeftDate,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get hist group member: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMembersRepository) GetByIDForFansub(ctx context.Context, fansubGroupID int64, id int64) (*HistGroupMemberRow, error) {
	var row HistGroupMemberRow
	err := r.db.QueryRow(ctx, `
		SELECT id, fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE id = $1 AND fansub_group_id = $2
	`, id, fansubGroupID).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedDate, &row.LeftDate,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get hist group member for fansub: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMembersRepository) Create(ctx context.Context, input HistGroupMemberInput) (*HistGroupMemberRow, error) {
	var row HistGroupMemberRow
	err := r.db.QueryRow(ctx, `
		INSERT INTO hist_fansub_group_members
			(fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 = 'confirmed' AND $7 IS NOT NULL THEN $7 ELSE NULL END, CASE WHEN $5 = 'confirmed' AND $7 IS NOT NULL THEN NOW() ELSE NULL END, $8)
		RETURNING id, fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by, created_at, updated_at
	`, input.FansubGroupID, input.MemberID, input.JoinedDate, input.LeftDate,
		input.Status, input.Visibility, input.ConfirmedBy, input.CreatedBy,
	).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedDate, &row.LeftDate,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create hist group member: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMembersRepository) Update(ctx context.Context, fansubGroupID int64, id int64, input HistGroupMemberPatchInput) (*HistGroupMemberRow, error) {
	setClauses := make([]string, 0, 5)
	args := make([]any, 0, 6)
	argIdx := 1

	if input.JoinedDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("joined_date = $%d", argIdx))
		args = append(args, *input.JoinedDate)
		argIdx++
	}
	if input.LeftDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("left_date = $%d", argIdx))
		args = append(args, *input.LeftDate)
		argIdx++
	}
	if input.Status != nil {
		statusArgIdx := argIdx
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", statusArgIdx))
		args = append(args, *input.Status)
		argIdx++
		if input.ConfirmedBy != nil {
			actorArgIdx := argIdx
			args = append(args, *input.ConfirmedBy)
			argIdx++
			setClauses = append(setClauses,
				fmt.Sprintf("confirmed_by = CASE WHEN $%d = 'confirmed' AND (status <> 'confirmed' OR confirmed_by IS NULL) THEN $%d WHEN $%d <> 'confirmed' THEN NULL ELSE confirmed_by END", statusArgIdx, actorArgIdx, statusArgIdx),
				fmt.Sprintf("confirmed_at = CASE WHEN $%d = 'confirmed' AND (status <> 'confirmed' OR confirmed_at IS NULL) THEN NOW() WHEN $%d <> 'confirmed' THEN NULL ELSE confirmed_at END", statusArgIdx, statusArgIdx),
			)
		} else {
			setClauses = append(setClauses,
				fmt.Sprintf("confirmed_by = CASE WHEN $%d <> 'confirmed' THEN NULL ELSE confirmed_by END", statusArgIdx),
				fmt.Sprintf("confirmed_at = CASE WHEN $%d <> 'confirmed' THEN NULL ELSE confirmed_at END", statusArgIdx),
			)
		}
	}
	if input.Visibility != nil {
		setClauses = append(setClauses, fmt.Sprintf("visibility = $%d", argIdx))
		args = append(args, *input.Visibility)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByIDForFansub(ctx, fansubGroupID, id)
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)
	idxID := argIdx
	argIdx++
	args = append(args, fansubGroupID)

	query := fmt.Sprintf(`
		UPDATE hist_fansub_group_members
		SET %s
		WHERE id = $%d AND fansub_group_id = $%d
		RETURNING id, fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by, created_at, updated_at
	`, strings.Join(setClauses, ", "), idxID, argIdx)

	var row HistGroupMemberRow
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedDate, &row.LeftDate,
		&row.Status, &row.Visibility,
		&row.ConfirmedBy, &row.ConfirmedAt,
		&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update hist group member: %w", err)
	}
	return &row, nil
}

func (r *HistGroupMembersRepository) Delete(ctx context.Context, fansubGroupID int64, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM hist_fansub_group_members WHERE id = $1 AND fansub_group_id = $2`, id, fansubGroupID)
	if err != nil {
		return fmt.Errorf("delete hist group member: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// HistGroupMemberAutoCreateInput is used by CreateWithAutoMember to create a new members row
// and a hist_fansub_group_members row in a single transaction.
type HistGroupMemberAutoCreateInput struct {
	FansubGroupID int64
	DisplayName   string // wird als members.nickname gesetzt
	JoinedDate    *time.Time
	LeftDate      *time.Time
	Status        string
	Visibility    string
	ConfirmedBy   *int64
	CreatedBy     *int64
}

// CreateWithAutoMember legt automatisch eine members-Zeile (nickname = DisplayName, user_id = NULL)
// an und erstellt dann den hist_fansub_group_members-Eintrag in einer Transaktion.
// user_id in members bleibt NULL per Annahme A1: members.user_id referenziert die Legacy-Tabelle
// users(id); ein Mapping von app_users(id) auf users(id) existiert nicht ohne separaten Join.
func (r *HistGroupMembersRepository) CreateWithAutoMember(
	ctx context.Context,
	input HistGroupMemberAutoCreateInput,
) (*HistGroupMemberDisplayRow, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("create with auto member: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var memberID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO members (nickname) VALUES ($1) RETURNING id
	`, input.DisplayName).Scan(&memberID); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create with auto member: insert members: %w", err)
	}

	var row HistGroupMemberDisplayRow
	if err := tx.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO hist_fansub_group_members
				(fansub_group_id, member_id, joined_date, left_date, status, visibility, confirmed_by, confirmed_at, created_by)
			VALUES ($1, $2, $3, $4, $5::varchar, $6::varchar, CASE WHEN $5::varchar = 'confirmed' AND $7::bigint IS NOT NULL THEN $7::bigint ELSE NULL END, CASE WHEN $5::varchar = 'confirmed' AND $7::bigint IS NOT NULL THEN NOW() ELSE NULL END, $8)
			RETURNING id, fansub_group_id, member_id, joined_date, left_date, status, confirmed_by, confirmed_at, created_at
		)
		SELECT inserted.id,
		       inserted.fansub_group_id,
		       inserted.member_id,
		       inserted.joined_date,
		       inserted.left_date,
		       inserted.status,
		       inserted.confirmed_by AS confirmed_by_app_user_id,
		       COALESCE(NULLIF(TRIM(confirmer.preferred_username), ''), NULLIF(TRIM(confirmer.display_name), ''), NULLIF(TRIM(confirmer.email), '')) AS confirmed_by_display_name,
		       inserted.confirmed_at,
		       inserted.created_at
		FROM inserted
		LEFT JOIN app_users confirmer ON confirmer.id = inserted.confirmed_by
	`,
		input.FansubGroupID,
		memberID,
		input.JoinedDate,
		input.LeftDate,
		input.Status,
		input.Visibility,
		input.ConfirmedBy,
		input.CreatedBy,
	).Scan(
		&row.ID,
		&row.FansubGroupID,
		&row.MemberID,
		&row.JoinedDate,
		&row.LeftDate,
		&row.Status,
		&row.ConfirmedByAppUserID,
		&row.ConfirmedByDisplayName,
		&row.ConfirmedAt,
		&row.CreatedAt,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create with auto member: insert hist_fansub_group_members: %w", err)
	}

	row.DisplayName = input.DisplayName
	row.AppUserID = nil
	row.AppUsername = nil

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create with auto member: commit: %w", err)
	}

	return &row, nil
}
