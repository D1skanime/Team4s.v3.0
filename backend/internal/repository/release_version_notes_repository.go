package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ReleaseVersionNote represents one record from release_version_notes.
type ReleaseVersionNote struct {
	ID               int64
	ReleaseVersionID int64
	MemberID         int64
	RoleID           int64
	Title            *string
	BodyMarkdown     string
	BodyHTML         string
	Visibility       string
	Status           string
	SortOrder        int
	CreatedByUserID  *int64
	UpdatedByUserID  *int64
	CreatedAt        time.Time
	UpdatedAt        *time.Time
	DeletedAt        *time.Time
}

// MemberRoleForVersion holds a member+role pair associated with a release version,
// resolved via the join path release_versions → fansub_releases → release_member_roles.
type MemberRoleForVersion struct {
	MemberID   int64
	MemberName string
	RoleID     int64
	RoleName   string
	RoleLabel  string
}

// BulkNoteInput describes a single note in a bulk upsert operation.
// ID == 0 means "create new"; ID > 0 means "update existing".
type BulkNoteInput struct {
	ID           int64   // 0 = create new
	MemberID     int64
	RoleID       int64
	Title        *string
	BodyMarkdown string
	BodyHTML     string
	Visibility   string
	Status       string
	SortOrder    int
}

// ReleaseVersionNotesRepository provides CRUD and bulk-upsert operations for release_version_notes.
type ReleaseVersionNotesRepository struct {
	db *pgxpool.Pool
}

// NewReleaseVersionNotesRepository constructs a new ReleaseVersionNotesRepository backed by db.
func NewReleaseVersionNotesRepository(db *pgxpool.Pool) *ReleaseVersionNotesRepository {
	return &ReleaseVersionNotesRepository{db: db}
}

// ListReleaseVersionNotes returns all non-deleted notes for a release version,
// ordered by sort_order ASC, member_id ASC, role_id ASC.
func (r *ReleaseVersionNotesRepository) ListReleaseVersionNotes(
	ctx context.Context,
	releaseVersionID int64,
) ([]ReleaseVersionNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, release_version_id, member_id, role_id,
		       title, body_markdown, body_html,
		       visibility, status, sort_order,
		       created_by_user_id, updated_by_user_id,
		       created_at, updated_at, deleted_at
		FROM release_version_notes
		WHERE release_version_id = $1
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, member_id ASC, role_id ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("list release_version_notes for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var items []ReleaseVersionNote
	for rows.Next() {
		var n ReleaseVersionNote
		if err := rows.Scan(
			&n.ID, &n.ReleaseVersionID, &n.MemberID, &n.RoleID,
			&n.Title, &n.BodyMarkdown, &n.BodyHTML,
			&n.Visibility, &n.Status, &n.SortOrder,
			&n.CreatedByUserID, &n.UpdatedByUserID,
			&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan release_version_notes row: %w", err)
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release_version_notes rows: %w", err)
	}
	return items, nil
}

// GetMemberRolesForVersion returns the member+role pairs for a release version via the
// canonical join path: release_versions → fansub_releases → release_member_roles → members + contributor_roles.
func (r *ReleaseVersionNotesRepository) GetMemberRolesForVersion(
	ctx context.Context,
	releaseVersionID int64,
) ([]MemberRoleForVersion, error) {
	rows, err := r.db.Query(ctx, `
		SELECT rmr.member_id, m.nickname AS member_name,
		       rmr.role_id, cr.name AS role_name, cr.label AS role_label
		FROM release_member_roles rmr
		JOIN members m ON m.id = rmr.member_id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		JOIN release_versions rv ON rv.release_id = rmr.release_id
		WHERE rv.id = $1
		ORDER BY cr.name ASC, m.nickname ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("get member roles for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var items []MemberRoleForVersion
	for rows.Next() {
		var mr MemberRoleForVersion
		if err := rows.Scan(
			&mr.MemberID, &mr.MemberName,
			&mr.RoleID, &mr.RoleName, &mr.RoleLabel,
		); err != nil {
			return nil, fmt.Errorf("scan member_roles_for_version row: %w", err)
		}
		items = append(items, mr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member_roles_for_version rows: %w", err)
	}
	return items, nil
}

// BulkUpsertReleaseVersionNotes processes all notes in a single DB transaction.
// For each item: if ID == 0 → INSERT; if ID > 0 → UPDATE WHERE id = $x AND release_version_id = $y.
// A UNIQUE violation on (release_version_id, member_id, role_id) is returned as ErrConflict.
// On success, returns the full list of active notes for the version after the upsert.
func (r *ReleaseVersionNotesRepository) BulkUpsertReleaseVersionNotes(
	ctx context.Context,
	releaseVersionID int64,
	userID int64,
	notes []BulkNoteInput,
) ([]ReleaseVersionNote, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin bulk_upsert_release_version_notes transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for _, note := range notes {
		if note.ID == 0 {
			// INSERT new note
			var newID int64
			err := tx.QueryRow(ctx, `
				INSERT INTO release_version_notes
					(release_version_id, member_id, role_id, title,
					 body_markdown, body_html, visibility, status, sort_order,
					 created_by_user_id, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
				RETURNING id
			`, releaseVersionID, note.MemberID, note.RoleID, note.Title,
				note.BodyMarkdown, note.BodyHTML, note.Visibility, note.Status,
				note.SortOrder, userID,
			).Scan(&newID)
			if isUniqueViolation(err) {
				return nil, ErrConflict
			}
			if err != nil {
				return nil, fmt.Errorf("bulk_upsert: insert note (member %d, role %d): %w",
					note.MemberID, note.RoleID, err)
			}
		} else {
			// UPDATE existing note
			tag, err := tx.Exec(ctx, `
				UPDATE release_version_notes
				SET
					title              = $3,
					body_markdown      = $4,
					body_html          = $5,
					visibility         = $6,
					status             = $7,
					sort_order         = $8,
					updated_by_user_id = $9,
					updated_at         = NOW()
				WHERE id = $1
				  AND release_version_id = $2
				  AND deleted_at IS NULL
			`, note.ID, releaseVersionID,
				note.Title, note.BodyMarkdown, note.BodyHTML,
				note.Visibility, note.Status, note.SortOrder, userID,
			)
			if isUniqueViolation(err) {
				return nil, ErrConflict
			}
			if err != nil {
				return nil, fmt.Errorf("bulk_upsert: update note %d: %w", note.ID, err)
			}
			if tag.RowsAffected() == 0 {
				return nil, fmt.Errorf("bulk_upsert: note %d not found or already deleted: %w",
					note.ID, ErrNotFound)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit bulk_upsert_release_version_notes: %w", err)
	}

	return r.ListReleaseVersionNotes(ctx, releaseVersionID)
}

// DeleteReleaseVersionNote soft-deletes a single release_version_notes row.
// releaseVersionID is used to scope the delete to the correct version.
func (r *ReleaseVersionNotesRepository) DeleteReleaseVersionNote(
	ctx context.Context,
	noteID int64,
	releaseVersionID int64,
	userID int64,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE release_version_notes
		SET deleted_at = NOW(), deleted_by_user_id = $3
		WHERE id = $1
		  AND release_version_id = $2
		  AND deleted_at IS NULL
	`, noteID, releaseVersionID, userID)
	if err != nil {
		return fmt.Errorf("delete release_version_note %d: %w", noteID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

