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
// already provide: a nullable anime.type text column (production carries a
// NOT NULL anime_type enum; a plain nullable text column is enough to drive
// mapAnimeTypeToEpisodeType through every branch) and the non-"episode"
// episode_types rows the mapping can resolve to.
func openEpisodeImportApplyTypeFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openEpisodeImportSourceFixture(t)
	_, err := pool.Exec(context.Background(), `
		ALTER TABLE anime ADD COLUMN IF NOT EXISTS type TEXT;
		ALTER TABLE episodes ADD COLUMN IF NOT EXISTS episode_type_source VARCHAR(80);
		INSERT INTO episode_types (id, name) VALUES (2, 'ova'), (3, 'ona'), (4, 'movie'), (5, 'special')
			ON CONFLICT (id) DO NOTHING;
	`)
	require.NoError(t, err)
	return pool
}

func TestEpisodeImportRepositoryDerivesEpisodeTypeFromAnimeType(t *testing.T) {
	for _, tc := range []struct {
		name          string
		animeType     string
		wantTypeName  string
	}{
		{"ova", "ova", "ova"},
		{"ona", "ona", "ona"},
		{"movie", "movie", "movie"},
		{"special", "special", "special"},
		{"tv", "tv", "episode"},
		{"unrecognized", "unrecognized-value", "episode"},
		{"empty", "", "episode"},
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
