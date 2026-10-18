package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Phase quick-261018-l5r Task 1: additive AniSearch-Link repo function, symmetric to
// linkAdditionalJellyfinSource (anime_source_links.go, 165-07) but for the "anisearch:<id>"
// source prefix. Reuses the env-DSN-gated Postgres harness from anime_source_links_test.go
// (openAnimeSourceLinksPostgres / seedAnimeSourceLinksFixture) instead of building a new one,
// as instructed by the plan's <interfaces> section.

// aniSearchLinkSecondFixtureAnimeID is a second, distinct anime row used to prove ownership
// conflicts (a DIFFERENT anime already owns the target anisearch:<id> source).
const aniSearchLinkSecondFixtureAnimeID int64 = 926_170_502

func seedAniSearchLinkSecondFixture(t *testing.T, pool *pgxpool.Pool) int64 {
	t.Helper()
	ctx := context.Background()
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = $1`, aniSearchLinkSecondFixtureAnimeID)
	}
	cleanup()
	t.Cleanup(cleanup)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id, title, type, status) VALUES ($1, 'Anime Source Links Fixture 2', 'tv', 'done')
	`, aniSearchLinkSecondFixtureAnimeID)
	require.NoError(t, err, "seed second anime")

	return aniSearchLinkSecondFixtureAnimeID
}

func TestAniSearchLink_AdditiveInsertLeavesAnimeSourceUnchanged(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	// Seed a pre-existing jellyfin: primary source, exactly the Anime-12/13 shape this plan fixes
	// (.planning/debug/anisearch-link-missing-on-create.md): linking AniSearch must never touch it.
	_, err := pool.Exec(ctx, `UPDATE anime SET source = 'jellyfin:xyz' WHERE id = $1`, animeID)
	require.NoError(t, err)

	r := &AdminContentRepository{db: pool}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", nil, 0))

	var source string
	var anisearchID *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT source, anisearch_id FROM anime WHERE id = $1`, animeID).Scan(&source, &anisearchID))
	require.Equal(t, "jellyfin:xyz", source, "anime.source must stay untouched by an additive AniSearch link")
	if anisearchID != nil {
		require.Equal(t, "6465", *anisearchID)
	}

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "anisearch:6465",
	).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "expected exactly one anisearch:6465 row in anime_source_links")
}

func TestAniSearchLink_IsIdempotentOnRelinkSameAnime(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	r := &AdminContentRepository{db: pool}
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", nil, 0))
	require.NoError(t, r.LinkAniSearchSource(ctx, animeID, "6465", nil, 0), "re-linking the same anisearch id to the same anime must not error")

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, animeID, "anisearch:6465",
	).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "re-link must not create a second row")
}

func TestAniSearchLink_ReturnsErrConflictWhenAnotherAnimeOwnsTheID(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	firstAnimeID := seedAnimeSourceLinksFixture(t, pool)
	secondAnimeID := seedAniSearchLinkSecondFixture(t, pool)
	ctx := context.Background()

	r := &AdminContentRepository{db: pool}
	require.NoError(t, r.LinkAniSearchSource(ctx, firstAnimeID, "6465", nil, 0))

	err := r.LinkAniSearchSource(ctx, secondAnimeID, "6465", nil, 0)
	require.ErrorIs(t, err, ErrConflict)

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1 AND source = $2`, secondAnimeID, "anisearch:6465",
	).Scan(&rowCount))
	require.Equal(t, 0, rowCount, "a rejected conflicting link must not create a partial row for the second anime")
}

func TestAniSearchLink_RejectsEmptyID(t *testing.T) {
	pool := openAnimeSourceLinksPostgres(t)
	animeID := seedAnimeSourceLinksFixture(t, pool)
	ctx := context.Background()

	r := &AdminContentRepository{db: pool}
	err := r.LinkAniSearchSource(ctx, animeID, "   ", nil, 0)
	require.Error(t, err, "an empty/whitespace-only anisearch id must be rejected before any insert attempt")

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM anime_source_links WHERE anime_id = $1`, animeID).Scan(&rowCount))
	require.Equal(t, 0, rowCount, "no insert attempt must occur for an empty id")
}
