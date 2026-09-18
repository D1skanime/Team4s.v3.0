package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
)

// openEpisodeImportApplyTypeFixture extends the shared episode-import source
// fixture with the two pieces GAP-12 needs that the base fixture does not
// already provide: an anime.type column restricted to the real production
// anime_type enum vocabulary ('tv', 'film', 'ova', 'ona', 'special', 'bonus' --
// database/migrations/0001_init_anime.up.sql) and the non-"episode"
// episode_types rows the mapping can resolve to. The CHECK constraint mirrors
// the enum: it exists precisely so a regression that reintroduces a
// non-existent value like "movie" into a test case fails loudly here, instead
// of silently testing a scenario that cannot occur in production (CR-01).
func openEpisodeImportApplyTypeFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openEpisodeImportSourceFixture(t)
	_, err := pool.Exec(context.Background(), `
		ALTER TABLE anime ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'tv'
			CHECK (type IN ('tv', 'film', 'ova', 'ona', 'special', 'bonus'));
		ALTER TABLE episodes ADD COLUMN IF NOT EXISTS episode_type_source VARCHAR(80);
		INSERT INTO episode_types (id, name) VALUES (2, 'ova'), (3, 'ona'), (4, 'movie'), (5, 'special')
			ON CONFLICT (id) DO NOTHING;
	`)
	require.NoError(t, err)
	return pool
}

func TestEpisodeImportRepositoryDerivesEpisodeTypeFromAnimeType(t *testing.T) {
	for _, tc := range []struct {
		name         string
		animeType    string
		wantTypeName string
	}{
		{"film-maps-to-movie", "film", "movie"},
		{"ova", "ova", "ova"},
		{"ona", "ona", "ona"},
		{"special", "special", "special"},
		{"tv", "tv", "episode"},
		{"bonus-falls-back-to-episode", "bonus", "episode"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			pool := openEpisodeImportApplyTypeFixture(t)
			ctx := context.Background()
			_, err := pool.Exec(ctx, "UPDATE anime SET type = $1 WHERE id = 1", tc.animeType)
			require.NoError(t, err)

			repo := NewEpisodeImportRepository(pool, sourceFixtureCrewSeeder{})
			result, err := repo.Apply(ctx, episodeSourceInput())
			require.NoError(t, err)
			require.EqualValues(t, 1, result.EpisodesCreated)

			var typeName string
			var typeSource *string
			require.NoError(t, pool.QueryRow(ctx, `
				SELECT et.name, e.episode_type_source
				FROM episodes e JOIN episode_types et ON et.id = e.episode_type_id
				WHERE e.anime_id = 1
			`).Scan(&typeName, &typeSource))
			require.Equal(t, tc.wantTypeName, typeName)
			require.NotNil(t, typeSource, "newly imported episodes must record a non-manual episode_type_source")
			require.Equal(t, models.EpisodeMetadataSourceImport, *typeSource)
			require.NotEqual(t, models.EpisodeMetadataSourceManual, *typeSource)
		})
	}
}

func TestEpisodeImportRepositoryNeverOverwritesManualEpisodeType(t *testing.T) {
	pool := openEpisodeImportApplyTypeFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, "UPDATE anime SET type = 'tv' WHERE id = 1")
	require.NoError(t, err)

	repo := NewEpisodeImportRepository(pool, sourceFixtureCrewSeeder{})
	input := episodeSourceInput()
	_, err = repo.Apply(ctx, input)
	require.NoError(t, err)

	// Admin manually retypes the episode to "movie" -- unrelated to the
	// owning anime's type -- and marks the source as manual.
	var movieTypeID int64
	require.NoError(t, pool.QueryRow(ctx, "SELECT id FROM episode_types WHERE name = 'movie'").Scan(&movieTypeID))
	_, err = pool.Exec(ctx, `
		UPDATE episodes SET episode_type_id = $1, episode_type_source = $2
		WHERE anime_id = 1 AND number = 1
	`, movieTypeID, models.EpisodeMetadataSourceManual)
	require.NoError(t, err)

	// A naive re-derivation from anime.type would now produce "ova" -- the
	// manual override must survive the reimport regardless.
	_, err = pool.Exec(ctx, "UPDATE anime SET type = 'ova' WHERE id = 1")
	require.NoError(t, err)
	_, err = repo.Apply(ctx, input)
	require.NoError(t, err)

	var typeName, typeSource string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT et.name, e.episode_type_source
		FROM episodes e JOIN episode_types et ON et.id = e.episode_type_id
		WHERE e.anime_id = 1 AND e.number = 1
	`).Scan(&typeName, &typeSource))
	require.Equal(t, "movie", typeName)
	require.Equal(t, models.EpisodeMetadataSourceManual, typeSource)
}

// TestEpisodeImportRepositoryUpdatesExistingEpisodeInPlaceWhenDerivedTypeChanges
// covers CR-02: an anime whose already-imported, non-manually-classified
// episode was created before its anime.type-derived episode_type_id changed
// (e.g. 11eyes-style metadata correction, or simply the anime's type being
// fixed after the fact) must have that pre-existing row UPDATEd in place on
// re-import -- not duplicated into a second `episodes` row that then
// fragments the release/variant graph across two rows for the same logical
// episode.
func TestEpisodeImportRepositoryUpdatesExistingEpisodeInPlaceWhenDerivedTypeChanges(t *testing.T) {
	pool := openEpisodeImportApplyTypeFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, "UPDATE anime SET type = 'tv' WHERE id = 1")
	require.NoError(t, err)

	repo := NewEpisodeImportRepository(pool, sourceFixtureCrewSeeder{})
	input := episodeSourceInput()
	result, err := repo.Apply(ctx, input)
	require.NoError(t, err)
	require.EqualValues(t, 1, result.EpisodesCreated)

	var firstID int64
	var firstTypeName string
	var firstTypeSource string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT e.id, et.name, e.episode_type_source
		FROM episodes e JOIN episode_types et ON et.id = e.episode_type_id
		WHERE e.anime_id = 1 AND e.number = 1
	`).Scan(&firstID, &firstTypeName, &firstTypeSource))
	require.Equal(t, "episode", firstTypeName)
	require.Equal(t, models.EpisodeMetadataSourceImport, firstTypeSource)

	// The anime's type is corrected (or was simply mis-set before this
	// feature shipped) and the anime is re-imported -- a normal workflow,
	// e.g. a second fansub group releasing the already-known episode number.
	_, err = pool.Exec(ctx, "UPDATE anime SET type = 'ova' WHERE id = 1")
	require.NoError(t, err)
	result, err = repo.Apply(ctx, input)
	require.NoError(t, err)
	require.EqualValues(t, 0, result.EpisodesCreated, "the existing episode must be updated in place, not created again")
	require.EqualValues(t, 1, result.EpisodesExisting)

	var count int
	require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM episodes WHERE anime_id = 1 AND number = 1").Scan(&count))
	require.Equal(t, 1, count, "re-import must never create a duplicate episode row for the same anime+number")

	var secondID int64
	var secondTypeName string
	var secondTypeSource string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT e.id, et.name, e.episode_type_source
		FROM episodes e JOIN episode_types et ON et.id = e.episode_type_id
		WHERE e.anime_id = 1 AND e.number = 1
	`).Scan(&secondID, &secondTypeName, &secondTypeSource))
	require.Equal(t, firstID, secondID, "the same episode row must be reused, never duplicated")
	require.Equal(t, "ova", secondTypeName, "a non-manually-classified episode's type must follow the anime's corrected type")
	require.Equal(t, models.EpisodeMetadataSourceImport, secondTypeSource)
}
