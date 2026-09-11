package repository

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestSetThemeSegmentOrigin beweist gegen eine echte, isolierte Postgres-Instanz die vier
// planvorgegebenen Verhaltensfaelle von SetThemeSegmentOrigin (Phase 156, Workstream C, Task 1):
//  1. Setzen der Origin auf eine dem Segment zugewiesene release_version_id gelingt, und ein
//     nachfolgendes Lesen zeigt den neuen Wert.
//  2. Setzen der Origin auf eine NICHT zugewiesene release_version_id wird mit ErrConflict
//     abgelehnt, die Spalte bleibt unveraendert (kein stilles Uebernehmen, kein Klemmen).
//  3. Setzen der Origin auf eine nicht existierende segmentID liefert ErrNotFound.
//  4. ListAnimeSegments und GetAnimeSegmentByID liefern beide die aktuelle
//     OriginReleaseVersionID (nil vor dem Setzen, befuellt danach).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
func TestSetThemeSegmentOrigin(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID             = int64(1)
		episodeID           = int64(1)
		fansubGroupID       = int64(1)
		fansubReleaseID     = int64(1)
		releaseVersionA     = int64(10)
		releaseVersionB     = int64(20)
		releaseVersionThird = int64(30) // niemals zugewiesen -- fuer den Konflikt-Testfall
		themeTypeID         = int64(1)
		themeID             = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $4, 'v1'), ($3, $4, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 1)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
	require.NoError(t, err)
	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
	require.NoError(t, err)

	t.Run("vor dem Setzen ist die Origin in ListAnimeSegments und GetAnimeSegmentByID nil", func(t *testing.T) {
		segments, err := repo.ListAnimeSegments(ctx, animeID, fansubGroupID, "v1", 0)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.Nil(t, segments[0].OriginReleaseVersionID, "Origin nicht bestimmt vor dem ersten Setzen darf nicht in Fehler oder Fantasiewert enden")

		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
		require.NoError(t, err)
		require.Nil(t, got.OriginReleaseVersionID)
	})

	t.Run("Setzen auf eine zugewiesene release_version_id gelingt und ist danach lesbar", func(t *testing.T) {
		err := repo.SetThemeSegmentOrigin(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		var origin *int64
		err = pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin)
		require.NoError(t, err)
		require.NotNil(t, origin)
		require.Equal(t, releaseVersionA, *origin)

		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
		require.NoError(t, err)
		require.NotNil(t, got.OriginReleaseVersionID)
		require.Equal(t, releaseVersionA, *got.OriginReleaseVersionID)

		segments, err := repo.ListAnimeSegments(ctx, animeID, fansubGroupID, "v1", 0)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].OriginReleaseVersionID)
		require.Equal(t, releaseVersionA, *segments[0].OriginReleaseVersionID)
	})

	t.Run("Setzen auf eine NICHT zugewiesene release_version_id wird abgelehnt, Spalte bleibt unveraendert", func(t *testing.T) {
		err := repo.SetThemeSegmentOrigin(ctx, segmentID, releaseVersionThird)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))

		// unveraendert: der vorherige Test hat die Origin bereits auf releaseVersionA gesetzt.
		var origin *int64
		queryErr := pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin)
		require.NoError(t, queryErr)
		require.NotNil(t, origin)
		require.Equal(t, releaseVersionA, *origin, "ein abgelehntes Ziel darf die Spalte nicht veraendern")
	})

	t.Run("Setzen auf eine nicht existierende segmentID liefert ErrNotFound", func(t *testing.T) {
		const missingSegmentID = int64(999999)
		err := repo.SetThemeSegmentOrigin(ctx, missingSegmentID, releaseVersionA)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})

	t.Run("segmentID/releaseVersionID<=0 liefert ErrNotFound ohne DB-Zugriff", func(t *testing.T) {
		require.True(t, errors.Is(repo.SetThemeSegmentOrigin(ctx, 0, releaseVersionA), ErrNotFound))
		require.True(t, errors.Is(repo.SetThemeSegmentOrigin(ctx, segmentID, 0), ErrNotFound))
	})
}
