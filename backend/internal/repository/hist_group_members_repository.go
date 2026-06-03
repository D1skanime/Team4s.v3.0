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
	JoinedYear    *int
	LeftYear      *int
	Status        string
	Visibility    string
	CreatedBy     *int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type HistGroupMemberInput struct {
	FansubGroupID int64
	MemberID      int64
	JoinedYear    *int
	LeftYear      *int
	Status        string
	Visibility    string
	CreatedBy     *int64
}

type HistGroupMemberPatchInput struct {
	JoinedYear **int
	LeftYear   **int
	Status     *string
	Visibility *string
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
	ID            int64     `json:"id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	MemberID      int64     `json:"member_id"`
	DisplayName   string    `json:"display_name"`
	AppUserID     *int64    `json:"app_user_id"`
	AppUsername   *string   `json:"app_username"`
	JoinedYear    *int      `json:"joined_year"`
	LeftYear      *int      `json:"left_year"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// ListByFansubGroupWithDisplay returns members of a fansub group enriched with display names
// from the members table. Used by admin endpoints that serve data to the frontend.
func (r *HistGroupMembersRepository) ListByFansubGroupWithDisplay(ctx context.Context, fansubGroupID int64) ([]HistGroupMemberDisplayRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT hfgm.id, hfgm.fansub_group_id, hfgm.member_id,
		       m.nickname AS display_name,
		       m.user_id  AS app_user_id,
		       NULL::text AS app_username,
		       hfgm.joined_year, hfgm.left_year, hfgm.status, hfgm.created_at
		FROM hist_fansub_group_members hfgm
		JOIN members m ON m.id = hfgm.member_id
		WHERE hfgm.fansub_group_id = $1
		ORDER BY COALESCE(hfgm.joined_year, 9999), hfgm.id
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
			&row.JoinedYear, &row.LeftYear, &row.Status, &row.CreatedAt,
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
		SELECT id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE fansub_group_id = $1
		ORDER BY COALESCE(joined_year, 9999), id
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
			&row.JoinedYear, &row.LeftYear,
			&row.Status, &row.Visibility,
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
		SELECT id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE id = $1
	`, id).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedYear, &row.LeftYear,
		&row.Status, &row.Visibility,
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
		SELECT id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
		FROM hist_fansub_group_members
		WHERE id = $1 AND fansub_group_id = $2
	`, id, fansubGroupID).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedYear, &row.LeftYear,
		&row.Status, &row.Visibility,
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
			(fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
	`, input.FansubGroupID, input.MemberID, input.JoinedYear, input.LeftYear,
		input.Status, input.Visibility, input.CreatedBy,
	).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedYear, &row.LeftYear,
		&row.Status, &row.Visibility,
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

	if input.JoinedYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("joined_year = $%d", argIdx))
		args = append(args, *input.JoinedYear)
		argIdx++
	}
	if input.LeftYear != nil {
		setClauses = append(setClauses, fmt.Sprintf("left_year = $%d", argIdx))
		args = append(args, *input.LeftYear)
		argIdx++
	}
	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
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
		RETURNING id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
	`, strings.Join(setClauses, ", "), idxID, argIdx)

	var row HistGroupMemberRow
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&row.ID, &row.FansubGroupID, &row.MemberID,
		&row.JoinedYear, &row.LeftYear,
		&row.Status, &row.Visibility,
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
	JoinedYear    *int
	LeftYear      *int
	Status        string
	Visibility    string
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
		INSERT INTO hist_fansub_group_members
			(fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, fansub_group_id, member_id, joined_year, left_year, status, created_at
	`,
		input.FansubGroupID,
		memberID,
		input.JoinedYear,
		input.LeftYear,
		input.Status,
		input.Visibility,
		input.CreatedBy,
	).Scan(
		&row.ID,
		&row.FansubGroupID,
		&row.MemberID,
		&row.JoinedYear,
		&row.LeftYear,
		&row.Status,
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
