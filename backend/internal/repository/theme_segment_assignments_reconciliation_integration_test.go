package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange ist die EIGENE,
// explizit benannte Regressionspruefung (156-02-PLAN.md must_haves): sie beweist end-to-end
// gegen eine echte, isolierte Postgres-Instanz, dass ein unvollstaendiger Bereich, der auf ein
// Segment mit BEREITS BESTEHENDEN Zuweisungen angewendet wird, NULL Zeilen loescht -- nicht nur,
// dass die Guard-Bedingung ohne DB-Zugriff greift (das beweist bereits
// TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess in
// theme_segment_assignments_integration_test.go), sondern dass eine reale Zuweisungsmenge nach
// dem Aufruf UNVERAENDERT bleibt. Dies ist die dedizierte Absicherung des gefaehrlichsten
// Fehlerfalls der Phase 156 (P156-03/T-156-03), getrennt von jeder anderen Verhaltenspruefung.
func TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(41)
		fansubGroupID = int64(41)
		themeTypeID   = int64(41)
		themeID       = int64(41)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	releaseVersionIDs := make(map[int]int64, 3)
	for episodeNum := 1; episodeNum <= 3; episodeNum++ {
		episodeID := int64(4100 + episodeNum)
		releaseID := int64(4200 + episodeNum)
		releaseVersionID := int64(4300 + episodeNum)
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
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 3)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Len(t, result.Added, 3, "Vorbereitung: alle drei Folgen muessen zunaechst zugewiesen sein")

	// Plan 156-16: die Vorbereitung oben laeuft jetzt (via ensureThemeSegmentOriginTx) ebenfalls
	// durch die Origin-Synchronisation und hat bereits eine Origin gesetzt (niedrigste Episode) --
	// diese muss byte-identisch bleiben, auch wenn jeder nachfolgende Aufruf ein unvollstaendiger
	// Bereich ist, der den DB-Zugriff laut Guard NIE erreicht.
	originBeforeGuardCases := readThemeSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, originBeforeGuardCases, "Vorbereitung: die Origin muss durch die vollstaendige Bereichszuweisung automatisch gesetzt worden sein")

	incompleteRangeCases := []struct {
		name          string
		segmentID     int64
		animeID       int64
		fansubGroupID int64
		startEpisode  int
		endEpisode    int
	}{
		{"segmentID<=0", 0, animeID, fansubGroupID, 1, 3},
		{"animeID<=0", segmentID, 0, fansubGroupID, 1, 3},
		{"fansubGroupID<=0", segmentID, animeID, 0, 1, 3},
		{"startEpisode<=0", segmentID, animeID, fansubGroupID, 0, 3},
		{"endEpisode<=0", segmentID, animeID, fansubGroupID, 1, 0},
	}
	for _, tc := range incompleteRangeCases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := repo.AssignThemeSegmentToEpisodeRange(ctx, tc.segmentID, tc.animeID, tc.fansubGroupID, "v1", tc.startEpisode, tc.endEpisode)
			require.NoError(t, err)
			require.Nil(t, got)

			ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
			require.NoError(t, err)
			require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids,
				"ein unvollstaendiger Bereich (%s) darf NULL Zuweisungen loeschen", tc.name)

			// Plan 156-16: der Guard laesst per Konstruktion auch die Origin unangetastet -- eine
			// zusaetzliche Assertion, keine Umstrukturierung des Guards selbst.
			originAfter := readThemeSegmentOrigin(t, pool, ctx, segmentID)
			require.Equal(t, originBeforeGuardCases, originAfter,
				"ein unvollstaendiger Bereich (%s) darf die Origin nicht veraendern", tc.name)
		})
	}
}

// readThemeSegmentOrigin liest origin_release_version_id direkt aus der Datenbank -- ein
// wiederverwendeter Test-Helfer fuer die in Plan 156-16 hinzugefuegten Origin-Assertions in
// dieser Datei.
func readThemeSegmentOrigin(t *testing.T, pool *pgxpool.Pool, ctx context.Context, segmentID int64) *int64 {
	t.Helper()
	var origin *int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin))
	return origin
}

// TestAssignThemeSegmentToEpisodeRange proves the reconciling, idempotent, version-scoped
// Soll-Ist-Synchronisation (Phase 156, Workstream A -- supersedes the additive Quick-Task
// 260819-lm5 semantics) against a real, isolated Postgres schema: start_episode/end_episode
// SIND der Mechanismus fuer automatische Zuweisung beim Speichern (Create/Update), kein
// separater Button. Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
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
		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, result.Added)
		require.Empty(t, result.Removed)
		require.Empty(t, result.ProtectedByOverride)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids)
		require.NotContains(t, ids, otherVersionReleaseVersionID)
	})

	t.Run("idempotent: repeated call with the same range assigns and removes nothing", func(t *testing.T) {
		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Empty(t, result.Added)
		require.Empty(t, result.Removed)
		require.Empty(t, result.ProtectedByOverride)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids)
	})

	// Test 2 (Soll-Ist-Synchronisation, 156-02-PLAN.md): eine Bereichsverkuerzung ENTFERNT die
	// ausserhalb des neuen Bereichs liegenden, ungeschuetzten Zuweisungen (Folge 1 und 3) und
	// meldet sie in result.Removed. Die weiterhin im Bereich liegende Zuweisung (Folge 2) bleibt
	// bestehen und erscheint weder in Added (war schon zugewiesen) noch in Removed.
	t.Run("shrink: a narrower range removes the out-of-range, unprotected assignments", func(t *testing.T) {
		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 2, 2)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Empty(t, result.Added, "episode 2 war schon zugewiesen -- nichts Neues")
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[3]}, result.Removed,
			"Folge 1 und 3 muessen als entfernt gemeldet werden, sie liegen ausserhalb des neuen Bereichs und haben keinen Override")
		require.Empty(t, result.ProtectedByOverride)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[2]}, ids,
			"nur Folge 2 darf nach der Bereichsverkuerzung noch zugewiesen sein")
	})

	// Test 3: eine anschliessende Bereichserweiterung ERGAENZT die neu abgedeckten Folgen (1 und
	// 3 werden wieder zugewiesen) und entfernt nichts.
	t.Run("grow: a wider range adds the newly-covered episodes and removes nothing", func(t *testing.T) {
		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[3]}, result.Added)
		require.Empty(t, result.Removed)
		require.Empty(t, result.ProtectedByOverride)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids)
	})

	// Test 4 (P156-03/T-156-04): ein aktiver theme_segment_episode_overrides-Eintrag auf Folge 1
	// schuetzt diese Zuweisung vor der automatischen Entfernung, obwohl der neue Bereich (2-3) sie
	// nicht mehr abdeckt -- sie wird stattdessen sichtbar als ProtectedByOverride gemeldet, nicht
	// still geloescht (die FK ON DELETE CASCADE wuerde sonst den Override mitreissen).
	t.Run("override protection: an overridden out-of-range assignment survives the shrink", func(t *testing.T) {
		_, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionIDs[1],
			StartTime:        "00:00:05",
			EndTime:          "00:01:00",
		})
		require.NoError(t, err)

		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 2, 3)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Empty(t, result.Added)
		require.Empty(t, result.Removed, "die ueberschriebene Zuweisung darf NICHT in Removed erscheinen")
		require.ElementsMatch(t, []int64{releaseVersionIDs[1]}, result.ProtectedByOverride)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2], releaseVersionIDs[3]}, ids,
			"die ueberschriebene Folge 1 muss trotz Bereichsverkuerzung zugewiesen bleiben")

		override, err := repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionIDs[1])
		require.NoError(t, err, "der Override-Datensatz muss nach der Synchronisation noch existieren")
		require.Equal(t, "00:00:05", override.StartTime)
	})

	// Test 5 (P156-03/T-156-05): eine Zuweisung ausserhalb der Anime/Gruppe/Version-Domaene dieses
	// Segments (hier: ueber einen manuellen AssignThemeSegmentToReleaseVersion-Aufruf auf eine
	// Release-Version eines VOELLIG ANDEREN Anime angelegt) wird von der Loesch-Seite NIE
	// angefasst -- unabhaengig vom Ziel-Bereich, weil sie nie Teil von domainReleaseVersionIDs ist.
	t.Run("cross-domain safety: an assignment outside this segment's anime/group/version domain is never touched", func(t *testing.T) {
		const (
			foreignAnimeID        = int64(2)
			foreignEpisodeID      = int64(9001)
			foreignReleaseID      = int64(9002)
			foreignReleaseVersion = int64(9003)
			foreignFansubGroupID  = int64(2)
			foreignEpisodeSortIdx = 1
			foreignEpisodeNumber  = "1"
		)
		_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, foreignAnimeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, foreignFansubGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			foreignEpisodeID, foreignAnimeID, foreignEpisodeSortIdx, foreignEpisodeNumber)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, foreignReleaseID, foreignEpisodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, foreignReleaseVersion, foreignReleaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, foreignReleaseVersion, foreignFansubGroupID)
		require.NoError(t, err)

		// Deliberately seed historical invalid data: new direct writes reject a
		// different anime, but reconciliation must still never erase foreign rows.
		_, err = pool.Exec(ctx, `INSERT INTO theme_segment_assignments(theme_segment_id,release_version_id) VALUES($1,$2)`, segmentID, foreignReleaseVersion)
		require.NoError(t, err)

		idsBefore, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.Contains(t, idsBefore, foreignReleaseVersion, "Vorbereitung: die fremde Zuweisung muss vor dem Aufruf bestehen")

		// Bereich 1-1: entfernt (unter den ungeschuetzten, in-domain Kandidaten) nur Folge 2 und 3;
		// Folge 1 bleibt im Ziel-Bereich, die fremde Zuweisung liegt ausserhalb JEDER Domaene dieses
		// Segments und darf NIE ein Loeschkandidat werden.
		result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 1)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.ElementsMatch(t, []int64{releaseVersionIDs[2], releaseVersionIDs[3]}, result.Removed)
		require.NotContains(t, result.Removed, foreignReleaseVersion)

		idsAfter, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.Contains(t, idsAfter, foreignReleaseVersion, "die fremde Zuweisung muss nach dem Aufruf UNVERAENDERT bestehen bleiben")
		require.ElementsMatch(t, []int64{releaseVersionIDs[1], foreignReleaseVersion}, idsAfter)
	})
}

// TestAssignThemeSegmentToEpisodeRangeOriginRecomputesOnShrink proves the "range shrink" behavior
// from 156-16-PLAN.md: a segment assigned to releases at episodes {4,5}, whose origin is the
// release at the lower episode of that set, gets its origin recomputed to the remaining
// assignment once a range shrink removes the release the origin pointed to.
func TestAssignThemeSegmentToEpisodeRangeOriginRecomputesOnShrink(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(51)
		fansubGroupID = int64(51)
		themeTypeID   = int64(51)
		themeID       = int64(51)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	releaseVersionIDs := make(map[int]int64, 2)
	for _, episodeNum := range []int{4, 5} {
		episodeID := int64(5100 + episodeNum)
		releaseID := int64(5200 + episodeNum)
		releaseVersionID := int64(5300 + episodeNum)
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
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 4, 5)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 4, 5)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.ElementsMatch(t, []int64{releaseVersionIDs[4], releaseVersionIDs[5]}, result.Added)
	require.Nil(t, result.OriginBefore)
	require.NotNil(t, result.OriginAfter)
	require.Equal(t, releaseVersionIDs[4], *result.OriginAfter, "die niedrigste Episode im Bereich muss automatisch zur Origin werden")
	require.Equal(t, releaseVersionIDs[4], *readThemeSegmentOrigin(t, pool, ctx, segmentID))

	shrinkResult, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 5, 5)
	require.NoError(t, err)
	require.NotNil(t, shrinkResult)
	require.ElementsMatch(t, []int64{releaseVersionIDs[4]}, shrinkResult.Removed)
	require.NotNil(t, shrinkResult.OriginBefore)
	require.Equal(t, releaseVersionIDs[4], *shrinkResult.OriginBefore)
	require.NotNil(t, shrinkResult.OriginAfter)
	require.Equal(t, releaseVersionIDs[5], *shrinkResult.OriginAfter, "die Origin muss auf die verbleibende Zuweisung neu berechnet werden")
	require.Equal(t, releaseVersionIDs[5], *readThemeSegmentOrigin(t, pool, ctx, segmentID))
}

// TestAssignThemeSegmentToEpisodeRangeOriginClearsToNullWhenRangeEmpties proves the
// "range-to-empty" behavior from 156-16-PLAN.md: a range change that removes every assignment
// clears the origin to NULL and removes all theme_segment_contributors rows for the segment.
func TestAssignThemeSegmentToEpisodeRangeOriginClearsToNullWhenRangeEmpties(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(52)
		fansubGroupID = int64(52)
		themeTypeID   = int64(52)
		themeID       = int64(52)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	const episodeNum = 1
	episodeID := int64(6100)
	releaseID := int64(6200)
	releaseVersionID := int64(6300)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
		episodeID, animeID, episodeNum, fmt.Sprint(episodeNum))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
	require.NoError(t, err)

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 1)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 1)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, result.OriginAfter)
	require.Equal(t, releaseVersionID, *result.OriginAfter)

	// A member selection carried over from the (still valid, non-empty) origin -- must be cleared
	// once the origin itself becomes NULL, not just left dangling.
	const memberID = int64(52901)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentID, memberID)
	require.NoError(t, err)

	// A range that matches no actual episode empties the assignment set entirely.
	emptyResult, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 99, 99)
	require.NoError(t, err)
	require.NotNil(t, emptyResult)
	require.ElementsMatch(t, []int64{releaseVersionID}, emptyResult.Removed)
	require.NotNil(t, emptyResult.OriginBefore)
	require.Equal(t, releaseVersionID, *emptyResult.OriginBefore)
	require.Nil(t, emptyResult.OriginAfter)
	require.Equal(t, 1, emptyResult.RemovedContributorCount)

	require.Nil(t, readThemeSegmentOrigin(t, pool, ctx, segmentID))
	repo2 := NewAdminContentRepository(pool)
	ids, err := repo2.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
	require.NoError(t, err)
	require.Empty(t, ids)
}

// TestAssignThemeSegmentToEpisodeRangeNeverPreselectsWhenOriginStaysNil proves the last GAP-07
// behavior case (156-18-PLAN.md Task 2) through the FULL assignThemeSegmentToEpisodeRangeTx call
// path (not just Task 1's unit-level wrapper test): a segment whose origin recompute yields nil
// (a range matching zero actual release versions) never gets its contributors_initialized_at
// marker set and never gets a theme_segment_contributors row inserted.
func TestAssignThemeSegmentToEpisodeRangeNeverPreselectsWhenOriginStaysNil(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(55)
		fansubGroupID = int64(55)
		themeTypeID   = int64(55)
		themeID       = int64(55)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
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

	// A complete, valid range that matches ZERO actual release versions (no episode/release
	// exists for this anime/group/version at all) -- the origin recompute stays nil.
	result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 1)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Empty(t, result.Added)
	require.Nil(t, result.OriginAfter)
	require.Zero(t, result.PreselectedContributorCount)

	require.Nil(t, readThemeSegmentOrigin(t, pool, ctx, segmentID))
	var marker *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT contributors_initialized_at::text FROM theme_segments WHERE id = $1`, segmentID).Scan(&marker))
	require.Nil(t, marker, "ohne gueltige Origin darf der Vorauswahl-Merker nie gesetzt werden")

	ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
	require.NoError(t, err)
	require.Empty(t, ids)
}

// TestAutoAssignThemeSegmentsForNewReleaseVersionPreselectsContributorsOnce proves the GAP-07
// behavior case for autoAssignThemeSegmentsForNewReleaseVersion (156-18-PLAN.md Task 2): a
// never-initialized segment that gets its FIRST assignment through the release-version
// auto-assignment path is preselected exactly once, with only its segment-relevant contributor
// inserted.
func TestAutoAssignThemeSegmentsForNewReleaseVersionPreselectsContributorsOnce(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID     = int64(1)
		themeTypeID = int64(1)
		themeID     = int64(1)
		groupID     = int64(1)
	)
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, themeTypeID, themeID)
	seedAutoAssignFansubGroup(t, pool, ctx, groupID)

	segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, groupID, 1, 3)
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, 102)

	const translatorID = int64(55901)
	const encoderOnlyID = int64(55902)
	_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1), ($2)`, translatorID, encoderOnlyID)
	require.NoError(t, err)
	const publicVisibilityID = int64(1)
	for _, seed := range []struct {
		memberID int64
		roleCode string
	}{{translatorID, "translator"}, {encoderOnlyID, "encoder"}} {
		var contributionID int64
		require.NoError(t, pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, groupID, animeID, seed.memberID, releaseVersionID, publicVisibilityID).Scan(&contributionID))
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, seed.roleCode)
		require.NoError(t, err)
	}

	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupID)

	origin := readAutoAssignSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, origin)
	require.Equal(t, releaseVersionID, *origin)

	repo := NewAdminContentRepository(pool)
	ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
	require.NoError(t, err)
	require.Equal(t, []int64{translatorID}, ids, "nur der Uebersetzer wird vorausgewaehlt, der Encoder-only nie")
}

// TestAssignThemeSegmentToEpisodeRangeOriginNeverOverwritesValidOnExpand proves Auftragspunkt 8
// at the integration-call-site level (156-16-PLAN.md): a valid origin already pointing at the
// lowest-episode release stays UNCHANGED even when the range expands to include an ADDITIONAL
// release with a LOWER episode number.
func TestAssignThemeSegmentToEpisodeRangeOriginNeverOverwritesValidOnExpand(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(53)
		fansubGroupID = int64(53)
		themeTypeID   = int64(53)
		themeID       = int64(53)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	releaseVersionIDs := make(map[int]int64, 3)
	for episodeNum := 1; episodeNum <= 3; episodeNum++ {
		episodeID := int64(7100 + episodeNum)
		releaseID := int64(7200 + episodeNum)
		releaseVersionID := int64(7300 + episodeNum)
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
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 3, 3)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	// Only episode 3 is assigned initially -- origin is automatically set to it (the only
	// assignment).
	result, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 3, 3)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.NotNil(t, result.OriginAfter)
	require.Equal(t, releaseVersionIDs[3], *result.OriginAfter)
	require.Equal(t, releaseVersionIDs[3], *readThemeSegmentOrigin(t, pool, ctx, segmentID))

	// Expand the range to include episodes 1 and 2 -- both LOWER episode numbers than the current
	// origin. Auftragspunkt 8: the already-valid origin must stay exactly as it is.
	expandResult, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, fansubGroupID, "v1", 1, 3)
	require.NoError(t, err)
	require.NotNil(t, expandResult)
	require.ElementsMatch(t, []int64{releaseVersionIDs[1], releaseVersionIDs[2]}, expandResult.Added)
	require.False(t, expandResult.OriginBefore == nil, "die Origin war bereits gueltig gesetzt")
	require.NotNil(t, expandResult.OriginBefore)
	require.Equal(t, releaseVersionIDs[3], *expandResult.OriginBefore)
	require.NotNil(t, expandResult.OriginAfter)
	require.Equal(t, releaseVersionIDs[3], *expandResult.OriginAfter, "Auftragspunkt 8: eine gueltige Origin darf nicht durch eine niedrigere Episode ueberschrieben werden")
	require.Equal(t, releaseVersionIDs[3], *readThemeSegmentOrigin(t, pool, ctx, segmentID))
}
