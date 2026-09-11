package repository

// TestReleaseDetailPublicSegments beweist gegen eine echte, isolierte Postgres-
// Instanz, dass die Release-Detailseite seit dem DECISIONS.md-Eintrag vom
// 2026-09-11 ("Release detail page stops suppressing already-visible segments,
// supersedes Phase 117 D-02") KEINE Entdopplung mehr vornimmt:
//   - ein geteiltes Segment (dieselbe theme_segment_id) erscheint auf JEDER
//     Release-Version, der es zugewiesen ist -- auch auf einer Folgeepisode, die
//     nur einen reinen Zeit-Offset gegenueber der Vorfolge darstellt (vormals D-02)
//   - ein echter Segment-Wechsel (andere theme_segment_id) wurde nie unterdrueckt
//     und bleibt es auch nach der Aenderung
//   - fehlt die Vorfolge (Anime-Anfang), traegt das Segment trotzdem seine korrekte
//     Span-Reichweite (AppliesThroughEpisode, reines Anzeige-Feld, unveraendert von
//     applyAppliesThroughEpisode)
//
// Die Entdopplungs-/Erstauftritts-Frage, die D-02 auf dieser Seite frueher
// beantwortet hat, beantwortet seit Plan 156-06 stattdessen die Projektseiten-
// Timeline (attachReleaseTimelineSegments, group_repository_cursor_timeline.go).
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

	t.Run("Folge ohne Vorfolge zeigt das Segment und traegt die Span-Reichweite", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionA, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "Release-Version A ist der Anime-Anfang (keine Vorfolge) -- Segment X muss angezeigt werden")
		require.Equal(t, themeSegmentXID, segments[0].ThemeSegmentID)
		require.NotNil(t, segments[0].AppliesThroughEpisode, "Segment X ist auch B zugewiesen -- die Badge-Spanne muss befuellt sein")
		require.Equal(t, "2", *segments[0].AppliesThroughEpisode)
	})

	t.Run("geteiltes Segment wird auf der Folgeepisode NICHT unterdrueckt (D-02 aufgehoben)", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionB, "v1", "2", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "Segment X war bereits auf der Vorfolge (A) sichtbar -- B muss es trotzdem zeigen, keine Entdopplung mehr auf dieser Seite")
		require.Equal(t, themeSegmentXID, segments[0].ThemeSegmentID)
		require.Nil(t, segments[0].AppliesThroughEpisode, "Segment X ist nur A und B zugewiesen -- auf B selbst (der hoechsten zugewiesenen Folge) gibt es keine weitere Reichweite anzuzeigen")
	})

	t.Run("echter Segment-Wechsel wird NICHT unterdrueckt", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionC, "v1", "3", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "C ist einem ANDEREN Segment (Y) zugewiesen als die Vorfolge (X) -- das muss trotzdem angezeigt werden")
		require.Equal(t, themeSegmentYID, segments[0].ThemeSegmentID)
		require.Nil(t, segments[0].AppliesThroughEpisode, "Segment Y hat nur eine Zuweisung -- keine Span-Badge")
	})
}
