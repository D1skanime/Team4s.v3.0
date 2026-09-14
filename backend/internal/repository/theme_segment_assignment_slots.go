package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/models"
)

var ErrSegmentAssignmentConflict = errors.New("segment assignment slot is occupied")

// Lock the neutral anime before any segment metadata, assignment or import release
// mutation. NO KEY UPDATE serializes these writers while remaining compatible with
// foreign-key checks. Import takes this lock before its release-row locks.
func lockSegmentAssignmentAnimeTx(ctx context.Context, tx pgx.Tx, animeID int64) error {
	var id int64
	if err := tx.QueryRow(ctx, `SELECT id FROM anime WHERE id = $1 FOR NO KEY UPDATE`, animeID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("lock segment assignment anime=%d: %w", animeID, err)
	}
	return nil
}

func lockSegmentAssignmentDomainTx(ctx context.Context, tx pgx.Tx, segmentID int64) (int64, error) {
	var animeID int64
	if err := tx.QueryRow(ctx, `SELECT t.anime_id FROM theme_segments s JOIN themes t ON t.id=s.theme_id WHERE s.id=$1`, segmentID).Scan(&animeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}
	return animeID, lockSegmentAssignmentAnimeTx(ctx, tx, animeID)
}

func segmentAssignmentSlotType(name string) string {
	kind := CanonicalSegmentType(name)
	if kind == "OP" || kind == "ED" {
		return kind
	}
	return ""
}

func segmentAssignmentTypeTx(ctx context.Context, tx pgx.Tx, segmentID int64) (string, error) {
	var name string
	err := tx.QueryRow(ctx, `SELECT tt.name FROM theme_segments s JOIN themes t ON t.id=s.theme_id JOIN theme_types tt ON tt.id=t.theme_type_id WHERE s.id=$1`, segmentID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return segmentAssignmentSlotType(name), err
}

// One batched occupancy read. Classification uses the public projection's existing
// canonical function, not another SQL alias registry. Existing same-segment rows are
// excluded, making repeated assignment idempotent even for historical duplicate data.
func segmentAssignmentConflictsTx(ctx context.Context, tx pgx.Tx, segmentIDs []int64, slotType string, releaseVersionIDs []int64) ([]models.ThemeSegmentAssignmentConflict, error) {
	conflicts := make([]models.ThemeSegmentAssignmentConflict, 0)
	if slotType == "" || len(releaseVersionIDs) == 0 {
		return conflicts, nil
	}
	rows, err := tx.Query(ctx, `
        SELECT a.release_version_id, COALESCE(e.episode_number, ''), a.theme_segment_id, tt.name
        FROM theme_segment_assignments a
        JOIN theme_segments s ON s.id=a.theme_segment_id
        JOIN themes t ON t.id=s.theme_id
        JOIN theme_types tt ON tt.id=t.theme_type_id
        JOIN release_versions rv ON rv.id=a.release_version_id
        JOIN fansub_releases fr ON fr.id=rv.release_id
        JOIN episodes e ON e.id=fr.episode_id
        WHERE a.release_version_id=ANY($1::bigint[]) AND NOT (a.theme_segment_id=ANY($2::bigint[]))
        ORDER BY a.release_version_id, a.theme_segment_id`, releaseVersionIDs, segmentIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := make(map[int64]bool)
	for rows.Next() {
		var conflict models.ThemeSegmentAssignmentConflict
		var name string
		if err := rows.Scan(&conflict.ReleaseVersionID, &conflict.EpisodeNumber, &conflict.ExistingSegmentID, &name); err != nil {
			return nil, err
		}
		if segmentAssignmentSlotType(name) == slotType && !seen[conflict.ReleaseVersionID] {
			conflicts = append(conflicts, conflict)
			seen[conflict.ReleaseVersionID] = true
		}
	}
	return conflicts, rows.Err()
}

func validateSegmentAssignmentTargetTx(ctx context.Context, tx pgx.Tx, segmentID, releaseVersionID int64) error {
	var matches bool
	err := tx.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM theme_segments s JOIN themes t ON t.id=s.theme_id
            JOIN episodes e ON e.anime_id=t.anime_id
            JOIN fansub_releases fr ON fr.episode_id=e.id
            JOIN release_versions rv ON rv.release_id=fr.id
            WHERE s.id=$1 AND rv.id=$2
        )`, segmentID, releaseVersionID).Scan(&matches)
	if err != nil {
		return err
	}
	if !matches {
		return ErrConflict
	}
	return nil
}

func assignThemeSegmentToReleaseVersionTx(ctx context.Context, tx pgx.Tx, segmentID, releaseVersionID int64) (*models.AdminThemeSegmentAssignment, error) {
	if err := validateSegmentAssignmentTargetTx(ctx, tx, segmentID, releaseVersionID); err != nil {
		return nil, err
	}
	slotType, err := segmentAssignmentTypeTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM theme_segment_assignments WHERE theme_segment_id=$1 AND release_version_id=$2)`, segmentID, releaseVersionID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		conflicts, err := segmentAssignmentConflictsTx(ctx, tx, []int64{segmentID}, slotType, []int64{releaseVersionID})
		if err != nil {
			return nil, err
		}
		if len(conflicts) > 0 {
			return nil, ErrSegmentAssignmentConflict
		}
	}
	return scanThemeSegmentAssignment(tx.QueryRow(ctx, `
        INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1,$2)
        ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE SET theme_segment_id=EXCLUDED.theme_segment_id
        RETURNING `+themeSegmentAssignmentColumns, segmentID, releaseVersionID))
}

func (r *AdminContentRepository) syncSegmentAssignmentRangeTx(ctx context.Context, tx pgx.Tx, segmentID int64) (*models.ThemeSegmentAssignmentSyncResult, error) {
	var animeID int64
	var groupID *int64
	var start, end *int
	var version string
	if err := tx.QueryRow(ctx, `SELECT t.anime_id, s.fansub_group_id, s.version, s.start_episode, s.end_episode FROM theme_segments s JOIN themes t ON t.id=s.theme_id WHERE s.id=$1`, segmentID).Scan(&animeID, &groupID, &version, &start, &end); err != nil {
		return nil, err
	}
	if groupID == nil || start == nil || end == nil || *groupID <= 0 || *start <= 0 || *end <= 0 {
		return nil, nil
	}
	version = strings.TrimSpace(version)
	if version == "" {
		version = "v1"
	}
	return r.assignThemeSegmentToEpisodeRangeTx(ctx, tx, segmentID, animeID, *groupID, version, *start, *end)
}

// Validate retained assignments after a type-changing edit, including protected
// overrides and assignments outside the edited range's reconciliation domain.
func validateSegmentAssignmentTypeChangeTx(ctx context.Context, tx pgx.Tx, segmentIDs []int64, slotType string) error {
	if slotType == "" || len(segmentIDs) == 0 {
		return nil
	}
	rows, err := tx.Query(ctx, `SELECT release_version_id FROM theme_segment_assignments WHERE theme_segment_id=ANY($1::bigint[]) ORDER BY release_version_id`, segmentIDs)
	if err != nil {
		return err
	}
	ids, err := collectInt64Column(rows)
	if err != nil {
		return err
	}
	seen := make(map[int64]bool)
	for _, id := range ids {
		if seen[id] {
			return ErrSegmentAssignmentConflict
		}
		seen[id] = true
	}
	conflicts, err := segmentAssignmentConflictsTx(ctx, tx, segmentIDs, slotType, ids)
	if err != nil {
		return err
	}
	if len(conflicts) > 0 {
		return ErrSegmentAssignmentConflict
	}
	return nil
}
