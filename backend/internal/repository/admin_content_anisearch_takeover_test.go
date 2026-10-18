package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// seedAniSearchTakeoverReferenceData idempotently inserts the exact reference-data rows the real
// migrations seed (0020_add_metadata_reference_tables.up.sql, 0030_add_anime_types_table.up.sql)
// for languages/title_types/anime_types. The "volles Schema" harness clones team4s_v2 via
// `pg_dump --schema-only`, which -- by definition -- carries over table DEFINITIONS but NOT their
// seeded rows, so lookup tables land empty in every throwaway database. Without this helper,
// anything that joins through anime_titles (title_de/title_en) or resolves anime_type_id (type)
// fails with "no rows in result set" against an otherwise-correct schema.
func seedAniSearchTakeoverReferenceData(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO title_types (name) VALUES ('main'), ('official'), ('short'), ('synonym'), ('romaji'), ('japanese')
		ON CONFLICT (name) DO NOTHING
	`)
	require.NoError(t, err, "seed title_types")

	_, err = pool.Exec(ctx, `
		INSERT INTO languages (code, name) VALUES
			('ja', 'Japanese'), ('en', 'English'), ('de', 'German')
		ON CONFLICT (code) DO NOTHING
	`)
	require.NoError(t, err, "seed languages")

	_, err = pool.Exec(ctx, `
		INSERT INTO anime_types (name) VALUES
			('tv'), ('film'), ('ova'), ('ona'), ('special'), ('bonus'), ('web')
		ON CONFLICT (name) DO NOTHING
	`)
	require.NoError(t, err, "seed anime_types")
}

// quick-261018-l5r Task 2: live-Postgres tests for the transactional field-takeover write path,
// reusing the env-DSN-gated "volles Schema" harness from anime_source_links_test.go
// (openAnimeSourceLinksPostgres/seedAnimeSourceLinksFixture) -- per the plan's instruction to
// extend that same pattern rather than build a new one. The fill/replace/keep DECISION itself is
// covered by services.ResolveFieldTakeover's own pure unit tests; these tests prove that
// LinkAniSearchSource actually WRITES whatever takeoverPatch it is handed, in the SAME
// transaction as the additive link write, through the real updateAnimeV2/syncAuthoritativeAnimeMetadata
// path -- genre/tags land in the anime_genres/anime_tags junction tables, never a flat column.

func optionalStringPtr(value string) *string {
	return &value
}

func optionalInt16Ptr(value int16) *int16 {
	return &value
}

// TestAniSearchLink_TakeoverFillsEmptyFieldsIncludingGenreAndTagsViaJunctionTables covers the
// "current value is empty -> fill" branch for every takeover field type (scalar strings, int16s,
// and the two list fields) in one additive link call.
func TestAniSearchLink_TakeoverFillsEmptyFieldsIncludingGenreAndTagsViaJunctionTables(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	seedAniSearchTakeoverReferenceData(t, pool)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	patch := &models.AdminAnimePatchInput{
		TitleDE:     models.OptionalString{Set: true, Value: optionalStringPtr("Deutscher Titel")},
		TitleEN:     models.OptionalString{Set: true, Value: optionalStringPtr("English Title")},
		Year:        models.OptionalInt16{Set: true, Value: optionalInt16Ptr(2021)},
		MaxEpisodes: models.OptionalInt16{Set: true, Value: optionalInt16Ptr(12)},
		Genre:       models.OptionalString{Set: true, Value: optionalStringPtr("Action, Fantasy")},
		Tags:        models.OptionalStringSlice{Set: true, Value: []string{"Isekai", "Harem"}},
		Description: models.OptionalString{Set: true, Value: optionalStringPtr("Eine Beschreibung von AniSearch.")},
		Type:        models.OptionalString{Set: true, Value: optionalStringPtr("film")},
	}

	r := &AdminContentRepository{db: pool}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", patch, 0))

	// Scalar/list fields land through updateAnimeV2 + syncAuthoritativeAnimeMetadata.
	var year, maxEpisodes *int16
	var description *string
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT year, max_episodes, description FROM anime WHERE id = $1`, animeID,
	).Scan(&year, &maxEpisodes, &description))
	require.NotNil(t, year)
	require.Equal(t, int16(2021), *year)
	require.NotNil(t, maxEpisodes)
	require.Equal(t, int16(12), *maxEpisodes)
	require.NotNil(t, description)
	require.Equal(t, "Eine Beschreibung von AniSearch.", *description)

	// title_de/title_en are authoritative via anime_titles, never the flat columns.
	var titleDE, titleEN string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT at2.title FROM anime_titles at2
		JOIN languages l ON l.id = at2.language_id
		JOIN title_types tt ON tt.id = at2.title_type_id
		WHERE at2.anime_id = $1 AND l.code = 'de' AND tt.name = 'main'
	`, animeID).Scan(&titleDE))
	require.Equal(t, "Deutscher Titel", titleDE)
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT at2.title FROM anime_titles at2
		JOIN languages l ON l.id = at2.language_id
		JOIN title_types tt ON tt.id = at2.title_type_id
		WHERE at2.anime_id = $1 AND l.code = 'en' AND tt.name = 'official'
	`, animeID).Scan(&titleEN))
	require.Equal(t, "English Title", titleEN)

	// genre/tags MUST land in the junction tables, not a flat anime.genre/anime.tags column.
	var genreCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
		WHERE ag.anime_id = $1 AND g.name IN ('Action', 'Fantasy')
	`, animeID).Scan(&genreCount))
	require.Equal(t, 2, genreCount, "both genres must be linked via anime_genres")

	var tagCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_tags atg JOIN tags t ON t.id = atg.tag_id
		WHERE atg.anime_id = $1 AND t.name IN ('Isekai', 'Harem')
	`, animeID).Scan(&tagCount))
	require.Equal(t, 2, tagCount, "both tags must be linked via anime_tags")

	// type: anime_type_id must now resolve to 'film'.
	var typeName string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT at3.name FROM anime JOIN anime_types at3 ON at3.id = anime.anime_type_id
		WHERE anime.id = $1
	`, animeID).Scan(&typeName))
	require.Equal(t, "film", typeName)

	// The additive link write itself must still have happened exactly once (takeover is a
	// side-effect inside the SAME transaction, not a replacement for it).
	var linkRowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "anisearch:6465",
	).Scan(&linkRowCount))
	require.Equal(t, 1, linkRowCount)
}

// TestAniSearchLink_TakeoverReplacesPreExistingValueWhenPatchSaysReplace covers the "current value
// came from Jellyfin -> replace" branch: the handler has already decided to replace, so the repo
// must overwrite the pre-existing anime_titles row instead of leaving it untouched.
func TestAniSearchLink_TakeoverReplacesPreExistingValueWhenPatchSaysReplace(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	seedAniSearchTakeoverReferenceData(t, pool)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	// Seed a pre-existing title_de (simulating a value that previously came from Jellyfin).
	_, err := pool.Exec(ctx, `
		INSERT INTO anime_titles (anime_id, language_id, title, title_type_id)
		SELECT $1, l.id, 'Alter Jellyfin-Titel', tt.id
		FROM languages l, title_types tt
		WHERE l.code = 'de' AND tt.name = 'main'
	`, animeID)
	require.NoError(t, err)

	r := &AdminContentRepository{db: pool}
	patch := &models.AdminAnimePatchInput{
		TitleDE: models.OptionalString{Set: true, Value: optionalStringPtr("Neuer AniSearch-Titel")},
	}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", patch, 0))

	var titleDE string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT at2.title FROM anime_titles at2
		JOIN languages l ON l.id = at2.language_id
		JOIN title_types tt ON tt.id = at2.title_type_id
		WHERE at2.anime_id = $1 AND l.code = 'de' AND tt.name = 'main'
	`, animeID).Scan(&titleDE))
	require.Equal(t, "Neuer AniSearch-Titel", titleDE, "the pre-existing value must be overwritten, not duplicated")

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_titles at2
		JOIN languages l ON l.id = at2.language_id
		JOIN title_types tt ON tt.id = at2.title_type_id
		WHERE at2.anime_id = $1 AND l.code = 'de' AND tt.name = 'main'
	`, animeID).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "the unique (anime_id, language_id, title_type_id) upsert must not create a duplicate row")
}

// TestAniSearchLink_NilTakeoverPatchLeavesExistingFieldsUntouched covers the "no jellyfin link /
// lookup failed -> skip the whole comparison branch" degrade path at the write layer: a nil patch
// (the handler's signal that takeover could not be decided, or every field resolved to "keep")
// must leave every existing value exactly as it was, while the additive link write still succeeds.
func TestAniSearchLink_NilTakeoverPatchLeavesExistingFieldsUntouched(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `UPDATE anime SET year = 1999, description = 'Manuell gepflegt' WHERE id = $1`, animeID)
	require.NoError(t, err)

	r := &AdminContentRepository{db: pool}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", nil, 0))

	var year *int16
	var description *string
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT year, description FROM anime WHERE id = $1`, animeID,
	).Scan(&year, &description))
	require.NotNil(t, year)
	require.Equal(t, int16(1999), *year)
	require.NotNil(t, description)
	require.Equal(t, "Manuell gepflegt", *description)

	var linkRowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "anisearch:6465",
	).Scan(&linkRowCount))
	require.Equal(t, 1, linkRowCount, "the link write must still succeed even with no takeover patch")
}

// TestAniSearchLink_PartialTakeoverPatchOnlyTouchesSetFields proves the per-field granularity:
// only the fields the handler explicitly decided to fill/replace get written, everything else
// (not Set on the patch) stays exactly as it was -- the "only where safe" half of the feature.
func TestAniSearchLink_PartialTakeoverPatchOnlyTouchesSetFields(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	// updateAnimeV2 always re-loads the anime via loadAdminAnimeItemV2 at the end, whose
	// display_title falls back to anime.slug when no anime_titles row exists -- give the fixture a
	// slug so that unrelated display-title derivation does not get in the way of this test's own
	// "only Set fields are touched" assertion.
	_, err := pool.Exec(ctx, `UPDATE anime SET description = 'Bleibt unangetastet', slug = 'partial-takeover-fixture' WHERE id = $1`, animeID)
	require.NoError(t, err)

	r := &AdminContentRepository{db: pool}
	patch := &models.AdminAnimePatchInput{
		Year: models.OptionalInt16{Set: true, Value: optionalInt16Ptr(2024)},
	}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", patch, 0))

	var year *int16
	var description *string
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT year, description FROM anime WHERE id = $1`, animeID,
	).Scan(&year, &description))
	require.NotNil(t, year)
	require.Equal(t, int16(2024), *year)
	require.NotNil(t, description)
	require.Equal(t, "Bleibt unangetastet", *description, "description was not Set on the patch and must stay untouched")
}
