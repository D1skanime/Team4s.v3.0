package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// This file closes CR-01 from 156-REVIEW.md (follow-up fix to Plan 156-16): the manual
// single-release-version assign/unassign endpoints (AssignThemeSegmentToReleaseVersion,
// UnassignThemeSegmentFromReleaseVersion) mutate theme_segment_assignments directly but, before
// this fix, never called ensureThemeSegmentOriginTx -- reopening the exact GAP-04/GAP-05 defect
// class through the two live admin routes these repository methods back.

// TestAssignThemeSegmentToReleaseVersionSetsOriginOnFreshSegment proves the GAP-05 shape via the
// manual single-assignment admin action (CR-01, scenario 1): a fresh segment with NULL origin and
// zero assignments receives its first assignment via AssignThemeSegmentToReleaseVersion (not a
// range sync) and must get an origin automatically, exactly like the three call sites Plan 156-16
// already wired.
func TestAssignThemeSegmentToReleaseVersionSetsOriginOnFreshSegment(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID          = int64(8001)
		fansubGroupID    = int64(8001)
		themeTypeID      = int64(8001)
		themeID          = int64(8001)
		episodeID        = int64(8001)
		releaseID        = int64(8001)
		releaseVersionID = int64(8001)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
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

	require.Nil(t, readThemeSegmentOrigin(t, pool, ctx, segmentID), "Vorbereitung: ein frisch angelegtes Segment hat keine Origin")

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionID)
	require.NoError(t, err)

	origin := readThemeSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, origin, "CR-01/GAP-05: die manuelle Einzel-Zuweisung muss die Origin automatisch setzen")
	require.Equal(t, releaseVersionID, *origin)
}

// TestUnassignThemeSegmentFromReleaseVersionClearsOriginAndContributorsOnLastAssignment proves the
// GAP-04 shape via the manual single-unassignment admin action (CR-01, scenario 2): removing a
// segment's ONLY assignment must clear the now-dangling origin to NULL and remove any previously
// selected theme_segment_contributors rows for that segment (156-UAT.md Auftragspunkt 2/14: a
// segment without an origin may never carry a contributor selection).
func TestUnassignThemeSegmentFromReleaseVersionClearsOriginAndContributorsOnLastAssignment(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID          = int64(8002)
		fansubGroupID    = int64(8002)
		themeTypeID      = int64(8002)
		themeID          = int64(8002)
		episodeID        = int64(8002)
		releaseID        = int64(8002)
		releaseVersionID = int64(8002)
		memberID         = int64(8002)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
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

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionID)
	require.NoError(t, err)
	origin := readThemeSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, origin, "Vorbereitung: die Zuweisung muss die Origin gesetzt haben")
	require.Equal(t, releaseVersionID, *origin)

	// A member selection carried over from the (still valid, non-empty) origin -- must be cleared
	// once the origin itself becomes NULL, not just left dangling (same assertion shape as
	// TestAssignThemeSegmentToEpisodeRangeOriginClearsToNullWhenRangeEmpties).
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentID, memberID)
	require.NoError(t, err)

	err = repo.UnassignThemeSegmentFromReleaseVersion(ctx, segmentID, releaseVersionID)
	require.NoError(t, err)

	require.Nil(t, readThemeSegmentOrigin(t, pool, ctx, segmentID),
		"CR-01/GAP-04: das Entfernen der einzigen Zuweisung muss die jetzt haengende Origin auf NULL zuruecksetzen")

	ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
	require.NoError(t, err)
	require.Empty(t, ids, "eine Origin von NULL darf keine Contributor-Auswahl mehr tragen")
}

// TestUnassignThemeSegmentFromReleaseVersionNeverOverwritesValidOriginOnDifferentRelease proves
// Auftragspunkt 8 (never overwrite a valid origin) for the manual unassign path, mirroring
// TestAssignThemeSegmentToEpisodeRangeOriginNeverOverwritesValidOnExpand's discipline at the
// range-sync call site: a segment has a valid origin at RV_A (its lowest-episode assignment) and
// an additional assignment at RV_B. Unassigning RV_B (NOT the origin's release) must leave RV_A's
// origin completely untouched.
func TestUnassignThemeSegmentFromReleaseVersionNeverOverwritesValidOriginOnDifferentRelease(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(8003)
		fansubGroupID = int64(8003)
		themeTypeID   = int64(8003)
		themeID       = int64(8003)
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
	for _, episodeNum := range []int{1, 2} {
		episodeID := int64(80030000 + episodeNum)
		releaseID := int64(80031000 + episodeNum)
		releaseVersionID := int64(80032000 + episodeNum)
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
		VALUES ($1, $2, 'v1', 1, 2)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	// Episode 1 is assigned FIRST -- it becomes the origin (lowest/only episode at that point).
	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionIDs[1])
	require.NoError(t, err)
	origin := readThemeSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, origin)
	require.Equal(t, releaseVersionIDs[1], *origin, "Vorbereitung: Episode 1 muss die Origin sein")

	// A second, later assignment (episode 2) must NOT displace the already-valid origin
	// (Auftragspunkt 8, proven again here at the manual-assign call site).
	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionIDs[2])
	require.NoError(t, err)
	require.Equal(t, releaseVersionIDs[1], *readThemeSegmentOrigin(t, pool, ctx, segmentID),
		"eine zusaetzliche Zuweisung darf eine bereits gueltige Origin nicht ueberschreiben")

	// Unassign the NON-origin release version (episode 2) -- the valid origin at episode 1 must
	// stay exactly as it is, byte-identical, not recomputed or touched in any way.
	err = repo.UnassignThemeSegmentFromReleaseVersion(ctx, segmentID, releaseVersionIDs[2])
	require.NoError(t, err)

	stillOrigin := readThemeSegmentOrigin(t, pool, ctx, segmentID)
	require.NotNil(t, stillOrigin)
	require.Equal(t, releaseVersionIDs[1], *stillOrigin,
		"CR-01: das Entfernen einer ANDEREN Zuweisung darf eine noch gueltige Origin auf einer weiterhin zugewiesenen Release nicht anfassen")

	remaining, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
	require.NoError(t, err)
	require.ElementsMatch(t, []int64{releaseVersionIDs[1]}, remaining)
}
