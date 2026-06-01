package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GroupHistoryRow represents a single fansub_group_history record.
type GroupHistoryRow struct {
	ID            int64
	FansubGroupID int64
	Year          *int
	EventType     string
	Title         *string
	Note          *string
	Status        string
	CreatedBy     *int64
	CreatedAt     time.Time
}

// GroupHistoryInput holds the data required to create a new group history entry.
type GroupHistoryInput struct {
	Year      *int
	EventType string
	Title     *string
	Note      *string
	Status    string
	CreatedBy *int64
}

// GroupHistoryPatchInput holds optional fields for patching a group history entry.
// Pointer-to-pointer fields represent nullable values: nil = do not update, non-nil = update (inner pointer may be nil to set NULL).
type GroupHistoryPatchInput struct {
	Year      **int
	EventType *string
	Title     **string
	Note      **string
	Status    *string
}

// FansubGroupHistoryRepository handles persistence for fansub_group_history.
type FansubGroupHistoryRepository struct {
	db *pgxpool.Pool
}

// NewFansubGroupHistoryRepository returns a new FansubGroupHistoryRepository.
func NewFansubGroupHistoryRepository(db *pgxpool.Pool) *FansubGroupHistoryRepository {
	return &FansubGroupHistoryRepository{db: db}
}

func scanGroupHistoryRow(rows pgx.Rows) (*GroupHistoryRow, error) {
	var r GroupHistoryRow
	if err := rows.Scan(
		&r.ID,
		&r.FansubGroupID,
		&r.Year,
		&r.EventType,
		&r.Title,
		&r.Note,
		&r.Status,
		&r.CreatedBy,
		&r.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &r, nil
}

// ListByFansub returns all history entries for a given fansub group, ordered by year then id.
func (r *FansubGroupHistoryRepository) ListByFansub(ctx context.Context, fansubGroupID int64) ([]GroupHistoryRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, year, event_type, title, note, status, created_by, created_at
		FROM fansub_group_history
		WHERE fansub_group_id = $1
		ORDER BY COALESCE(year, 9999), id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list group history by fansub: %w", err)
	}
	defer rows.Close()

	result := make([]GroupHistoryRow, 0)
	for rows.Next() {
		row, err := scanGroupHistoryRow(rows)
		if err != nil {
			return nil, fmt.Errorf("list group history by fansub: scan: %w", err)
		}
		result = append(result, *row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list group history by fansub: iterate: %w", err)
	}
	return result, nil
}

// GetByID returns a single group history entry by its primary key.
func (r *FansubGroupHistoryRepository) GetByID(ctx context.Context, id int64) (*GroupHistoryRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, year, event_type, title, note, status, created_by, created_at
		FROM fansub_group_history
		WHERE id = $1
	`, id)
	if err != nil {
		return nil, fmt.Errorf("get group history by id: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotFound
	}
	row, err := scanGroupHistoryRow(rows)
	if err != nil {
		return nil, fmt.Errorf("get group history by id: scan: %w", err)
	}
	return row, nil
}

// Create inserts a new group history entry and returns the created record.
func (r *FansubGroupHistoryRepository) Create(ctx context.Context, fansubGroupID int64, input GroupHistoryInput) (*GroupHistoryRow, error) {
	var newID int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_history (fansub_group_id, year, event_type, title, note, status, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		RETURNING id
	`,
		fansubGroupID,
		input.Year,
		input.EventType,
		input.Title,
		input.Note,
		input.Status,
		input.CreatedBy,
	).Scan(&newID)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create group history: %w", err)
	}
	return r.GetByID(ctx, newID)
}

// Update patches a group history entry with the provided fields.
// fansub_group_history has no updated_at column — only the provided fields are modified.
func (r *FansubGroupHistoryRepository) Update(ctx context.Context, id int64, input GroupHistoryPatchInput) (*GroupHistoryRow, error) {
	setClauses := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	addArg := func(val any) int {
		args = append(args, val)
		idx := argIdx
		argIdx++
		return idx
	}

	if input.EventType != nil {
		setClauses = append(setClauses, fmt.Sprintf("event_type = $%d", addArg(*input.EventType)))
	}
	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", addArg(*input.Status)))
	}
	if input.Year != nil {
		setClauses = append(setClauses, fmt.Sprintf("year = $%d", addArg(*input.Year)))
	}
	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", addArg(*input.Title)))
	}
	if input.Note != nil {
		setClauses = append(setClauses, fmt.Sprintf("note = $%d", addArg(*input.Note)))
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	idxID := addArg(id)
	query := fmt.Sprintf("UPDATE fansub_group_history SET %s WHERE id = $%d", strings.Join(setClauses, ", "), idxID)

	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update group history: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	return r.GetByID(ctx, id)
}

// Delete removes a group history entry by ID.
func (r *FansubGroupHistoryRepository) Delete(ctx context.Context, id int64) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM fansub_group_history WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete group history: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
