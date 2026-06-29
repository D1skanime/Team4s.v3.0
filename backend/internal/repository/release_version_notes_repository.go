package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ReleaseVersionNote represents one record from release_version_notes.
type ReleaseVersionNote struct {
	ID                   int64
	ReleaseVersionID     int64
	MemberID             int64
	RoleID               int64
	Title                *string
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

// MemberRoleForVersion holds a member+role pair associated with a release version,
// resolved via anime_contributions + anime_contribution_roles (D-13).
type MemberRoleForVersion struct {
	MemberID   int64
	MemberName string
	RoleID     int64
	RoleCode   string
	RoleLabel  string
}

// BulkNoteInput describes a single note in a bulk upsert operation.
// ID == 0 means "create new"; ID > 0 means "update existing".
// RoleCode ist der kanonische Schlüssel für die Contributor-Validierung (D-13).
// RoleID wird für die DB-Persistenz in release_version_notes.role_id benötigt (Legacy-Feld).
type BulkNoteInput struct {
	ID         int64 // 0 = create new
	MemberID   int64
	RoleCode   string // für Validierung gegen anime_contributions (D-13)
	RoleID     int64  // für INSERT in release_version_notes.role_id (Legacy-DB-Feld)
	Title      *string
	BodyJSON   []byte
	BodyHTML   string
	BodyText   string
	Visibility string
	Status     string
	SortOrder  int
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
		       title, body_markdown, body_html, body_json, body_text,
		       editor_type, content_schema_version,
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
			&n.Title, &n.BodyMarkdown, &n.BodyHTML, &n.BodyJSON, &n.BodyText,
			&n.EditorType, &n.ContentSchemaVersion,
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

func (r *ReleaseVersionNotesRepository) ListReleaseVersionNotesForMember(
	ctx context.Context,
	releaseVersionID int64,
	memberID int64,
) ([]ReleaseVersionNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, release_version_id, member_id, role_id,
		       title, body_markdown, body_html, body_json, body_text,
		       editor_type, content_schema_version,
		       visibility, status, sort_order,
		       created_by_user_id, updated_by_user_id,
		       created_at, updated_at, deleted_at
		FROM release_version_notes
		WHERE release_version_id = $1
		  AND member_id = $2
		  AND deleted_at IS NULL
		ORDER BY sort_order ASC, member_id ASC, role_id ASC
	`, releaseVersionID, memberID)
	if err != nil {
		return nil, fmt.Errorf("list release_version_notes for version %d member %d: %w", releaseVersionID, memberID, err)
	}
	defer rows.Close()

	var items []ReleaseVersionNote
	for rows.Next() {
		var n ReleaseVersionNote
		if err := rows.Scan(
			&n.ID, &n.ReleaseVersionID, &n.MemberID, &n.RoleID,
			&n.Title, &n.BodyMarkdown, &n.BodyHTML, &n.BodyJSON, &n.BodyText,
			&n.EditorType, &n.ContentSchemaVersion,
			&n.Visibility, &n.Status, &n.SortOrder,
			&n.CreatedByUserID, &n.UpdatedByUserID,
			&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan release_version_notes member row: %w", err)
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release_version_notes member rows: %w", err)
	}
	return items, nil
}

func (r *ReleaseVersionNotesRepository) ResolveMemberIDForAppUser(
	ctx context.Context,
	appUserID int64,
) (int64, bool, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT member_id
		FROM member_claims
		WHERE app_user_id = $1
		  AND claim_status = 'verified'
		  AND member_id IS NOT NULL
		ORDER BY verified_at DESC NULLS LAST, id DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("resolve member id for app_user %d: %w", appUserID, err)
	}
	return memberID, true, nil
}

// GetMemberRolesForVersion returns the member+role pairs for a release version via
// the two-step resolution from anime_contributions (D-13, D-02):
//  1. versions-spezifisch: anime_contributions WHERE release_version_id = $1
//  2. Fallback anime-weit: anime_contributions WHERE release_version_id IS NULL (nur wenn Schritt 1 leer)
//  3. Projektleitung aus dem anime-weiten Satz bleibt zusätzlich schreibberechtigt,
//     auch wenn für die Version eine eigene Besetzung gepflegt wurde.
func (r *ReleaseVersionNotesRepository) GetMemberRolesForVersion(
	ctx context.Context,
	releaseVersionID int64,
) ([]MemberRoleForVersion, error) {
	// Schritt 1: versions-spezifische Contributions
	items, err := r.getMemberRolesForVersionStep(ctx, releaseVersionID, true)
	if err != nil {
		return nil, err
	}
	projectRoles, err := r.getMemberRolesForVersionStep(ctx, releaseVersionID, false)
	if err != nil {
		return nil, err
	}
	return mergeMemberRolesForVersion(items, projectRoles), nil
}

// getMemberRolesForVersionStep führt einen der zwei Auflösungsschritte aus.
// Wenn versionSpecific=true: WHERE release_version_id = $1 (Override-Satz).
// Wenn versionSpecific=false: WHERE release_version_id IS NULL AND anime-weit (Fallback).
func (r *ReleaseVersionNotesRepository) getMemberRolesForVersionStep(
	ctx context.Context,
	releaseVersionID int64,
	versionSpecific bool,
) ([]MemberRoleForVersion, error) {
	var rows interface {
		Next() bool
		Scan(dest ...interface{}) error
		Err() error
		Close()
	}
	var err error

	if versionSpecific {
		rows, err = r.db.Query(ctx, `
			SELECT DISTINCT ac.member_id, m.nickname AS member_name,
			       cr.id AS role_id, acr.role_code, rd.label_de AS role_label,
			       rd.sort_order AS role_sort_order
			FROM anime_contributions ac
			JOIN members m ON m.id = ac.member_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			JOIN role_definitions rd ON rd.code = acr.role_code
			JOIN contributor_roles cr ON cr.name = acr.role_code
			WHERE ac.release_version_id = $1
			  AND ac.fansub_group_id IN (
			      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
			  )
			ORDER BY role_sort_order ASC, role_label ASC, member_name ASC
		`, releaseVersionID)
	} else {
		rows, err = r.db.Query(ctx, `
			SELECT DISTINCT ac.member_id, m.nickname AS member_name,
			       cr.id AS role_id, acr.role_code, rd.label_de AS role_label,
			       rd.sort_order AS role_sort_order
			FROM anime_contributions ac
			JOIN members m ON m.id = ac.member_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			JOIN role_definitions rd ON rd.code = acr.role_code
			JOIN contributor_roles cr ON cr.name = acr.role_code
			JOIN release_versions rv ON rv.id = $1
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes e ON e.id = fr.episode_id
			WHERE ac.release_version_id IS NULL
			  AND ac.anime_id = e.anime_id
			  AND ac.fansub_group_id IN (
			      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
			  )
			ORDER BY role_sort_order ASC, role_label ASC, member_name ASC
		`, releaseVersionID)
	}
	if err != nil {
		return nil, fmt.Errorf("get member roles for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var items []MemberRoleForVersion
	for rows.Next() {
		var mr MemberRoleForVersion
		var roleSortOrder int
		if err := rows.Scan(
			&mr.MemberID, &mr.MemberName,
			&mr.RoleID, &mr.RoleCode, &mr.RoleLabel,
			&roleSortOrder,
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

func (r *ReleaseVersionNotesRepository) getProjectLeadRolesForVersion(
	ctx context.Context,
	releaseVersionID int64,
) ([]MemberRoleForVersion, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ac.member_id, m.nickname AS member_name,
		       cr.id AS role_id, acr.role_code, rd.label_de AS role_label,
		       rd.sort_order AS role_sort_order
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		JOIN role_definitions rd ON rd.code = acr.role_code
		JOIN contributor_roles cr ON cr.name = acr.role_code
		JOIN release_versions rv ON rv.id = $1
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		WHERE ac.release_version_id IS NULL
		  AND ac.anime_id = e.anime_id
		  AND acr.role_code = 'project_lead'
		  AND ac.fansub_group_id IN (
		      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
		  )
		ORDER BY role_sort_order ASC, role_label ASC, member_name ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("get project lead roles for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var items []MemberRoleForVersion
	for rows.Next() {
		var mr MemberRoleForVersion
		var roleSortOrder int
		if err := rows.Scan(
			&mr.MemberID, &mr.MemberName,
			&mr.RoleID, &mr.RoleCode, &mr.RoleLabel,
			&roleSortOrder,
		); err != nil {
			return nil, fmt.Errorf("scan project_lead member_roles_for_version row: %w", err)
		}
		items = append(items, mr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate project_lead member_roles_for_version rows: %w", err)
	}
	return items, nil
}

func mergeMemberRolesForVersion(groups ...[]MemberRoleForVersion) []MemberRoleForVersion {
	seen := make(map[string]struct{})
	var merged []MemberRoleForVersion
	for _, group := range groups {
		for _, item := range group {
			key := releaseVersionMemberRoleKey(item.MemberID, item.RoleCode)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			merged = append(merged, item)
		}
	}
	return merged
}

func releaseVersionMemberRoleKey(memberID int64, roleCode string) string {
	return fmt.Sprintf("%d:%s", memberID, roleCode)
}

func (r *ReleaseVersionNotesRepository) loadValidMemberRoleKeysForVersion(
	ctx context.Context,
	releaseVersionID int64,
) (map[string]struct{}, error) {
	// Zwei-Stufen-Auflösung analog GetMemberRolesForVersion (D-13, D-02)
	members, err := r.GetMemberRolesForVersion(ctx, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("load valid member-role pairs for version %d: %w", releaseVersionID, err)
	}

	validKeys := make(map[string]struct{})
	for _, mr := range members {
		validKeys[releaseVersionMemberRoleKey(mr.MemberID, mr.RoleCode)] = struct{}{}
	}
	return validKeys, nil
}

func (r *ReleaseVersionNotesRepository) validateExistingReleaseVersionNoteContributor(
	ctx context.Context,
	tx pgx.Tx,
	noteID int64,
	releaseVersionID int64,
	memberID int64,
	roleID int64,
) error {
	var storedMemberID int64
	var storedRoleID int64
	err := tx.QueryRow(ctx, `
		SELECT member_id, role_id
		FROM release_version_notes
		WHERE id = $1
		  AND release_version_id = $2
		  AND deleted_at IS NULL
	`, noteID, releaseVersionID).Scan(&storedMemberID, &storedRoleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("load existing release-version note contributor %d: %w", noteID, err)
	}
	if storedMemberID != memberID || storedRoleID != roleID {
		return ErrInvalidReleaseVersionContributorContext
	}
	return nil
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

	resolvedUserID, err := resolveOptionalExistingUserID(ctx, tx, userID)
	if err != nil {
		return nil, fmt.Errorf("bulk_upsert_release_version_notes for version %d: %w", releaseVersionID, err)
	}

	validKeys, err := r.loadValidMemberRoleKeysForVersion(ctx, releaseVersionID)
	if err != nil {
		return nil, err
	}

	for _, note := range notes {
		if _, ok := validKeys[releaseVersionMemberRoleKey(note.MemberID, note.RoleCode)]; !ok {
			return nil, ErrInvalidReleaseVersionContributorContext
		}
		if note.ID == 0 {
			// INSERT new note
			var newID int64
			err := tx.QueryRow(ctx, `
				INSERT INTO release_version_notes
					(release_version_id, member_id, role_id, title,
					 body_json, body_html, body_text, editor_type, content_schema_version,
					 visibility, status, sort_order, created_by_user_id, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, 'tiptap', $8, $9, $10, $11, $12, NOW())
				RETURNING id
			`, releaseVersionID, note.MemberID, note.RoleID, note.Title,
				note.BodyJSON, note.BodyHTML, note.BodyText, 1,
				note.Visibility, note.Status, note.SortOrder, resolvedUserID,
			).Scan(&newID)
			if isUniqueViolation(err) {
				return nil, ErrConflict
			}
			if err != nil {
				return nil, fmt.Errorf("bulk_upsert: insert note (member %d, role %d): %w",
					note.MemberID, note.RoleID, err)
			}
		} else {
			if err := r.validateExistingReleaseVersionNoteContributor(
				ctx, tx, note.ID, releaseVersionID, note.MemberID, note.RoleID,
			); err != nil {
				return nil, err
			}
			// UPDATE existing note
			tag, err := tx.Exec(ctx, `
				UPDATE release_version_notes
				SET
					title              = $3,
					body_json          = $4,
					body_html          = $5,
					body_text          = $6,
					editor_type        = 'tiptap',
					content_schema_version = 1,
					visibility         = $7,
					status             = $8,
					sort_order         = $9,
					updated_by_user_id = $10,
					updated_at         = NOW()
				WHERE id = $1
				  AND release_version_id = $2
				  AND deleted_at IS NULL
			`, note.ID, releaseVersionID,
				note.Title, note.BodyJSON, note.BodyHTML, note.BodyText,
				note.Visibility, note.Status, note.SortOrder, resolvedUserID,
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
	resolvedDeletedByUserID, err := resolveOptionalExistingUserID(ctx, r.db, userID)
	if err != nil {
		return fmt.Errorf("delete release_version_note %d: %w", noteID, err)
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE release_version_notes
		SET deleted_at = NOW(), deleted_by_user_id = $3
		WHERE id = $1
		  AND release_version_id = $2
		  AND deleted_at IS NULL
	`, noteID, releaseVersionID, resolvedDeletedByUserID)
	if err != nil {
		return fmt.Errorf("delete release_version_note %d: %w", noteID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
