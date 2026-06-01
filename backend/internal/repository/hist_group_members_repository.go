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
	ID             int64
	FansubGroupID  int64
	MemberID       int64
	JoinedYear     *int
	LeftYear       *int
	Status         string
	Visibility     string
	CreatedBy      *int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
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

func (r *HistGroupMembersRepository) Update(ctx context.Context, id int64, input HistGroupMemberPatchInput) (*HistGroupMemberRow, error) {
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
		return r.GetByID(ctx, id)
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE hist_fansub_group_members
		SET %s
		WHERE id = $%d
		RETURNING id, fansub_group_id, member_id, joined_year, left_year, status, visibility, created_by, created_at, updated_at
	`, strings.Join(setClauses, ", "), argIdx)

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

func (r *HistGroupMembersRepository) Delete(ctx context.Context, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM hist_fansub_group_members WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete hist group member: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
