package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// MemberGroupStory represents one story record from member_group_stories.
type MemberGroupStory struct {
	ID                   int64
	FansubGroupID        int64
	MemberID             int64
	RoleID               *int64
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

// CreateMemberGroupStoryRequest holds the fields for creating a member_group_stories row.
type CreateMemberGroupStoryRequest struct {
	MemberID             int64
	RoleID               *int64
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

// UpdateMemberGroupStoryRequest holds the patchable fields for a member_group_stories row.
// All pointer fields are optional (nil = do not update).
type UpdateMemberGroupStoryRequest struct {
	RoleID       *int64
	Title        *string
	BodyMarkdown *string
	BodyHTML     *string
	BodyJSON     *[]byte
	BodyText     *string
	Visibility   *string
	Status       *string
	SortOrder    *int
}

// ListMemberGroupStories returns all non-deleted stories for a fansub group,
// ordered by sort_order ASC, created_at ASC.
func (r *FansubNotesRepository) ListMemberGroupStories(
	ctx context.Context,
	fansubGroupID int64,
) ([]MemberGroupStory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, member_id, role_id,
		       title, body_markdown, body_html,
		       body_json, body_text, editor_type, content_schema_version,
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
			&s.BodyJSON, &s.BodyText, &s.EditorType, &s.ContentSchemaVersion,
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
			 body_json, body_text, editor_type, content_schema_version,
			 visibility, status, sort_order, created_by_user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
		RETURNING id, fansub_group_id, member_id, role_id,
		          title, body_markdown, body_html,
		          body_json, body_text, editor_type, content_schema_version,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, fansubGroupID, req.MemberID, req.RoleID, req.Title,
		req.BodyMarkdown, req.BodyHTML,
		req.BodyJSON, req.BodyText, req.EditorType, req.ContentSchemaVersion,
		req.Visibility, req.Status, req.SortOrder, createdByUserID,
	).Scan(
		&s.ID, &s.FansubGroupID, &s.MemberID, &s.RoleID,
		&s.Title, &s.BodyMarkdown, &s.BodyHTML,
		&s.BodyJSON, &s.BodyText, &s.EditorType, &s.ContentSchemaVersion,
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
			body_json     = COALESCE($7, body_json),
			body_text     = COALESCE($8, body_text),
			visibility    = COALESCE($9, visibility),
			status        = COALESCE($10, status),
			sort_order    = COALESCE($11, sort_order),
			updated_by_user_id = $2,
			updated_at    = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
		RETURNING id, fansub_group_id, member_id, role_id,
		          title, body_markdown, body_html,
		          body_json, body_text, editor_type, content_schema_version,
		          visibility, status, sort_order,
		          created_by_user_id, updated_by_user_id,
		          created_at, updated_at, deleted_at
	`, storyID, userID,
		req.RoleID, req.Title, req.BodyMarkdown, req.BodyHTML,
		req.BodyJSON, req.BodyText,
		req.Visibility, req.Status, req.SortOrder,
	).Scan(
		&s.ID, &s.FansubGroupID, &s.MemberID, &s.RoleID,
		&s.Title, &s.BodyMarkdown, &s.BodyHTML,
		&s.BodyJSON, &s.BodyText, &s.EditorType, &s.ContentSchemaVersion,
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
