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
	ID            int64     `json:"id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	Year          *int      `json:"year"`
	EventType     string    `json:"event_type"`
	Title         *string   `json:"title"`
	Note          *string   `json:"note"`
	Status        string    `json:"status"`
	CreatedBy     *int64    `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
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

// HasWebsiteCommunityLink reports whether the group has a canonical website community link.
func (r *FansubGroupHistoryRepository) HasWebsiteCommunityLink(ctx context.Context, fansubGroupID int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM fansub_group_links
			WHERE group_id = $1
			  AND link_type = 'website'
			  AND btrim(url) <> ''
		)
	`, fansubGroupID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group website community link: %w", err)
	}
	return exists, nil
}

func (r *FansubGroupHistoryRepository) ValidateWebsiteLaunchAllowed(ctx context.Context, fansubGroupID int64) error {
	hasWebsite, err := r.HasWebsiteCommunityLink(ctx, fansubGroupID)
	if err != nil {
		return err
	}
	if !hasWebsite {
		return ErrValidation
	}
	return nil
}

func (r *FansubGroupHistoryRepository) ValidateRevivalAllowed(ctx context.Context, fansubGroupID int64) error {
	hasHiatus, err := r.HasEventType(ctx, fansubGroupID, "hiatus", nil)
	if err != nil {
		return err
	}
	if !hasHiatus {
		return ErrValidation
	}
	return nil
}

func (r *FansubGroupHistoryRepository) HasEventType(ctx context.Context, fansubGroupID int64, eventType string, excludeID *int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var excluded any
	if excludeID != nil {
		excluded = *excludeID
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM fansub_group_history
			WHERE fansub_group_id = $1
			  AND event_type = $2
			  AND ($3::bigint IS NULL OR id <> $3)
		)
	`, fansubGroupID, eventType, excluded).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group history event type: %w", err)
	}
	return exists, nil
}

// HasQualifiedFirstProject reports whether at least one assigned anime has an
// active project note plus the core fansub roles required for the first project badge.
func (r *FansubGroupHistoryRepository) HasQualifiedFirstProject(ctx context.Context, fansubGroupID int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM anime_fansub_groups afg
			WHERE afg.fansub_group_id = $1
			  AND EXISTS (
				SELECT 1
				FROM anime_fansub_project_notes afpn
				WHERE afpn.anime_id = afg.anime_id
				  AND afpn.fansub_group_id = afg.fansub_group_id
				  AND afpn.deleted_at IS NULL
				  AND afpn.status <> 'deleted'
			  )
			  AND EXISTS (
				SELECT 1
				FROM anime_contributions ac
				JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
				WHERE ac.anime_id = afg.anime_id
				  AND ac.fansub_group_id = afg.fansub_group_id
				  AND ac.status <> 'rejected'
				  AND acr.role_code = 'translator'
			  )
			  AND EXISTS (
				SELECT 1
				FROM anime_contributions ac
				JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
				WHERE ac.anime_id = afg.anime_id
				  AND ac.fansub_group_id = afg.fansub_group_id
				  AND ac.status <> 'rejected'
				  AND acr.role_code = 'timer'
			  )
			  AND EXISTS (
				SELECT 1
				FROM anime_contributions ac
				JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
				WHERE ac.anime_id = afg.anime_id
				  AND ac.fansub_group_id = afg.fansub_group_id
				  AND ac.status <> 'rejected'
				  AND acr.role_code = 'encoder'
			  )
		)
	`, fansubGroupID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group first project qualification: %w", err)
	}
	return exists, nil
}

func (r *FansubGroupHistoryRepository) ValidateFirstProjectAllowed(ctx context.Context, fansubGroupID int64) error {
	hasFirstProject, err := r.HasQualifiedFirstProject(ctx, fansubGroupID)
	if err != nil {
		return err
	}
	if !hasFirstProject {
		return ErrValidation
	}
	return nil
}

// HasQualifiedFirstRelease reports whether the group has at least one release
// version with a matching release/co-op segment and a real release contribution.
func (r *FansubGroupHistoryRepository) HasQualifiedFirstRelease(ctx context.Context, fansubGroupID int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM release_versions rv
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes ep ON ep.id = fr.episode_id
			WHERE rvg.fansub_group_id = $1
			  AND (
				EXISTS (
					SELECT 1
					FROM release_version_notes rvn
					WHERE rvn.release_version_id = rv.id
					  AND rvn.deleted_at IS NULL
					  AND rvn.status <> 'deleted'
					  AND COALESCE(
						NULLIF(BTRIM(rvn.body_text), ''),
						NULLIF(BTRIM(rvn.body_markdown), ''),
						NULLIF(BTRIM(rvn.body_html), ''),
						NULLIF(BTRIM(COALESCE(rvn.title, '')), '')
					  ) IS NOT NULL
					  AND EXISTS (
						SELECT 1
						FROM anime_contributions ac_note
						LEFT JOIN hist_fansub_group_members hfgm_note ON hfgm_note.id = ac_note.fansub_group_member_id
						WHERE ac_note.anime_id = ep.anime_id
						  AND ac_note.fansub_group_id = rvg.fansub_group_id
						  AND COALESCE(ac_note.member_id, hfgm_note.member_id) = rvn.member_id
						  AND ac_note.status <> 'rejected'
						  AND (ac_note.release_version_id = rv.id OR ac_note.release_version_id IS NULL)
					  )
				)
				OR EXISTS (
					SELECT 1
					FROM release_version_media rvm
					WHERE rvm.release_version_id = rv.id
					  AND rvm.deleted_at IS NULL
					  AND EXISTS (
						SELECT 1
						FROM member_claims mc_media
						JOIN anime_contributions ac_media ON ac_media.member_id = mc_media.member_id
						LEFT JOIN hist_fansub_group_members hfgm_media ON hfgm_media.id = ac_media.fansub_group_member_id
						WHERE mc_media.app_user_id = rvm.uploaded_by_user_id
						  AND mc_media.claim_status = 'verified'
						  AND ac_media.anime_id = ep.anime_id
						  AND ac_media.fansub_group_id = rvg.fansub_group_id
						  AND COALESCE(ac_media.member_id, hfgm_media.member_id) = mc_media.member_id
						  AND ac_media.status <> 'rejected'
						  AND (ac_media.release_version_id = rv.id OR ac_media.release_version_id IS NULL)
					  )
				)
			  )
			  AND EXISTS (
				SELECT 1
				FROM theme_segments ts
				JOIN themes th ON th.id = ts.theme_id
				CROSS JOIN LATERAL (
					SELECT COALESCE(
						ep.sort_index,
						CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END
					) AS episode_anchor
				) anchor
				WHERE th.anime_id = ep.anime_id
				  AND anchor.episode_anchor IS NOT NULL
				  AND (ts.start_episode IS NULL OR ts.start_episode <= anchor.episode_anchor)
				  AND (ts.end_episode IS NULL OR ts.end_episode >= anchor.episode_anchor)
				  AND (
					ts.fansub_group_id IS NULL
					OR ts.fansub_group_id IN (
						SELECT rvg_segment.fansub_group_id
						FROM release_version_groups rvg_segment
						WHERE rvg_segment.release_version_id = rv.id
					)
				  )
				  AND COALESCE(NULLIF(BTRIM(ts.version), ''), COALESCE(NULLIF(BTRIM(rv.version), ''), 'v1')) = COALESCE(NULLIF(BTRIM(rv.version), ''), 'v1')
			  )
		)
	`, fansubGroupID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group first release qualification: %w", err)
	}
	return exists, nil
}

func (r *FansubGroupHistoryRepository) ValidateFirstReleaseAllowed(ctx context.Context, fansubGroupID int64) error {
	hasFirstRelease, err := r.HasQualifiedFirstRelease(ctx, fansubGroupID)
	if err != nil {
		return err
	}
	if !hasFirstRelease {
		return ErrValidation
	}
	return nil
}

// HasQualifiedCompletedProject reports whether the group has at least one anime
// whose every release version for that group has a real group contribution.
func (r *FansubGroupHistoryRepository) HasQualifiedCompletedProject(ctx context.Context, fansubGroupID int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM anime_fansub_groups afg
			WHERE afg.fansub_group_id = $1
			  AND EXISTS (
				SELECT 1
				FROM release_versions rv
				JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
				JOIN fansub_releases fr ON fr.id = rv.release_id
				JOIN episodes ep ON ep.id = fr.episode_id
				WHERE rvg.fansub_group_id = afg.fansub_group_id
				  AND ep.anime_id = afg.anime_id
			  )
			  AND NOT EXISTS (
				SELECT 1
				FROM release_versions rv
				JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
				JOIN fansub_releases fr ON fr.id = rv.release_id
				JOIN episodes ep ON ep.id = fr.episode_id
				WHERE rvg.fansub_group_id = afg.fansub_group_id
				  AND ep.anime_id = afg.anime_id
				  AND NOT (
					EXISTS (
						SELECT 1
						FROM release_version_notes rvn
						WHERE rvn.release_version_id = rv.id
						  AND rvn.deleted_at IS NULL
						  AND rvn.status <> 'deleted'
						  AND COALESCE(
							NULLIF(BTRIM(rvn.body_text), ''),
							NULLIF(BTRIM(rvn.body_markdown), ''),
							NULLIF(BTRIM(rvn.body_html), ''),
							NULLIF(BTRIM(COALESCE(rvn.title, '')), '')
						  ) IS NOT NULL
						  AND EXISTS (
							SELECT 1
							FROM anime_contributions ac_note
							LEFT JOIN hist_fansub_group_members hfgm_note ON hfgm_note.id = ac_note.fansub_group_member_id
							WHERE ac_note.anime_id = ep.anime_id
							  AND ac_note.fansub_group_id = rvg.fansub_group_id
							  AND COALESCE(ac_note.member_id, hfgm_note.member_id) = rvn.member_id
							  AND ac_note.status <> 'rejected'
							  AND (ac_note.release_version_id = rv.id OR ac_note.release_version_id IS NULL)
						  )
					)
					OR EXISTS (
						SELECT 1
						FROM release_version_media rvm
						WHERE rvm.release_version_id = rv.id
						  AND rvm.deleted_at IS NULL
						  AND EXISTS (
							SELECT 1
							FROM member_claims mc_media
							JOIN anime_contributions ac_media ON ac_media.member_id = mc_media.member_id
							LEFT JOIN hist_fansub_group_members hfgm_media ON hfgm_media.id = ac_media.fansub_group_member_id
							WHERE mc_media.app_user_id = rvm.uploaded_by_user_id
							  AND mc_media.claim_status = 'verified'
							  AND ac_media.anime_id = ep.anime_id
							  AND ac_media.fansub_group_id = rvg.fansub_group_id
							  AND COALESCE(ac_media.member_id, hfgm_media.member_id) = mc_media.member_id
							  AND ac_media.status <> 'rejected'
							  AND (ac_media.release_version_id = rv.id OR ac_media.release_version_id IS NULL)
						  )
					)
				  )
			  )
		)
	`, fansubGroupID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group completed project qualification: %w", err)
	}
	return exists, nil
}

func (r *FansubGroupHistoryRepository) ValidateCompletedProjectAllowed(ctx context.Context, fansubGroupID int64) error {
	hasCompletedProject, err := r.HasQualifiedCompletedProject(ctx, fansubGroupID)
	if err != nil {
		return err
	}
	if !hasCompletedProject {
		return ErrValidation
	}
	return nil
}

// HasQualifiedCollaboration reports whether the group participates in at least
// one release version with another fansub group.
func (r *FansubGroupHistoryRepository) HasQualifiedCollaboration(ctx context.Context, fansubGroupID int64) (bool, error) {
	if fansubGroupID <= 0 {
		return false, ErrNotFound
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM release_version_groups rvg
			WHERE rvg.fansub_group_id = $1
			  AND (
				SELECT COUNT(DISTINCT rvg_peer.fansub_group_id)
				FROM release_version_groups rvg_peer
				WHERE rvg_peer.release_version_id = rvg.release_version_id
			  ) >= 2
		)
	`, fansubGroupID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check group collaboration qualification: %w", err)
	}
	return exists, nil
}

func (r *FansubGroupHistoryRepository) ValidateCollaborationAllowed(ctx context.Context, fansubGroupID int64) error {
	hasCollaboration, err := r.HasQualifiedCollaboration(ctx, fansubGroupID)
	if err != nil {
		return err
	}
	if !hasCollaboration {
		return ErrValidation
	}
	return nil
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
