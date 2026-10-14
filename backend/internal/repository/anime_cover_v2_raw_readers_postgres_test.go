package repository

// Proves 182-02-PLAN.md Task 1's D-01 behavior change against a real, disposable
// Phase-182 Postgres fixture (never team4s_v2): a Jellyfin-sourced anime (empty
// cover_image/cover_resolved_url, no V2 poster row, source = 'jellyfin:<id>') now
// resolves a non-nil cover through each of the five migrated raw readers, via the
// Jellyfin-image fallback branch of animeCoverImageSelectSQL. Skips cleanly when
// TEAM4S_PHASE182_TEST_DSN is unset.

import (
	"context"
	"database/sql"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

const phase182JellyfinExpectedCoverURL = "/api/v1/media/image?item_id=12345&kind=primary&provider=jellyfin"

func TestAnimeCoverV2RawReaders_JellyfinAnimeWithoutLocalCoverResolvesCoverEverywhere(t *testing.T) {
	pool := testsupport.OpenPhase182Postgres(t)
	ctx := context.Background()

	t.Run("watchlist.go ListByUser/GetByUserAndAnimeID", func(t *testing.T) {
		const animeID int64 = 1
		const userID int64 = 1
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, title, source) VALUES ($1, 'Jellyfin Anime', 'jellyfin:12345')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO watchlist_entries (id, user_id, anime_id) VALUES (1, $1, $2)`, userID, animeID)
		require.NoError(t, err)

		repo := NewWatchlistRepository(pool)

		items, total, err := repo.ListByUser(ctx, models.WatchlistFilter{UserID: userID, Page: 1, PerPage: 10})
		require.NoError(t, err)
		require.Equal(t, int64(1), total)
		require.Len(t, items, 1)
		require.NotNil(t, items[0].CoverImage, "ListByUser muss fuer ein Jellyfin-Anime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *items[0].CoverImage)

		item, err := repo.GetByUserAndAnimeID(ctx, userID, animeID)
		require.NoError(t, err)
		require.NotNil(t, item.CoverImage, "GetByUserAndAnimeID muss fuer ein Jellyfin-Anime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *item.CoverImage)
	})

	t.Run("fansub_project_resolver_repository.go ResolveProject", func(t *testing.T) {
		const groupID int64 = 2
		const animeID int64 = 2
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title, source) VALUES ($1, 'jellyfin-anime-2', 'Jellyfin Anime 2', 'jellyfin:12345')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug) VALUES ($1, 'group-2')`, groupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (fansub_group_id, anime_id) VALUES ($1, $2)`, groupID, animeID)
		require.NoError(t, err)

		repo := NewFansubProjectResolverRepository(pool)
		resolved, err := repo.ResolveProject(ctx, "group-2", "jellyfin-anime-2")
		require.NoError(t, err)
		require.NotNil(t, resolved.CoverImage, "ResolveProject muss fuer ein Jellyfin-Anime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *resolved.CoverImage)
	})

	t.Run("fansub_repository_public_profile.go listPublicFansubProjects", func(t *testing.T) {
		const groupID int64 = 3
		const animeID int64 = 3
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title, source) VALUES ($1, 'jellyfin-anime-3', 'Jellyfin Anime 3', 'jellyfin:12345')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug) VALUES ($1, 'group-3')`, groupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (fansub_group_id, anime_id) VALUES ($1, $2)`, groupID, animeID)
		require.NoError(t, err)

		repo := NewFansubRepository(pool)
		projects, err := repo.listPublicFansubProjects(ctx, groupID)
		require.NoError(t, err)
		require.Len(t, projects, 1)
		require.NotNil(t, projects[0].CoverImage, "listPublicFansubProjects muss fuer ein Jellyfin-Anime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *projects[0].CoverImage)
	})

	t.Run("anime_relations_admin.go ListAdminAnimeRelations/SearchAdminAnimeRelationTargets", func(t *testing.T) {
		const sourceAnimeID int64 = 4
		const targetAnimeID int64 = 5
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, title, status) VALUES ($1, 'Source Anime', 'ongoing')`, sourceAnimeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime (id, title, source, status) VALUES ($1, 'UniqueRelTarget', 'jellyfin:12345', 'ongoing')`, targetAnimeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO relation_types (id, name) VALUES (1, 'sequel')`)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_relations (source_anime_id, target_anime_id, relation_type_id) VALUES ($1, $2, 1)`, sourceAnimeID, targetAnimeID)
		require.NoError(t, err)

		repo := NewAdminContentRepository(pool)
		relations, err := repo.ListAdminAnimeRelations(ctx, sourceAnimeID)
		require.NoError(t, err)
		require.Len(t, relations, 1)
		require.NotNil(t, relations[0].TargetCoverURL, "ListAdminAnimeRelations muss fuer ein Jellyfin-Zielanime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *relations[0].TargetCoverURL)

		targets, err := repo.SearchAdminAnimeRelationTargets(ctx, sourceAnimeID, "UniqueRelTarget", 10)
		require.NoError(t, err)
		require.Len(t, targets, 1)
		require.NotNil(t, targets[0].CoverURL, "SearchAdminAnimeRelationTargets muss fuer ein Jellyfin-Zielanime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *targets[0].CoverURL)
	})

	t.Run("admin_content_anisearch.go ResolveAdminAnimeRelationTargetsByTitles", func(t *testing.T) {
		const animeID int64 = 6
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title, source, status) VALUES ($1, 'jellyfin-anime-6', 'Jellyfin AniSearch Match', 'jellyfin:12345', 'ongoing')`, animeID)
		require.NoError(t, err)

		repo := NewAdminContentRepository(pool)
		matches, err := repo.ResolveAdminAnimeRelationTargetsByTitles(ctx, []string{"Jellyfin AniSearch Match"})
		require.NoError(t, err)
		require.Len(t, matches, 1)
		require.NotNil(t, matches[0].Target.CoverURL, "ResolveAdminAnimeRelationTargetsByTitles muss fuer ein Jellyfin-Anime ohne cover_image jetzt den Jellyfin-Fallback liefern")
		require.Equal(t, phase182JellyfinExpectedCoverURL, *matches[0].Target.CoverURL)
	})
}

// TestApplyProviderCover_WritesResolvedURLOnlyNeverLegacyCoverImage proves 182-02-PLAN.md
// Task 2's D-03 behavior: ApplyProviderCover sets cover_resolved_url to the provider URL and
// never writes anime.cover_image as a side effect (the legacy mirror-write was removed).
func TestApplyProviderCover_WritesResolvedURLOnlyNeverLegacyCoverImage(t *testing.T) {
	pool := testsupport.OpenPhase182Postgres(t)
	ctx := context.Background()

	const animeID int64 = 7
	const seededLegacyCoverImage = "/media/anime/7/cover/seeded-untouched.jpg"
	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id, title, cover_image) VALUES ($1, 'Provider Cover Anime', $2)
	`, animeID, seededLegacyCoverImage)
	require.NoError(t, err)

	repo := NewAnimeAssetRepository(pool)
	const providerURL = "https://provider.example/cover/7.jpg"
	err = repo.ApplyProviderCover(ctx, animeID, &models.AnimeProviderAssetInput{URL: providerURL, ProviderKey: "anisearch"})
	require.NoError(t, err)

	var coverResolvedURL, coverImage string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT cover_resolved_url, cover_image FROM anime WHERE id = $1
	`, animeID).Scan(&coverResolvedURL, &coverImage))
	require.Equal(t, providerURL, coverResolvedURL, "ApplyProviderCover muss cover_resolved_url auf die Provider-URL setzen")
	require.Equal(t, seededLegacyCoverImage, coverImage, "ApplyProviderCover darf anime.cover_image nicht mehr anfassen (Legacy-Mirror-Write entfernt)")

	err = repo.ApplyProviderCover(ctx, animeID, nil)
	require.NoError(t, err)

	var coverResolvedURLAfterClear sql.NullString
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT cover_resolved_url, cover_image FROM anime WHERE id = $1
	`, animeID).Scan(&coverResolvedURLAfterClear, &coverImage))
	require.False(t, coverResolvedURLAfterClear.Valid, "ApplyProviderCover(nil) muss cover_resolved_url leeren")
	require.Equal(t, seededLegacyCoverImage, coverImage, "ApplyProviderCover(nil) darf anime.cover_image weiterhin nicht anfassen")
}
