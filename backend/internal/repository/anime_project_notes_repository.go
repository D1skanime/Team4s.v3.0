package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// AnimeFansubProjectNote represents one record from anime_fansub_project_notes.
type AnimeFansubProjectNote struct {
	ID              int64
	AnimeID         int64
	FansubGroupID   int64
	Title           string
	BodyMarkdown    string
	BodyHTML        string
	Visibility      string
	Status          string
	SortOrder       int
	CreatedByUserID *int64
	UpdatedByUserID *int64
	CreatedAt       time.Time
	UpdatedAt       *time.Time
	DeletedAt       *time.Time
}

// UpsertAnimeFansubProjectNoteRequest holds the fields for upserting an anime_fansub_project_notes row.
type UpsertAnimeFansubProjectNoteRequest struct {
	Title        string
	BodyMarkdown string
	BodyHTML     string
	Visibility   string
	Status       string
	SortOrder    int
}

// GetAnimeFansubProjectNote returns the single active note for an (anime_id, fansub_group_id) pair.
// Returns ErrNotFound if no active note exists.
func (r *FansubNotesRepository) GetAnimeFansubProjectNote(
	ctx context.Context,
	animeID int64,
	fansubGroupID int64,
) (*AnimeFansubProjectNote, error) {
	var n AnimeFansubProjectNote
	err := r.db.QueryRow(ctx, `
		SELECT id, anime_id, fansub_group_id,
		       title, body_markdown, body_html,
		       visibility, status, sort_order,
		       created_by_user_id, updated_by_user_id,
		       created_at, updated_at, deleted_at
		FROM anime_fansub_project_notes
		WHERE anime_id = $1
		  AND fansub_group_id = $2
		  AND deleted_at IS NULL
	`, animeID, fansubGroupID).Scan(
		&n.ID, &n.AnimeID, &n.FansubGroupID,
		&n.Title, &n.BodyMarkdown, &n.BodyHTML,
		&n.Visibility, &n.Status, &n.SortOrder,
		&n.CreatedByUserID, &n.UpdatedByUserID,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get anime_fansub_project_note (anime %d, group %d): %w", animeID, fansubGroupID, err)
	}
	return &n, nil
}

// UpsertAnimeFansubProjectNote inserts or updates the active note for (anime_id, fansub_group_id).
func (r *FansubNotesRepository) UpsertAnimeFansubProjectNote(
	ctx context.Context,
	animeID int64,
	fansubGroupID int64,
	userID int64,
	req UpsertAnimeFansubProjectNoteRequest,
) (*AnimeFansubProjectNote, error) {
	var n AnimeFansubProjectNote
	err := r.db.QueryRow(ctx, `
		INSERT INTO anime_fansub_project_notes
			(anime_id, fansub_group_id, title, body_markdown, body_html,
			 visibility, status, sort_order, created_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		ON CONFLICT (anime_id, fansub_group_id) WHERE deleted_at IS NULL
		DO UPDATE SET
			title              = EXCLUDED.title,
			body_markdown      = EXCLUDED.body_markdown,
			body_html          = EXCLUDED.body_html,
			visibility         = EXCLUDED.visibility,
			status             = EXCLUDED.status,
			sort_order         = EXCLUDED.sort_order,
			updated_by_user_id = $9,
			updated_at         = NOW()
		RETURNING id, anime_id, fansub_group_id,
		          title, body_markdown, body_html,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, animeID, fansubGroupID, req.Title, req.BodyMarkdown, req.BodyHTML,
		req.Visibility, req.Status, req.SortOrder, userID,
	).Scan(
		&n.ID, &n.AnimeID, &n.FansubGroupID,
		&n.Title, &n.BodyMarkdown, &n.BodyHTML,
		&n.Visibility, &n.Status, &n.SortOrder,
		&n.CreatedByUserID, &n.UpdatedByUserID,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
	)
	if isUniqueViolation(err) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, fmt.Errorf("upsert anime_fansub_project_note (anime %d, group %d): %w", animeID, fansubGroupID, err)
	}
	return &n, nil
}

// DeleteAnimeFansubProjectNote soft-deletes an anime_fansub_project_notes row.
func (r *FansubNotesRepository) DeleteAnimeFansubProjectNote(
	ctx context.Context,
	noteID int64,
	userID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_fansub_project_notes
		SET deleted_at = NOW(), deleted_by_user_id = $2
		WHERE id = $1
		  AND deleted_at IS NULL
	`, noteID, userID)
	if err != nil {
		return fmt.Errorf("delete anime_fansub_project_note %d: %w", noteID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
