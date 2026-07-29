package repository

// TestReleaseDetailPublicSegments beweist gegen eine echte, isolierte Postgres-
// Instanz die serverseitige Entdopplung (D-02, Plan 117-08 UI-SPEC Surface 3):
//   - ein geteiltes Kara erscheint nur auf der Span-Start-Folge, nicht erneut auf
//     einer Folgeepisode, der dasselbe theme_segment_id bereits auf der Vorfolge
//     zugewiesen war
//   - ein echter Segment-Wechsel (andere theme_segment_id) wird NICHT unterdrueckt
//   - fehlt die Vorfolge (Anime-Anfang), gilt die aktuelle Folge automatisch als
//     Span-Start
//
// Package repository (nicht repository_test), analog zu
// theme_segment_assignments_integration_test.go -- dieser Test importiert keine
// services und kann daher direkt auf die unexportierte loadReleaseSegments-Methode
// zugreifen statt ueber den vollen GetPublicReleaseDetail-Aggregat-Read (der
// zusaetzliche, hier nicht benoetigte Tabellen wie release_version_media/
// release_version_notes/contributor-Aufloesung voraussetzen wuerde).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestReleaseDetailPublicSegments(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	const (
		animeID          = int64(1)
		episodeOneID     = int64(1)
		episodeTwoID     = int64(2)
		episodeThreeID   = int64(3)
		fansubGroupID    = int64(1)
		fansubReleaseA   = int64(1)
		fansubReleaseB   = int64(2)
		fansubReleaseC   = int64(3)
		releaseVersionA  = int64(10)
		releaseVersionB  = int64(20)
		releaseVersionC  = int64(30)
		themeTypeID      = int64(1)
		themeID          = int64(1)
		themeSegmentXID  = int64(1)
		themeSegmentYID  = int64(2)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO episodes (id, anime_id, sort_index, episode_number)
		VALUES ($1, $4, 1, '1'), ($2, $4, 2, '2'), ($3, $4, 3, '3')
	`, episodeOneID, episodeTwoID, episodeThreeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $4), ($2, $5), ($3, $6)
	`, fansubReleaseA, fansubReleaseB, fansubReleaseC, episodeOneID, episodeTwoID, episodeThreeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $5, 'v1'), ($3, $6, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionC, fansubReleaseA, fansubReleaseB, fansubReleaseC)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionA, releaseVersionB, releaseVersionC, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segments (id, theme_id, start_time, end_time)
		VALUES ($1, $3, '00:01:00', '00:01:30'), ($2, $3, '00:02:00', '00:02:30')
	`, themeSegmentXID, themeSegmentYID, themeID)
	require.NoError(t, err)

	// Segment X (Kara) ist geteilt ueber A und B zugewiesen, Segment Y nur ueber C
	// (echter Wechsel, kein Zeit-Offset auf demselben Kara).
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
		VALUES ($1, $3), ($1, $4), ($2, $5)
	`, themeSegmentXID, themeSegmentYID, releaseVersionA, releaseVersionB, releaseVersionC)
	require.NoError(t, err)

	t.Run("span-start Folge (keine Vorfolge) zeigt das Segment und traegt die Span-Reichweite", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionA, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "Release-Version A ist der Anime-Anfang (keine Vorfolge) -- Segment X muss trotzdem angezeigt werden")
		require.Equal(t, themeSegmentXID, segments[0].ThemeSegmentID)
		require.NotNil(t, segments[0].AppliesThroughEpisode, "Segment X ist auch B zugewiesen -- die Badge-Spanne muss befuellt sein")
		require.Equal(t, "2", *segments[0].AppliesThroughEpisode)
	})

	t.Run("reiner Zeit-Offset ohne echten Wechsel erzeugt keinen neuen Eintrag (D-02)", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionB, "v1", "2", nil)
		require.NoError(t, err)
		require.Empty(t, segments, "Segment X war bereits auf der Vorfolge (A) sichtbar -- B darf keinen erneuten Eintrag zeigen")
	})

	t.Run("echter Segment-Wechsel wird NICHT unterdrueckt", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionC, "v1", "3", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "C ist einem ANDEREN Segment (Y) zugewiesen als die Vorfolge (X) -- das muss trotzdem angezeigt werden")
		require.Equal(t, themeSegmentYID, segments[0].ThemeSegmentID)
		require.Nil(t, segments[0].AppliesThroughEpisode, "Segment Y hat nur eine Zuweisung -- keine Span-Badge")
	})
}
