package repository

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess beweist, dass der
// Guard (segmentID/animeID/fansubGroupID/startEpisode/endEpisode <= 0) VOR jedem DB-Zugriff
// greift -- ein nil-db-Feld auf dem Repository beweist das direkt (r.db.Begin(ctx) wuerde sonst
// mit einer nil-pointer-Panik abstuerzen). Quick-Task 260819-lm5: verhindert versehentliches
// "allen Folgen aller Zeiten"-Zuweisen, wenn Bereichs-/Kontextfelder leer/ungesetzt sind.
func TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess(t *testing.T) {
	repo := &AdminContentRepository{}

	cases := []struct {
		name          string
		segmentID     int64
		animeID       int64
		fansubGroupID int64
		startEpisode  int
		endEpisode    int
	}{
		{"segmentID<=0", 0, 1, 1, 1, 3},
		{"animeID<=0", 1, 0, 1, 1, 3},
		{"fansubGroupID<=0", 1, 1, 0, 1, 3},
		{"startEpisode<=0", 1, 1, 1, 0, 3},
		{"endEpisode<=0", 1, 1, 1, 1, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := repo.AssignThemeSegmentToEpisodeRange(context.Background(), tc.segmentID, tc.animeID, tc.fansubGroupID, "v1", tc.startEpisode, tc.endEpisode)
			require.NoError(t, err)
			require.Nil(t, got)
		})
	}
}

// TestAssignThemeSegmentToEpisodeRange proves the additive, idempotent, version-scoped
// Bereich-Auto-Zuweisung (Quick-Task 260819-lm5) against a real, isolated Postgres schema:
// start_episode/end_episode SIND der Mechanismus fuer automatische Zuweisung beim Speichern
// (Create/Update), kein separater Button. Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
func TestAssignThemeSegmentToEpisodeRange(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// Drei Folgen (1,2,3), jede mit eigenem fansub_release + release_version in derselben
	// Gruppe + Version 'v1' -- der Auto-Zuweisungs-Bereich [1,3] muss alle drei erreichen.
	releaseVersionIDs := make(map[int]int64, 3)
	for episodeNum := 1; episodeNum <= 3; episodeNum++ {
		episodeID := int64(100 + episodeNum)
		releaseID := int64(200 + episodeNum)
		releaseVersionID := int64(300 + episodeNum)
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			episodeID, animeID, episodeNum, fmt.Sprint(episodeNum))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
		require.NoError(t, err)
		releaseVersionIDs[episodeNum] = releaseVersionID
	}

	// Episode 2 hat ZUSAETZLICH eine 'v2'-Release-Version in derselben Gruppe -- diese darf NIE
	// zugewiesen werden (Version-Scoping, gleiches Join-Muster wie GetSegmentReleaseDuration).
	const otherVersionReleaseVersionID = int64(999)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v2')`, otherVersionReleaseVersionID, int64(202))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, otherVersionReleaseVersionID, fansubGroupID)
	require.NoError(t, err)

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 3)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	t.Run("assigns all release versions in range, excludes other-version release", func(t *testing.T) {
		newlyAssigned, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, newlyAssigned)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids)
		require.NotContains(t, ids, otherVersionReleaseVersionID)
	})

	t.Run("idempotent: repeated call with the same range assigns nothing new", func(t *testing.T) {
		newlyAssigned, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
		require.NoError(t, err)
		require.Empty(t, newlyAssigned)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids)
	})

	t.Run("additive: a narrower range on a later call does not remove earlier assignments", func(t *testing.T) {
		newlyAssigned, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 2, 2)
		require.NoError(t, err)
		require.Empty(t, newlyAssigned, "episode 2 war schon zugewiesen -- nichts Neues")

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids,
			"Folge 1 und 3 duerfen NICHT entfernt werden, obwohl der neue Bereich sie nicht mehr abdeckt")
	})
}

// TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode beweist den Korrektheits-Fix aus
// Quick-Task 260819-lm5 Runde 5: ein Zeit-Override auf GENAU EINER zugewiesenen Folge markiert
// NUR den zugehoerigen assigned_episodes-Eintrag mit has_override=true -- nicht alle Folgen des
// Segments. Vor dem Fix nutzte das Frontend das segmentweite has_episode_override fuer JEDEN Chip
// und zeigte faelschlich "verschoben" auf allen zugewiesenen Folgen, sobald irgendeine einzelne
// Folge einen Override hatte (reale Fehlbedienung durch den Nutzer im Live-UAT).
func TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// Zwoelf Folgen (1..12), jede mit eigenem fansub_release + release_version, damit die
	// assigned_episodes-Liste zwoelf unterscheidbare Eintraege hat -- passend zum Live-UAT-
	// Szenario "Bereich 1-12, Override nur auf Folge 2".
	releaseVersionIDs := make(map[int]int64, 12)
	for episodeNum := 1; episodeNum <= 12; episodeNum++ {
		episodeID := int64(100 + episodeNum)
		releaseID := int64(200 + episodeNum)
		releaseVersionID := int64(300 + episodeNum)
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			episodeID, animeID, episodeNum, fmt.Sprint(episodeNum))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
		require.NoError(t, err)
		releaseVersionIDs[episodeNum] = releaseVersionID
	}

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, start_time, end_time)
		VALUES ($1, $2, 'v1', 1, 12, '00:00:10', '00:01:40')
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	newlyAssigned, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 12)
	require.NoError(t, err)
	require.Len(t, newlyAssigned, 12)

	_, err = repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
		ThemeSegmentID:   segmentID,
		ReleaseVersionID: releaseVersionIDs[2],
		StartTime:        "00:00:15",
		EndTime:          "00:01:45",
	})
	require.NoError(t, err)

	segments, err := repo.ListAnimeSegments(ctx, animeID, fansubGroupID, "v1", 0)
	require.NoError(t, err)
	require.Len(t, segments, 1)
	segment := segments[0]

	require.True(t, segment.HasEpisodeOverride, "segmentweites Flag bleibt bestehen -- mindestens eine Folge hat einen Override")
	require.Len(t, segment.AssignedEpisodes, 12)

	for _, entry := range segment.AssignedEpisodes {
		if entry.EpisodeNumber == "2" {
			require.True(t, entry.HasOverride, "genau Folge 2 muss als ueberschrieben markiert sein")
		} else {
			require.False(t, entry.HasOverride, "Folge %s darf NICHT als ueberschrieben markiert sein (Korrektheits-Fix Runde 5)", entry.EpisodeNumber)
		}
	}
}

// TestThemeSegmentAssignmentsAndOverrides runs the Assignment/Override CRUD
// against a real, isolated Postgres schema (Phase 117 Wave 0 -- VALIDATION.md
// explicitly requires this instead of the pre-existing string-pattern tests
// in segment_playback_resolution_test.go). Skips cleanly when
// TEAM4S_PHASE117_TEST_DSN is unset.
func TestThemeSegmentAssignmentsAndOverrides(t *testing.T) {
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

	t.Run("assign shared segment to two release versions", func(t *testing.T) {
		_, err := repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)

		// idempotent: repeated assignment of the same pair is not an error and
		// does not create a duplicate row.
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionA, releaseVersionB}, ids)
	})

	t.Run("override applies only to its own release version, no cross-talk", func(t *testing.T) {
		override, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionA,
			StartTime:        "00:01:30",
			EndTime:          "00:03:00",
		})
		require.NoError(t, err)
		require.Equal(t, "00:01:30", override.StartTime)
		require.Equal(t, "00:03:00", override.EndTime)

		got, err := repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		require.Equal(t, "00:01:30", got.StartTime)
		require.Equal(t, "00:03:00", got.EndTime)

		_, err = repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionB)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})

	t.Run("override for an unassigned release version is rejected, not silently created", func(t *testing.T) {
		_, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionThird,
			StartTime:        "00:00:10",
			EndTime:          "00:00:20",
		})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))
	})

	t.Run("unassign cascades and deletes the override (DB-level proof)", func(t *testing.T) {
		err := repo.UnassignThemeSegmentFromReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		_, err = repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionA)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})
}
