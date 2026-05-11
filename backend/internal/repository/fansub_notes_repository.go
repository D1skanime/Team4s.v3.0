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
	ID              int64
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

// MemberGroupStory represents one story record from member_group_stories.
type MemberGroupStory struct {
	ID              int64
	FansubGroupID   int64
	MemberID        int64
	RoleID          *int64
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

// CreateFansubGroupNoteRequest holds the fields for creating a fansub_group_notes row.
type CreateFansubGroupNoteRequest struct {
	Title        string
	BodyMarkdown string
	BodyHTML     string
	Visibility   string
	Status       string
	SortOrder    int
}

// UpdateFansubGroupNoteRequest holds the patchable fields for a fansub_group_notes row.
// All pointer fields are optional (nil = do not update).
type UpdateFansubGroupNoteRequest struct {
	Title        *string
	BodyMarkdown *string
	BodyHTML     *string
	Visibility   *string
	Status       *string
	SortOrder    *int
}

// CreateMemberGroupStoryRequest holds the fields for creating a member_group_stories row.
type CreateMemberGroupStoryRequest struct {
	MemberID     int64
	RoleID       *int64
	Title        string
	BodyMarkdown string
	BodyHTML     string
	Visibility   string
	Status       string
	SortOrder    int
}

// UpdateMemberGroupStoryRequest holds the patchable fields for a member_group_stories row.
// All pointer fields are optional (nil = do not update).
type UpdateMemberGroupStoryRequest struct {
	RoleID       *int64
	Title        *string
	BodyMarkdown *string
	BodyHTML     *string
	Visibility   *string
	Status       *string
	SortOrder    *int
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

// FansubNotesRepository provides CRUD operations for fansub_group_notes,
// member_group_stories, and anime_fansub_project_notes.
type FansubNotesRepository struct {
	db *pgxpool.Pool
}

// NewFansubNotesRepository constructs a new FansubNotesRepository backed by db.
func NewFansubNotesRepository(db *pgxpool.Pool) *FansubNotesRepository {
	return &FansubNotesRepository{db: db}
}

// ---- fansub_group_notes ----

// ListFansubGroupNotes returns all non-deleted notes for a fansub group,
// ordered by sort_order ASC, created_at ASC.
func (r *FansubNotesRepository) ListFansubGroupNotes(
	ctx context.Context,
	fansubGroupID int64,
) ([]FansubGroupNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, title, body_markdown, body_html,
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
			(fansub_group_id, title, body_markdown, body_html, visibility, status, sort_order,
			 created_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING id, fansub_group_id, title, body_markdown, body_html,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, fansubGroupID, req.Title, req.BodyMarkdown, req.BodyHTML,
		req.Visibility, req.Status, req.SortOrder, createdByUserID,
	).Scan(
		&n.ID, &n.FansubGroupID, &n.Title, &n.BodyMarkdown, &n.BodyHTML,
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
			visibility    = COALESCE($6, visibility),
			status        = COALESCE($7, status),
			sort_order    = COALESCE($8, sort_order),
			updated_by_user_id = $2,
			updated_at    = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		RETURNING id, fansub_group_id, title, body_markdown, body_html,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, noteID, userID,
		req.Title, req.BodyMarkdown, req.BodyHTML,
		req.Visibility, req.Status, req.SortOrder,
	).Scan(
		&n.ID, &n.FansubGroupID, &n.Title, &n.BodyMarkdown, &n.BodyHTML,
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

// ---- member_group_stories ----

// ListMemberGroupStories returns all non-deleted stories for a fansub group,
// ordered by sort_order ASC, created_at ASC.
func (r *FansubNotesRepository) ListMemberGroupStories(
	ctx context.Context,
	fansubGroupID int64,
) ([]MemberGroupStory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, member_id, role_id,
		       title, body_markdown, body_html,
		       visibility, status, sort_order,
		       created_by_user_id, updated_by_user_id,
		       created_at, updated_at, deleted_at
		FROM member_group_stories
		WHERE fansub_group_id = $1
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, created_at ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list member_group_stories for group %d: %w", fansubGroupID, err)
	}
	defer rows.Close()

	var items []MemberGroupStory
	for rows.Next() {
		var s MemberGroupStory
		if err := rows.Scan(
			&s.ID, &s.FansubGroupID, &s.MemberID, &s.RoleID,
			&s.Title, &s.BodyMarkdown, &s.BodyHTML,
			&s.Visibility, &s.Status, &s.SortOrder,
			&s.CreatedByUserID, &s.UpdatedByUserID,
			&s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan member_group_stories row: %w", err)
		}
		items = append(items, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member_group_stories rows: %w", err)
	}
	return items, nil
}

// CreateMemberGroupStory inserts a new member_group_stories row and returns the created record.
func (r *FansubNotesRepository) CreateMemberGroupStory(
	ctx context.Context,
	fansubGroupID int64,
	createdByUserID int64,
	req CreateMemberGroupStoryRequest,
) (*MemberGroupStory, error) {
	var s MemberGroupStory
	err := r.db.QueryRow(ctx, `
		INSERT INTO member_group_stories
			(fansub_group_id, member_id, role_id, title, body_markdown, body_html,
			 visibility, status, sort_order, created_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		RETURNING id, fansub_group_id, member_id, role_id,
		          title, body_markdown, body_html,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, fansubGroupID, req.MemberID, req.RoleID, req.Title,
		req.BodyMarkdown, req.BodyHTML, req.Visibility, req.Status,
		req.SortOrder, createdByUserID,
	).Scan(
		&s.ID, &s.FansubGroupID, &s.MemberID, &s.RoleID,
		&s.Title, &s.BodyMarkdown, &s.BodyHTML,
		&s.Visibility, &s.Status, &s.SortOrder,
		&s.CreatedByUserID, &s.UpdatedByUserID,
		&s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create member_group_story for group %d: %w", fansubGroupID, err)
	}
	return &s, nil
}

// UpdateMemberGroupStory applies a partial update (PATCH semantics) to a member_group_stories row.
// Only non-nil fields in req are changed.
func (r *FansubNotesRepository) UpdateMemberGroupStory(
	ctx context.Context,
	storyID int64,
	userID int64,
	req UpdateMemberGroupStoryRequest,
) (*MemberGroupStory, error) {
	var s MemberGroupStory
	err := r.db.QueryRow(ctx, `
		UPDATE member_group_stories
		SET
			role_id       = COALESCE($3, role_id),
			title         = COALESCE($4, title),
			body_markdown = COALESCE($5, body_markdown),
			body_html     = COALESCE($6, body_html),
			visibility    = COALESCE($7, visibility),
			status        = COALESCE($8, status),
			sort_order    = COALESCE($9, sort_order),
			updated_by_user_id = $2,
			updated_at    = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		RETURNING id, fansub_group_id, member_id, role_id,
		          title, body_markdown, body_html,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, storyID, userID,
		req.RoleID, req.Title, req.BodyMarkdown, req.BodyHTML,
		req.Visibility, req.Status, req.SortOrder,
	).Scan(
		&s.ID, &s.FansubGroupID, &s.MemberID, &s.RoleID,
		&s.Title, &s.BodyMarkdown, &s.BodyHTML,
		&s.Visibility, &s.Status, &s.SortOrder,
		&s.CreatedByUserID, &s.UpdatedByUserID,
		&s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update member_group_story %d: %w", storyID, err)
	}
	return &s, nil
}

// DeleteMemberGroupStory soft-deletes a member_group_stories row by setting deleted_at = NOW().
func (r *FansubNotesRepository) DeleteMemberGroupStory(
	ctx context.Context,
	storyID int64,
	userID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE member_group_stories
		SET deleted_at = NOW(), deleted_by_user_id = $2
		WHERE id = $1
		  AND deleted_at IS NULL
	`, storyID, userID)
	if err != nil {
		return fmt.Errorf("delete member_group_story %d: %w", storyID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---- anime_fansub_project_notes ----

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

// UpsertAnimeFansubProjectNote inserts a new note or updates the existing active note for the
// (anime_id, fansub_group_id) pair. Uses the partial unique index uq_anime_fansub_project_notes_main
// (WHERE deleted_at IS NULL) for conflict detection.
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
