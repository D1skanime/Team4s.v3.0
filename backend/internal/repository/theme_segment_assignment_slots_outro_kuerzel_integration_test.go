package repository

// Outro-own-slot + kuerzel-driven derivation regression tests, added as the Rule-1
// deviation fix on top of 176-02's Live-UAT checkpoint (2026-10-07): saving a new Outro
// segment on a release version that already had an ED segment used to fail with a 409
// ("Für die gewählten Folgen ist bereits ein Segment desselben Typs zugewiesen"), because
// CanonicalSegmentType's substring-guessing mapped "outro" onto the "ED" slot. The fix
// makes theme_types.kuerzel (Migration 0179) the single source of truth for OP/ED/IN/OUT
// classification and gives Outro its OWN slot (OP, ED, OUT each max 1 per release version;
// IN unrestricted), per the user's binding 2026-10-07 decision.
//
// Unlike the pre-existing newSegmentSlotFixture (theme_segment_assignment_slots_integration_test.go),
// which deliberately leaves theme_types.kuerzel unset to exercise
// CanonicalSegmentTypeFromKuerzel's legacy name-guessing fallback path, this fixture seeds
// kuerzel exactly as Migration 0179 does in production (OP/ED/IN/OUT) to prove the NEW,
// now-primary kuerzel-driven path.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

type outroSlotFixture struct {
	pool     *pgxpool.Pool
	repo     *AdminContentRepository
	ctx      context.Context
	versions []int64
	animeID  int64
	groupID  int64

	opThemeID, edThemeID, outThemeID, inThemeID                 int64
	opThemeTypeID, edThemeTypeID, outThemeTypeID, inThemeTypeID int64
}

func newOutroSlotFixture(t *testing.T) outroSlotFixture {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	const animeID, groupID = int64(1), int64(1)
	// seedAutoAssignBaseFixture also inserts its own theme_type/theme (id=1, no kuerzel) --
	// unused by these tests, but required for the shared fixture's episodes/anime_fansub_groups
	// scaffolding to exist.
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, 1, 1)
	seedAutoAssignFansubGroup(t, pool, ctx, groupID)

	f := outroSlotFixture{
		pool: pool, repo: NewAdminContentRepository(pool), ctx: ctx,
		animeID: animeID, groupID: groupID,
		opThemeID: 10, edThemeID: 11, outThemeID: 12, inThemeID: 13,
		opThemeTypeID: 10, edThemeTypeID: 11, outThemeTypeID: 12, inThemeTypeID: 13,
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO theme_types (id, name, kuerzel) VALUES
			($1, 'OP Kara', 'OP'),
			($2, 'ED Kara', 'ED'),
			($3, 'Outro', 'OUT'),
			($4, 'Insert Kara', 'IN')
	`, f.opThemeTypeID, f.edThemeTypeID, f.outThemeTypeID, f.inThemeTypeID)
	require.NoError(t, err)

	for _, pair := range []struct{ themeID, themeTypeID int64 }{
		{f.opThemeID, f.opThemeTypeID},
		{f.edThemeID, f.edThemeTypeID},
		{f.outThemeID, f.outThemeTypeID},
		{f.inThemeID, f.inThemeTypeID},
	} {
		_, err := pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1,$2,$3)`, pair.themeID, animeID, pair.themeTypeID)
		require.NoError(t, err)
	}

	// seedAutoAssignBaseFixture above only creates episodes 1-5 (episode id = 100+n) -- reuse
	// those 3 of them rather than inventing new episode IDs with no backing episodes row.
	for n := 1; n <= 3; n++ {
		id := createAutoAssignReleaseVersion(t, pool, ctx, int64(100+n))
		_, err := pool.Exec(ctx, `INSERT INTO release_version_groups(release_version_id,fansub_group_id) VALUES($1,$2)`, id, groupID)
		require.NoError(t, err)
		f.versions = append(f.versions, id)
	}
	return f
}

func (f outroSlotFixture) segment(t *testing.T, themeID int64, start, end int) int64 {
	t.Helper()
	return seedAutoAssignThemeSegment(t, f.pool, f.ctx, themeID, f.groupID, start, end)
}

func (f outroSlotFixture) assign(t *testing.T, segmentID int64, versionIndex int) error {
	t.Helper()
	_, err := f.repo.AssignThemeSegmentToReleaseVersion(f.ctx, segmentID, f.versions[versionIndex])
	return err
}

// Scenario a: saving an Outro segment alongside an existing ED segment on the same release
// version succeeds -- this is the exact Live-UAT defect report (409 that must no longer occur).
func TestOutroSlotIndependentFromED(t *testing.T) {
	f := newOutroSlotFixture(t)
	ed := f.segment(t, f.edThemeID, 1, 1)
	out := f.segment(t, f.outThemeID, 1, 1)

	require.NoError(t, f.assign(t, ed, 0))
	require.NoError(t, f.assign(t, out, 0), "Outro must get its own slot, independent of ED (2026-10-07 user decision) -- this is the exact Live-UAT 409 defect")
}

// Scenario b: a second Outro on the same release version still conflicts -- OUT is its own
// exclusive slot, not simply unrestricted like IN.
func TestOutroSlotConflictsWithItself(t *testing.T) {
	f := newOutroSlotFixture(t)
	first := f.segment(t, f.outThemeID, 1, 1)
	second := f.segment(t, f.outThemeID, 1, 1)

	require.NoError(t, f.assign(t, first, 0))
	err := f.assign(t, second, 0)
	require.ErrorIs(t, err, ErrSegmentAssignmentConflict, "a second Outro on the same release version must still conflict -- OUT is its own max-1 slot")
}

// Scenario c: Insert (IN) remains unrestricted -- multiple Insert segments on the same release
// version must succeed, unlike OP/ED/OUT.
func TestInsertSlotRemainsUnrestricted(t *testing.T) {
	f := newOutroSlotFixture(t)
	first := f.segment(t, f.inThemeID, 1, 1)
	second := f.segment(t, f.inThemeID, 1, 1)

	require.NoError(t, f.assign(t, first, 0))
	require.NoError(t, f.assign(t, second, 0), "IN has no slot limit -- multiple Insert segments per release version are allowed")
}

// Scenario d: retyping an existing segment's theme from ED to Outro must be checked against
// the OUT slot (already occupied here by a separate Outro segment), not the ED slot (which
// would be vacated by the change and would wrongly appear free).
func TestChangingSegmentTypeFromEdToOutroChecksOutSlotNotEdSlot(t *testing.T) {
	f := newOutroSlotFixture(t)
	ed := f.segment(t, f.edThemeID, 1, 1)
	out := f.segment(t, f.outThemeID, 1, 1)

	require.NoError(t, f.assign(t, ed, 0))
	require.NoError(t, f.assign(t, out, 0), "ED and OUT are independent slots and may coexist on the same release version")

	newType := f.outThemeTypeID
	err := f.repo.UpdateAdminAnimeTheme(f.ctx, f.edThemeID, models.AdminAnimeThemePatchInput{ThemeTypeID: &newType})
	require.ErrorIs(t, err, ErrSegmentAssignmentConflict, "retyping the ED segment's theme to Outro must be checked against the already-occupied OUT slot, not the ED slot it is leaving")

	var actualType int64
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT theme_type_id FROM themes WHERE id=$1`, f.edThemeID).Scan(&actualType))
	require.Equal(t, f.edThemeTypeID, actualType, "the rejected type change must not have been persisted")
}

// Scenario e (group project timeline public projection): an Outro-typed segment's Type is
// reported as "OUT", not "ED" -- group_repository_cursor_timeline.go's
// attachReleaseTimelineSegments now derives Type from theme_types.kuerzel via
// CanonicalSegmentTypeFromKuerzel.
func TestOutroPublicProjectionTypeIsOutOnProjectTimeline(t *testing.T) {
	f := newOutroSlotFixture(t)
	out := f.segment(t, f.outThemeID, 1, 1)
	require.NoError(t, f.assign(t, out, 0))

	repo := NewGroupRepository(f.pool)
	episodes := []models.EpisodeReleaseSummary{{ID: f.versions[0]}}
	require.NoError(t, repo.attachReleaseTimelineSegments(f.ctx, f.animeID, f.groupID, episodes))

	require.Len(t, episodes[0].TimelineSegments, 1)
	require.Equal(t, out, episodes[0].TimelineSegments[0].ID)
	require.Equal(t, "OUT", episodes[0].TimelineSegments[0].Type, "an Outro segment's public project-timeline type must be OUT, not ED")
}

// Scenario e (release detail public projection): the same OUT type must also hold on the
// release detail page's segment projection (release_detail_public_repository_helpers.go's
// loadReleaseSegments).
func TestOutroPublicProjectionTypeIsOutOnReleaseDetail(t *testing.T) {
	f := newOutroSlotFixture(t)
	out := f.segment(t, f.outThemeID, 1, 1)
	require.NoError(t, f.assign(t, out, 0))

	repo := NewReleaseDetailPublicRepository(f.pool, "")
	segments, err := repo.loadReleaseSegments(f.ctx, f.animeID, f.groupID, f.versions[0], "v1", "1", nil)
	require.NoError(t, err)

	found := findSegmentByID(segments, out)
	require.NotNil(t, found, "the Outro segment must be present in the release detail segment projection")
	require.Equal(t, "OUT", found.Type, "an Outro segment's public release-detail type must be OUT, not ED")
}
