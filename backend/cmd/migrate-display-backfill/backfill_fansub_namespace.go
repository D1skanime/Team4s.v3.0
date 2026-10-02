package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// fansubNamespaceCandidate is one media_files row (any variant: original/thumb/display) linked
// to a fansub group -- via fansub_groups.logo_id/banner_id or fansub_group_media.media_id --
// whose stored path is not yet namespaced under <storageDir>/fansub/<group_id>/... (D-09/D-17).
type fansubNamespaceCandidate struct {
	MediaFileID  int64
	MediaAssetID int64
	GroupID      int64
	Path         string
	// AssetFilePath is the media_assets.file_path value for this candidate's asset, used to
	// also update media_assets.file_path when it currently equals Path (it always does for the
	// 'original' variant, which media_assets.file_path has always pointed at).
	AssetFilePath string
}

// runFansubNamespaceMigration implements Task 2's second half (D-09/D-17): every pre-existing
// flat-stored fansub logo/banner/group-media file is physically moved to
// <storageDir>/fansub/<group_id>/<same filename>, and the corresponding media_files.path (plus
// media_assets.file_path, when it pointed at the same file) is updated to match. Idempotent by
// construction: a row whose stored path already lives under <storageDir>/fansub/ is excluded
// from the candidate set entirely (the predicate is evaluated against the CURRENT, possibly
// already-migrated, database path -- not the filesystem).
func runFansubNamespaceMigration(ctx context.Context, db *pgxpool.Pool, cfg Config) (*BackfillStats, error) {
	stats := &BackfillStats{}

	candidates, err := fetchFansubNamespaceCandidates(ctx, db, cfg.MediaStorageDir)
	if err != nil {
		return nil, fmt.Errorf("fetch fansub namespace candidates: %w", err)
	}
	stats.TotalCandidates = len(candidates)
	log.Printf("fansub namespace migration: found %d file(s) to migrate\n", stats.TotalCandidates)

	for _, candidate := range candidates {
		if cfg.DryRun {
			stats.ProcessedOK++
			log.Printf("DRY RUN: would migrate media_files %d to the fansub/%d namespace\n", candidate.MediaFileID, candidate.GroupID)
			continue
		}
		if err := processFansubNamespaceCandidate(ctx, db, cfg, candidate); err != nil {
			log.Printf("FAILED media_files %d: %v\n", candidate.MediaFileID, err)
			stats.Failed++
			continue
		}
		stats.ProcessedOK++
		log.Printf("OK: media_files %d -> fansub/%d\n", candidate.MediaFileID, candidate.GroupID)
	}

	return stats, nil
}

// fansubNamespacePrefix returns the <storageDir>/fansub/ prefix (OS-native separators) used both
// to filter already-migrated rows out of the candidate query and to build each new destination
// path.
func fansubNamespacePrefix(storageDir string) string {
	return filepath.Join(storageDir, "fansub") + string(os.PathSeparator)
}

// fetchFansubNamespaceCandidates unions the three ways a media_asset can be linked to a fansub
// group (group logo, group banner, group gallery media) and returns every one of that group's
// media_files rows whose path is not yet namespaced. The containment filter is evaluated in Go
// (fansubNamespacePrefix), not SQL, since it depends on the runtime-configured storage directory.
func fetchFansubNamespaceCandidates(ctx context.Context, db *pgxpool.Pool, storageDir string) ([]fansubNamespaceCandidate, error) {
	rows, err := db.Query(ctx, `
		SELECT mf.id, mf.media_id, g.group_id, mf.path, ma.file_path
		FROM media_files mf
		JOIN media_assets ma ON ma.id = mf.media_id
		JOIN (
			SELECT fg.id AS group_id, fg.logo_id AS media_id FROM fansub_groups fg WHERE fg.logo_id IS NOT NULL
			UNION
			SELECT fg.id AS group_id, fg.banner_id AS media_id FROM fansub_groups fg WHERE fg.banner_id IS NOT NULL
			UNION
			SELECT fgm.group_id, fgm.media_id FROM fansub_group_media fgm
		) g ON g.media_id = ma.id
		ORDER BY mf.id
	`)
	if err != nil {
		return nil, fmt.Errorf("query fansub namespace candidates: %w", err)
	}
	defer rows.Close()

	prefix := fansubNamespacePrefix(storageDir)
	var candidates []fansubNamespaceCandidate
	for rows.Next() {
		var c fansubNamespaceCandidate
		if err := rows.Scan(&c.MediaFileID, &c.MediaAssetID, &c.GroupID, &c.Path, &c.AssetFilePath); err != nil {
			return nil, fmt.Errorf("scan fansub namespace candidate: %w", err)
		}
		if strings.HasPrefix(c.Path, prefix) {
			continue // already migrated (idempotent no-op)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub namespace candidates: %w", err)
	}
	return candidates, nil
}

// processFansubNamespaceCandidate physically moves one file into the namespaced directory and
// updates its media_files.path (and media_assets.file_path, when it matched) with a race-safe,
// conditional UPDATE guarded on the OLD path -- never clobbers a row a concurrent run already
// migrated.
func processFansubNamespaceCandidate(ctx context.Context, db *pgxpool.Pool, cfg Config, candidate fansubNamespaceCandidate) error {
	newDir := filepath.Join(cfg.MediaStorageDir, "fansub", strconv.FormatInt(candidate.GroupID, 10))
	newPath := filepath.Join(newDir, filepath.Base(candidate.Path))

	if err := os.MkdirAll(newDir, 0o755); err != nil {
		return fmt.Errorf("create namespace directory: %w", err)
	}
	if err := os.Rename(candidate.Path, newPath); err != nil {
		return fmt.Errorf("move file into namespace: %w", err)
	}

	tag, err := db.Exec(ctx, `
		UPDATE media_files SET path = $1 WHERE id = $2 AND path = $3
	`, newPath, candidate.MediaFileID, candidate.Path)
	if err != nil {
		return fmt.Errorf("update media_files.path: %w", err)
	}
	if tag.RowsAffected() == 0 {
		// Someone else already migrated this row concurrently (or it changed underneath us) --
		// move our own file back so we never leave an orphaned copy at the new path while the DB
		// still believes the old path is current.
		_ = os.Rename(newPath, candidate.Path)
		return fmt.Errorf("media_files %d already migrated concurrently", candidate.MediaFileID)
	}

	if candidate.AssetFilePath == candidate.Path {
		if _, err := db.Exec(ctx, `
			UPDATE media_assets SET file_path = $1 WHERE id = $2 AND file_path = $3
		`, newPath, candidate.MediaAssetID, candidate.Path); err != nil {
			return fmt.Errorf("update media_assets.file_path: %w", err)
		}
	}

	return nil
}
