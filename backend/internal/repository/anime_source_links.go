package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

type animeSourceLinkQueryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func syncAnimeSourceLinks(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	primary *string,
	extra []string,
) error {
	values := normalizeDistinctStrings(extra)
	if primary != nil && strings.TrimSpace(*primary) != "" {
		values = normalizeDistinctStrings(append([]string{strings.TrimSpace(*primary)}, values...))
	}
	if animeID <= 0 || len(values) == 0 {
		return nil
	}

	for _, source := range values {
		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO anime_source_links (anime_id, source)
			VALUES ($1, $2)
			ON CONFLICT (anime_id, source) DO NOTHING
			`,
			animeID,
			source,
		); err != nil {
			return fmt.Errorf("link anime source anime=%d source=%q: %w", animeID, source, err)
		}
	}

	return nil
}

func loadAnimeSourceLinks(ctx context.Context, q animeSourceLinkQueryer, animeID int64) ([]string, error) {
	rows, err := q.Query(ctx, `SELECT source FROM anime_source_links WHERE anime_id = $1 ORDER BY source ASC`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime source links %d: %w", animeID, err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var source string
		if err := rows.Scan(&source); err != nil {
			return nil, fmt.Errorf("scan anime source link %d: %w", animeID, err)
		}
		result = append(result, source)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime source links %d: %w", animeID, err)
	}

	return result, nil
}

// linkAdditionalJellyfinSource inserts an additional jellyfin: source for an anime without
// touching anime.source (D-05 Pitfall-3 fix, 165-07): used when anime.source already carries a
// different provider's reference (e.g. anisearch:) that must not be overwritten by connecting a
// second Jellyfin folder. The ON CONFLICT target is the `source` column alone, not
// (anime_id, source): the table also carries a GLOBAL UNIQUE(source) constraint
// (database/migrations/0047_add_anime_source_links.up.sql:6), and a conflict target that omits
// that constraint would surface as an unhandled unique-violation error instead of resolving to
// DO NOTHING.
func linkAdditionalJellyfinSource(ctx context.Context, tx pgx.Tx, animeID int64, source string) error {
	trimmed := strings.TrimSpace(source)
	if animeID <= 0 || trimmed == "" {
		return nil
	}
	if _, err := tx.Exec(
		ctx,
		`
		INSERT INTO anime_source_links (anime_id, source)
		VALUES ($1, $2)
		ON CONFLICT (source) DO NOTHING
		`,
		animeID,
		trimmed,
	); err != nil {
		return fmt.Errorf("link additional jellyfin source anime=%d source=%q: %w", animeID, trimmed, err)
	}
	return nil
}

// LinkAdditionalJellyfinSource is the exported, self-transacting wrapper
// connectJellyfinFolderAdditively (165-07, backend/internal/handlers/jellyfin_source_folder_management.go)
// calls -- callers outside this package cannot open their own pgx.Tx.
func (r *AdminContentRepository) LinkAdditionalJellyfinSource(ctx context.Context, animeID int64, source string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin link additional jellyfin source tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := linkAdditionalJellyfinSource(ctx, tx, animeID, source); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit link additional jellyfin source tx: %w", err)
	}
	return nil
}

// removeAnimeSourceLink deletes one (anime_id, source) row (165-07 DELETE
// /admin/anime/:id/jellyfin/folders/:source). Unlike the older unignore-delete convention
// (165-02's RemoveLibraryDiscoveryIgnore), a DELETE that matches zero rows is treated as a
// caller-visible error (ErrNotFound), not a silent no-op: a mismatched/already-removed source
// string must never report false success (165-VERIFICATION.md D-18 blocker -- a silent 0-row
// DELETE let RemoveAnimeJellyfinFolder respond 200 and write a success audit entry while the
// anime_source_links row stayed untouched).
func removeAnimeSourceLink(ctx context.Context, tx pgx.Tx, animeID int64, source string) error {
	trimmed := strings.TrimSpace(source)
	if animeID <= 0 || trimmed == "" {
		return ErrNotFound
	}
	tag, err := tx.Exec(
		ctx,
		`DELETE FROM anime_source_links WHERE anime_id = $1 AND source = $2`,
		animeID,
		trimmed,
	)
	if err != nil {
		return fmt.Errorf("remove anime source link anime=%d source=%q: %w", animeID, trimmed, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RemoveAnimeSourceLink is the exported, self-transacting wrapper RemoveAnimeJellyfinFolder
// (165-07, backend/internal/handlers/jellyfin_source_folder_management.go) calls.
func (r *AdminContentRepository) RemoveAnimeSourceLink(ctx context.Context, animeID int64, source string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin remove anime source link tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := removeAnimeSourceLink(ctx, tx, animeID, source); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit remove anime source link tx: %w", err)
	}
	return nil
}

func extractAnimeSourceIDByPrefix(primary *string, sourceLinks []string, prefix string) string {
	normalizedPrefix := strings.ToLower(strings.TrimSpace(prefix))
	if normalizedPrefix == "" {
		return ""
	}
	for _, source := range append([]string{derefString(primary)}, sourceLinks...) {
		trimmed := strings.TrimSpace(source)
		if trimmed == "" || !strings.HasPrefix(strings.ToLower(trimmed), normalizedPrefix) {
			continue
		}
		return strings.TrimSpace(trimmed[len(normalizedPrefix):])
	}
	return ""
}
