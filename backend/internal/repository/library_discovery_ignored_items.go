package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// libraryDiscoveryServerKey is hard-coded (D-22): this phase stays on one Jellyfin
// server. The `server_key` column in `library_discovery_ignored_items` exists as a
// provision for a future multi-server phase, not for this phase's logic to branch on.
const libraryDiscoveryServerKey = "default"

// LibraryDiscoveryIgnoreRepository owns the reversible "ignore" state (D-17) for
// Jellyfin library items surfaced on the admin Discovery page. It stores only current
// state, never a history log -- the audit trail (D-21) is written via audit_logs by the
// calling handler (165-06), not duplicated here.
type LibraryDiscoveryIgnoreRepository struct {
	db *pgxpool.Pool
}

// NewLibraryDiscoveryIgnoreRepository constructs a LibraryDiscoveryIgnoreRepository
// against a shared DB pool handle, matching the repository layer's domain-split
// convention (each domain repository owns its own pool reference).
func NewLibraryDiscoveryIgnoreRepository(db *pgxpool.Pool) *LibraryDiscoveryIgnoreRepository {
	return &LibraryDiscoveryIgnoreRepository{db: db}
}

// InsertLibraryDiscoveryIgnore marks a Jellyfin library item as ignored. It is
// idempotent: ignoring an already-ignored item is a no-op (ON CONFLICT DO NOTHING),
// never an error. server_key is intentionally omitted from the INSERT column list so
// the DB-level DEFAULT 'default' fires (D-22 provision column). actorAppUserID is
// caller-supplied identity (T-165-04): this function never derives identity itself.
func (r *LibraryDiscoveryIgnoreRepository) InsertLibraryDiscoveryIgnore(
	ctx context.Context,
	itemID string,
	actorAppUserID *int64,
) error {
	normalized := normalizeDistinctStrings([]string{itemID})
	if len(normalized) == 0 {
		return fmt.Errorf("insert library discovery ignore: itemID must not be empty")
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO library_discovery_ignored_items (jellyfin_item_id, ignored_by_app_user_id)
		VALUES ($1, $2)
		ON CONFLICT (server_key, jellyfin_item_id) DO NOTHING
	`, normalized[0], actorAppUserID)
	if err != nil {
		return fmt.Errorf("insert library discovery ignore for %q: %w", normalized[0], err)
	}

	return nil
}

// RemoveLibraryDiscoveryIgnore un-ignores a Jellyfin library item (reversal of
// InsertLibraryDiscoveryIgnore). Removing an item that is not currently ignored is a
// no-op, never an error.
func (r *LibraryDiscoveryIgnoreRepository) RemoveLibraryDiscoveryIgnore(
	ctx context.Context,
	itemID string,
) error {
	normalized := normalizeDistinctStrings([]string{itemID})
	if len(normalized) == 0 {
		return fmt.Errorf("remove library discovery ignore: itemID must not be empty")
	}

	_, err := r.db.Exec(ctx, `
		DELETE FROM library_discovery_ignored_items
		WHERE server_key = $1 AND jellyfin_item_id = $2
	`, libraryDiscoveryServerKey, normalized[0])
	if err != nil {
		return fmt.Errorf("remove library discovery ignore for %q: %w", normalized[0], err)
	}

	return nil
}

// FindIgnoredLibraryDiscoveryItems reports which of the given Jellyfin item IDs are
// currently ignored, in exactly one SQL query regardless of how many IDs are passed --
// matching FindExistingAnimeByJellyfinIntakeRefs's single-query batch discipline
// (admin_content_jellyfin_intake.go). The returned map contains a `true` entry only for
// IDs that are currently ignored; missing/not-ignored IDs are simply absent (map lookup
// on an absent key already yields the zero value `false`).
func (r *LibraryDiscoveryIgnoreRepository) FindIgnoredLibraryDiscoveryItems(
	ctx context.Context,
	itemIDs []string,
) (map[string]bool, error) {
	normalized := normalizeDistinctStrings(itemIDs)
	result := make(map[string]bool, len(normalized))
	if len(normalized) == 0 {
		return result, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT jellyfin_item_id
		FROM library_discovery_ignored_items
		WHERE server_key = $1 AND jellyfin_item_id = ANY($2::text[])
	`, libraryDiscoveryServerKey, normalized)
	if err != nil {
		return nil, fmt.Errorf("query ignored library discovery items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var itemID string
		if err := rows.Scan(&itemID); err != nil {
			return nil, fmt.Errorf("scan ignored library discovery item: %w", err)
		}
		result[itemID] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate ignored library discovery items: %w", err)
	}

	return result, nil
}
