package repository

// Proves 182-03-PLAN.md Task 1's D-03 behavior against a real, disposable Phase-182
// Postgres fixture (never team4s_v2): migration 0184's pre-flight safety check aborts
// the whole transaction (column survives) when an anime has a legacy-only cover with
// no matching V2 poster row, and applies cleanly (column is dropped) when every
// cover_image-carrying anime already has a matching V2 poster row. Skips cleanly when
// TEAM4S_PHASE182_TEST_DSN is unset.

import (
	"context"
	"os"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

const (
	phase182Migration0184UpPath   = "../../../database/migrations/0184_drop_anime_cover_image.up.sql"
	phase182Migration0184DownPath = "../../../database/migrations/0184_drop_anime_cover_image.down.sql"
)

func TestAnimeCoverImageDropMigration(t *testing.T) {
	migrationSQL, err := os.ReadFile(phase182Migration0184UpPath)
	require.NoError(t, err, "resolve migration 0184 up.sql relative to the test file's location")

	t.Run("success path: every cover_image-carrying anime already has a matching V2 poster", func(t *testing.T) {
		pool := testsupport.OpenPhase182Postgres(t)
		ctx := context.Background()

		const animeID int64 = 1
		_, err := pool.Exec(ctx, `
			INSERT INTO anime (id, title, cover_image) VALUES ($1, 'Covered Anime', '/media/anime/1/cover/original.jpg')
		`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_assets (id, media_type_id, file_path) VALUES (1, 1, '/media/anime/1/cover/different-original.jpg')
		`)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, 1, 0)
		`, animeID)
		require.NoError(t, err)

		testsupport.ApplySQLFile(t, pool, phase182Migration0184UpPath)

		var columnCount int
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'anime' AND column_name = 'cover_image'
		`).Scan(&columnCount))
		require.Equal(t, 0, columnCount, "anime.cover_image muss nach erfolgreicher Migration nicht mehr existieren")

		// D-03 reversibility: down.sql must restore the column as a nullable TEXT column
		// (no data restoration required -- only the column shape).
		testsupport.ApplySQLFile(t, pool, phase182Migration0184DownPath)

		var restoredColumnCount int
		var isNullable string
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'anime' AND column_name = 'cover_image'
		`).Scan(&restoredColumnCount))
		require.Equal(t, 1, restoredColumnCount, "down.sql muss anime.cover_image wiederherstellen")
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT is_nullable FROM information_schema.columns WHERE table_name = 'anime' AND column_name = 'cover_image'
		`).Scan(&isNullable))
		require.Equal(t, "YES", isNullable, "die wiederhergestellte Spalte muss nullable sein (kein NOT NULL/Default im Original)")
	})

	t.Run("abort path: a cover_image-carrying anime has no matching V2 poster", func(t *testing.T) {
		pool := testsupport.OpenPhase182Postgres(t)
		ctx := context.Background()

		const animeID int64 = 2
		_, err := pool.Exec(ctx, `
			INSERT INTO anime (id, title, cover_image) VALUES ($1, 'Legacy-Only Cover Anime', '/media/anime/2/cover/original.jpg')
		`, animeID)
		require.NoError(t, err)
		// Deliberately no anime_media/media_assets poster row for this anime.

		_, execErr := pool.Exec(ctx, string(migrationSQL))
		require.Error(t, execErr, "die Migration muss abbrechen, wenn ein Anime nur ein Legacy-Cover ohne V2-Poster-Gegenstueck hat")
		require.Contains(t, execErr.Error(), "anime.cover_image drop blocked")
		require.Contains(t, execErr.Error(), "2", "die Fehlermeldung muss die betroffene Anime-ID nennen")

		var columnCount int
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'anime' AND column_name = 'cover_image'
		`).Scan(&columnCount))
		require.Equal(t, 1, columnCount, "anime.cover_image muss nach abgebrochener Migration weiterhin existieren")
	})
}
