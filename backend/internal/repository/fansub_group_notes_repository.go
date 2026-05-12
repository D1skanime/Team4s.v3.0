package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FansubGroupNote represents one note record from fansub_group_notes.
type FansubGroupNote struct {
	ID                   int64
	FansubGroupID        int64
	Title                string
	BodyMarkdown         string
	BodyHTML             string
	BodyJSON             []byte
	BodyText             string
	EditorType           string
	ContentSchemaVersion int
	Visibility           string
	Status               string
	SortOrder            int
	CreatedByUserID      *int64
	UpdatedByUserID      *int64
	CreatedAt            time.Time
	UpdatedAt            *time.Time
	DeletedAt            *time.Time
}

// CreateFansubGroupNoteRequest holds the fields for creating a fansub_group_notes row.
type CreateFansubGroupNoteRequest struct {
	Title                string
	BodyMarkdown         string
	BodyHTML             string
	BodyJSON             []byte
	BodyText             string
	EditorType           string
	ContentSchemaVersion int
	Visibility           string
	Status               string
	SortOrder            int
}

// UpdateFansubGroupNoteRequest holds the patchable fields for a fansub_group_notes row.
// All pointer fields are optional (nil = do not update).
type UpdateFansubGroupNoteRequest struct {
	Title        *string
	BodyMarkdown *string
	BodyHTML     *string
	BodyJSON     *[]byte
	BodyText     *string
	Visibility   *string
	Status       *string
	SortOrder    *int
}

// FansubNotesRepository provides CRUD operations for fansub_group_notes,
// member_group_stories, and anime_fansub_project_notes.
type FansubNotesRepository struct {
	db *pgxpool.Pool
}

// NewFansubNotesRepository constructs a new FansubNotesRepository backed by db.
func NewFansubNotesRepository(db *pgxpool.Pool) *FansubNotesRepository {
	return &FansubNotesRepository{db: db}
}

// ListFansubGroupNotes returns all non-deleted notes for a fansub group,
// ordered by sort_order ASC, created_at ASC.
func (r *FansubNotesRepository) ListFansubGroupNotes(
	ctx context.Context,
	fansubGroupID int64,
) ([]FansubGroupNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, title, body_markdown, body_html,
		       body_json, body_text, editor_type, content_schema_version,
		       visibility, status, sort_order,
		       created_by_user_id, updated_by_user_id,
		       created_at, updated_at, deleted_at
		FROM fansub_group_notes
		WHERE fansub_group_id = $1
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, created_at ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list fansub_group_notes for group %d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	var items []FansubGroupNote
	for rows.Next() {
		var n FansubGroupNote
		if err := rows.Scan(
			&n.ID, &n.FansubGroupID, &n.Title, &n.BodyMarkdown, &n.BodyHTML,
			&n.BodyJSON, &n.BodyText, &n.EditorType, &n.ContentSchemaVersion,
			&n.Visibility, &n.Status, &n.SortOrder,
			&n.CreatedByUserID, &n.UpdatedByUserID,
			&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub_group_notes row: %w", err)
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub_group_notes rows: %w", err)
	}
	return items, nil
}

// CreateFansubGroupNote inserts a new fansub_group_notes row and returns the created record.
func (r *FansubNotesRepository) CreateFansubGroupNote(
	ctx context.Context,
	fansubGroupID int64,
	createdByUserID int64,
	req CreateFansubGroupNoteRequest,
) (*FansubGroupNote, error) {
	var n FansubGroupNote
	err := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_notes
			(fansub_group_id, title, body_markdown, body_html,
			 body_json, body_text, editor_type, content_schema_version,
			 visibility, status, sort_order, created_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
		RETURNING id, fansub_group_id, title, body_markdown, body_html,
		          body_json, body_text, editor_type, content_schema_version,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, fansubGroupID, req.Title, req.BodyMarkdown, req.BodyHTML,
		req.BodyJSON, req.BodyText, req.EditorType, req.ContentSchemaVersion,
		req.Visibility, req.Status, req.SortOrder, createdByUserID,
	).Scan(
		&n.ID, &n.FansubGroupID, &n.Title, &n.BodyMarkdown, &n.BodyHTML,
		&n.BodyJSON, &n.BodyText, &n.EditorType, &n.ContentSchemaVersion,
		&n.Visibility, &n.Status, &n.SortOrder,
		&n.CreatedByUserID, &n.UpdatedByUserID,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create fansub_group_note for group %d: %w", fansubGroupID, err)
	}
	return &n, nil
}

// UpdateFansubGroupNote applies a partial update (PATCH semantics) to a fansub_group_notes row.
// Only non-nil fields in req are changed.
func (r *FansubNotesRepository) UpdateFansubGroupNote(
	ctx context.Context,
	noteID int64,
	userID int64,
	req UpdateFansubGroupNoteRequest,
) (*FansubGroupNote, error) {
	var n FansubGroupNote
	err := r.db.QueryRow(ctx, `
		UPDATE fansub_group_notes
		SET
			title         = COALESCE($3, title),
			body_markdown = COALESCE($4, body_markdown),
			body_html     = COALESCE($5, body_html),
			body_json     = COALESCE($6, body_json),
			body_text     = COALESCE($7, body_text),
			visibility    = COALESCE($8, visibility),
			status        = COALESCE($9, status),
			sort_order    = COALESCE($10, sort_order),
			updated_by_user_id = $2,
			updated_at    = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		RETURNING id, fansub_group_id, title, body_markdown, body_html,
		          body_json, body_text, editor_type, content_schema_version,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, noteID, userID,
		req.Title, req.BodyMarkdown, req.BodyHTML,
		req.BodyJSON, req.BodyText,
		req.Visibility, req.Status, req.SortOrder,
	).Scan(
		&n.ID, &n.FansubGroupID, &n.Title, &n.BodyMarkdown, &n.BodyHTML,
		&n.BodyJSON, &n.BodyText, &n.EditorType, &n.ContentSchemaVersion,
		&n.Visibility, &n.Status, &n.SortOrder,
		&n.CreatedByUserID, &n.UpdatedByUserID,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update fansub_group_note %d: %w", noteID, err)
	}
	return &n, nil
}

// DeleteFansubGroupNote soft-deletes a fansub_group_notes row by setting deleted_at = NOW().
func (r *FansubNotesRepository) DeleteFansubGroupNote(
	ctx context.Context,
	noteID int64,
	userID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE fansub_group_notes
		SET deleted_at = NOW(), deleted_by_user_id = $2
		WHERE id = $1
		  AND deleted_at IS NULL
	`, noteID, userID)
	if err != nil {
		return fmt.Errorf("delete fansub_group_note %d: %w", noteID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
