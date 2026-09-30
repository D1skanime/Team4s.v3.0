package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// ReleaseVersionStoryOrderItem is the typed order projection for one existing
// release-version media relation or one existing theme-segment assignment.
type ReleaseVersionStoryOrderItem struct {
	ReleaseVersionID      int64
	ItemType              models.ReleaseVersionStoryItemType
	ReleaseVersionMediaID *int64
	ThemeSegmentID        *int64
	SortOrder             int
}

type ReleaseVersionStoryOrderKey struct {
	ItemType  models.ReleaseVersionStoryItemType
	MediaID   int64
	SegmentID int64
}

func storyOrderKey(item ReleaseVersionStoryOrderItem) ReleaseVersionStoryOrderKey {
	key := ReleaseVersionStoryOrderKey{ItemType: item.ItemType}
	if item.ReleaseVersionMediaID != nil {
		key.MediaID = *item.ReleaseVersionMediaID
	}
	if item.ThemeSegmentID != nil {
		key.SegmentID = *item.ThemeSegmentID
	}
	return key
}

// StoryOrderKeyForRequest exposes value-based identity checks to the handler.
func StoryOrderKeyForRequest(item ReleaseVersionStoryOrderItem) ReleaseVersionStoryOrderKey {
	return storyOrderKey(item)
}

// ListReleaseVersionStoryOrder normalizes the projection against active media
// and assigned Kara, then returns one deterministic mixed list.
func (r *MediaRepository) ListReleaseVersionStoryOrder(ctx context.Context, releaseVersionID int64) ([]ReleaseVersionStoryOrderItem, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin story order normalization: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if err := normalizeReleaseVersionStoryOrder(ctx, tx, releaseVersionID); err != nil {
		return nil, err
	}
	items, err := listReleaseVersionStoryOrder(ctx, tx, releaseVersionID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit story order normalization: %w", err)
	}
	return items, nil
}

func normalizeReleaseVersionStoryOrder(ctx context.Context, tx pgx.Tx, releaseVersionID int64) error {
	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_story_order o
		WHERE o.release_version_id = $1
		  AND ((o.item_type = 'media' AND NOT EXISTS (
			SELECT 1 FROM release_version_media rvm
			WHERE rvm.id = o.release_version_media_id AND rvm.release_version_id = o.release_version_id AND rvm.deleted_at IS NULL
		  )) OR (o.item_type = 'kara' AND NOT EXISTS (
			SELECT 1 FROM theme_segment_assignments tsa
			WHERE tsa.theme_segment_id = o.theme_segment_id AND tsa.release_version_id = o.release_version_id
		  )))
	`, releaseVersionID); err != nil {
		return fmt.Errorf("remove stale story order items for version %d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_story_order (release_version_id, item_type, release_version_media_id, sort_order)
		SELECT $1, 'media', rvm.id,
		       (COALESCE((SELECT MAX(sort_order) FROM release_version_story_order WHERE release_version_id = $1), 0)
		        + ROW_NUMBER() OVER (ORDER BY rvm.sort_order, rvm.id) * 10)
		FROM release_version_media rvm
		WHERE rvm.release_version_id = $1 AND rvm.deleted_at IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM release_version_story_order o
			WHERE o.release_version_id = $1 AND o.item_type = 'media' AND o.release_version_media_id = rvm.id
		  )
	`, releaseVersionID); err != nil {
		return fmt.Errorf("add missing media story order items for version %d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_story_order (release_version_id, item_type, theme_segment_id, sort_order)
		SELECT $1, 'kara', tsa.theme_segment_id,
		       (COALESCE((SELECT MAX(sort_order) FROM release_version_story_order WHERE release_version_id = $1), 0)
		        + ROW_NUMBER() OVER (ORDER BY ts.start_time NULLS LAST, tsa.theme_segment_id) * 10)
		FROM theme_segment_assignments tsa
		JOIN theme_segments ts ON ts.id = tsa.theme_segment_id
		WHERE tsa.release_version_id = $1
		  AND NOT EXISTS (
			SELECT 1 FROM release_version_story_order o
			WHERE o.release_version_id = $1 AND o.item_type = 'kara' AND o.theme_segment_id = tsa.theme_segment_id
		  )
	`, releaseVersionID); err != nil {
		return fmt.Errorf("add missing Kara story order items for version %d: %w", releaseVersionID, err)
	}
	return nil
}

func listReleaseVersionStoryOrder(ctx context.Context, tx pgx.Tx, releaseVersionID int64) ([]ReleaseVersionStoryOrderItem, error) {
	rows, err := tx.Query(ctx, `
		SELECT release_version_id, item_type, release_version_media_id, theme_segment_id, sort_order
		FROM release_version_story_order
		WHERE release_version_id = $1
		ORDER BY sort_order ASC, item_type ASC, COALESCE(release_version_media_id, theme_segment_id) ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("list story order for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()
	items := make([]ReleaseVersionStoryOrderItem, 0)
	for rows.Next() {
		var item ReleaseVersionStoryOrderItem
		var itemType string
		if err := rows.Scan(&item.ReleaseVersionID, &itemType, &item.ReleaseVersionMediaID, &item.ThemeSegmentID, &item.SortOrder); err != nil {
			return nil, fmt.Errorf("scan story order for version %d: %w", releaseVersionID, err)
		}
		item.ItemType = models.ReleaseVersionStoryItemType(itemType)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate story order for version %d: %w", releaseVersionID, err)
	}
	return items, nil
}

// ReorderReleaseVersionStoryOrder validates a complete typed list and replaces
// only the projection rows in one transaction. Domain rows are never copied or mutated.
func (r *MediaRepository) ReorderReleaseVersionStoryOrder(ctx context.Context, tx pgx.Tx, releaseVersionID int64, items []ReleaseVersionStoryOrderItem) error {
	current, err := listReleaseVersionStoryOrder(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}
	if len(items) == 0 || len(items) != len(current) {
		return fmt.Errorf("story order requires the complete item list")
	}
	currentKeys := make(map[ReleaseVersionStoryOrderKey]struct{}, len(current))
	for _, item := range current {
		currentKeys[storyOrderKey(item)] = struct{}{}
	}
	seen := make(map[ReleaseVersionStoryOrderKey]struct{}, len(items))
	for index := range items {
		item := &items[index]
		if item.ItemType != models.ReleaseVersionStoryItemMedia && item.ItemType != models.ReleaseVersionStoryItemKara {
			return fmt.Errorf("unsupported story item type %q", item.ItemType)
		}
		key := storyOrderKey(*item)
		if _, ok := currentKeys[key]; !ok {
			return ErrOwnershipMismatch
		}
		if _, ok := seen[key]; ok {
			return fmt.Errorf("story item occurs more than once")
		}
		seen[key] = struct{}{}
		item.ReleaseVersionID = releaseVersionID
		item.SortOrder = (index + 1) * 10
	}
	if len(seen) != len(currentKeys) {
		return fmt.Errorf("story order requires the complete item list")
	}
	if _, err := tx.Exec(ctx, `DELETE FROM release_version_story_order WHERE release_version_id = $1`, releaseVersionID); err != nil {
		return fmt.Errorf("replace story order for version %d: %w", releaseVersionID, err)
	}
	for _, item := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_version_story_order
				(release_version_id, item_type, release_version_media_id, theme_segment_id, sort_order)
			VALUES ($1, $2, $3, $4, $5)
		`, releaseVersionID, item.ItemType, item.ReleaseVersionMediaID, item.ThemeSegmentID, item.SortOrder); err != nil {
			return fmt.Errorf("insert story order item for version %d: %w", releaseVersionID, err)
		}
	}
	return nil
}
