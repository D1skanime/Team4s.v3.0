package repository

// Phase 189, Plan 08 (D-12): proves countFansubGroupDependents and
// DeleteGroup's new pre-check against a real Postgres fixture
// (testsupport.OpenPhase189Postgres), mirroring release_version_group_guard_test.go's
// real-fixture style for the same reason -- real FK/CASCADE/RESTRICT/NO ACTION
// behavior from the live schema is exactly what this guard depends on being
// correct.

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

func TestCountFansubGroupDependentsZeroWhenGroupIsEmpty(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()

	const groupID = int64(1)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)

	summary, err := countFansubGroupDependents(ctx, pool, groupID)
	require.NoError(t, err)
	require.False(t, summary.HasAny(), "a group with no rows anywhere must have zero dependents")
}

func TestCountFansubGroupDependentsDetectsEachRealCategory(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()

	const (
		groupID   = int64(10)
		releaseID = int64(20)
		memberID  = int64(30)
		appUserID = int64(40)
		animeID   = int64(50)
	)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO app_users (id) VALUES ($1)`, appUserID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)

	// 1. Releases
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseID, groupID)
	require.NoError(t, err)
	// 2. Memberships
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id) VALUES (1, $1, $2)`, groupID, appUserID)
	require.NoError(t, err)
	// 3. Contributions
	_, err = pool.Exec(ctx, `INSERT INTO anime_contributions (id, fansub_group_id, anime_id) VALUES (1, $1, $2)`, groupID, animeID)
	require.NoError(t, err)
	// 4. HistoricalMembers
	_, err = pool.Exec(ctx, `INSERT INTO hist_fansub_group_members (id, fansub_group_id, member_id) VALUES (1, $1, $2)`, groupID, memberID)
	require.NoError(t, err)
	// 5. Media (real FK column is group_id, not fansub_group_id)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_media (group_id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	// 6. GroupNotes
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_notes (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 7. ProjectNotes
	_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_project_notes (id, anime_id, fansub_group_id) VALUES (1, $1, $2)`, animeID, groupID)
	require.NoError(t, err)
	// 8. History
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_history (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 9. Segments
	_, err = pool.Exec(ctx, `INSERT INTO theme_segments (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 10. SegmentLibrary
	_, err = pool.Exec(ctx, `INSERT INTO segment_library_definitions (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 11. DefaultCrew
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_default_crew (id, fansub_group_id, member_id) VALUES (1, $1, $2)`, groupID, memberID)
	require.NoError(t, err)
	// 12. PendingInvitations
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_invitations (id, fansub_group_id, status) VALUES (1, $1, 'pending')`, groupID)
	require.NoError(t, err)
	// 13. PendingClaimInvitations
	_, err = pool.Exec(ctx, `INSERT INTO member_claim_invitations (id, fansub_group_id, member_id, status) VALUES (1, $1, $2, 'pending')`, groupID, memberID)
	require.NoError(t, err)
	// 14. CapabilityOverrides (action_code must exist + be user_overridable=true -- seeded by 0146/0150)
	_, err = pool.Exec(ctx, `
		INSERT INTO user_group_capability_overrides (
			app_user_id, fansub_group_id, action_code, effect, created_by_app_user_id, updated_by_app_user_id
		) VALUES ($1, $2, 'fansub_group_media.upload', 'allow', $1, $1)
	`, appUserID, groupID)
	require.NoError(t, err)
	// 15. PlaybackEntitlements
	_, err = pool.Exec(ctx, `INSERT INTO release_playback_entitlement_rules (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 16. ReviewDecisions
	_, err = pool.Exec(ctx, `INSERT INTO review_decisions (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 17. ReviewAuditHistory
	_, err = pool.Exec(ctx, `INSERT INTO review_audit_events (id, fansub_group_id) VALUES (1, $1)`, groupID)
	require.NoError(t, err)
	// 18. OverrideHistory
	_, err = pool.Exec(ctx, `
		INSERT INTO user_group_capability_override_history (
			app_user_id, fansub_group_id, action_code, actor_app_user_id, actor_is_platform_admin, before_effect, after_effect
		) VALUES ($1, $2, 'fansub_group_media.upload', $1, true, NULL, 'allow')
	`, appUserID, groupID)
	require.NoError(t, err)
	// 19. Links (189-REVIEW.md CR-01: real FK column is group_id, not fansub_group_id,
	// same as fansub_group_media above)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_links (group_id) VALUES ($1)`, groupID)
	require.NoError(t, err)

	summary, err := countFansubGroupDependents(ctx, pool, groupID)
	require.NoError(t, err)
	require.True(t, summary.HasAny())
	require.Equal(t, int32(1), summary.Releases)
	require.Equal(t, int32(1), summary.Memberships)
	require.Equal(t, int32(1), summary.Contributions)
	require.Equal(t, int32(1), summary.HistoricalMembers)
	require.Equal(t, int32(1), summary.Media)
	require.Equal(t, int32(1), summary.GroupNotes)
	require.Equal(t, int32(1), summary.ProjectNotes)
	require.Equal(t, int32(1), summary.History)
	require.Equal(t, int32(1), summary.Segments)
	require.Equal(t, int32(1), summary.SegmentLibrary)
	require.Equal(t, int32(1), summary.DefaultCrew)
	require.Equal(t, int32(1), summary.PendingInvitations)
	require.Equal(t, int32(1), summary.PendingClaimInvitations)
	require.Equal(t, int32(1), summary.CapabilityOverrides)
	require.Equal(t, int32(1), summary.PlaybackEntitlements)
	require.Equal(t, int32(1), summary.ReviewDecisions)
	require.Equal(t, int32(1), summary.ReviewAuditHistory)
	require.Equal(t, int32(1), summary.OverrideHistory)
	require.Equal(t, int32(1), summary.Links)

	require.Contains(t, summary.GermanReasonFragment(), "1 Release")
	require.Contains(t, summary.GermanReasonFragment(), "1 Link")
}

// TestCountFansubGroupDependentsDetectsLinksOnly is a focused negative-
// regression guard for 189-REVIEW.md CR-01: countFansubGroupDependents must
// detect a fansub_group_links row even when every other counted category is
// empty. The initial D-12 implementation omitted this table entirely, so a
// group whose ONLY dependent was a links row silently passed the dependents
// check and was deleted, cascading the link row away with no 409.
func TestCountFansubGroupDependentsDetectsLinksOnly(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()

	const groupID = int64(110)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_links (group_id) VALUES ($1)`, groupID)
	require.NoError(t, err)

	summary, err := countFansubGroupDependents(ctx, pool, groupID)
	require.NoError(t, err)
	require.True(t, summary.HasAny(), "a group whose only dependent is a fansub_group_links row must count as having dependents")
	require.Equal(t, int32(1), summary.Links)
}

func TestCountFansubGroupDependentsIgnoresExcludedTables(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()

	const (
		groupID      = int64(60)
		otherGroupID = int64(61)
		animeID      = int64(70)
	)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1), ($2)`, groupID, otherGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)

	// Excluded: fansub_group_aliases (D-12 explicit exclusion).
	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_aliases (fansub_group_id, alias) VALUES ($1, 'Strawhat')`, groupID)
	require.NoError(t, err)
	// Excluded: anime_fansub_groups -- pure assignment, no real release.
	_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES ($1, $2)`, animeID, groupID)
	require.NoError(t, err)

	summary, err := countFansubGroupDependents(ctx, pool, groupID)
	require.NoError(t, err)
	require.False(t, summary.HasAny(), "aliases and pure anime-assignment rows must not count as dependents")
}

func TestCountFansubGroupDependentsIgnoresCancelledInvitations(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()

	const (
		groupID  = int64(80)
		memberID = int64(81)
	)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `INSERT INTO fansub_group_invitations (id, fansub_group_id, status) VALUES (1, $1, 'cancelled')`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO member_claim_invitations (id, fansub_group_id, member_id, status) VALUES (1, $1, $2, 'expired')`, groupID, memberID)
	require.NoError(t, err)

	summary, err := countFansubGroupDependents(ctx, pool, groupID)
	require.NoError(t, err)
	require.False(t, summary.HasAny(), "non-pending invitations must not count as dependents")
	require.Equal(t, int32(0), summary.PendingInvitations)
	require.Equal(t, int32(0), summary.PendingClaimInvitations)
}

func TestDeleteGroupBlocksWhenDependentsExist(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	const (
		groupID   = int64(90)
		releaseID = int64(91)
	)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseID, groupID)
	require.NoError(t, err)

	err = repo.DeleteGroup(ctx, groupID)
	require.Error(t, err)

	var depErr *FansubGroupHasDependentsError
	require.True(t, errors.As(err, &depErr), "expected *FansubGroupHasDependentsError, got %T: %v", err, err)
	require.Equal(t, groupID, depErr.FansubGroupID)
	require.Equal(t, int32(1), depErr.Summary.Releases)
	require.True(t, errors.Is(err, ErrFansubGroupHasDependents))

	var stillExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`, groupID).Scan(&stillExists))
	require.True(t, stillExists, "DeleteGroup must not delete the group when dependents exist")
}

func TestDeleteGroupSucceedsWhenEmpty(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	const groupID = int64(100)

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)

	err = repo.DeleteGroup(ctx, groupID)
	require.NoError(t, err)

	var stillExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`, groupID).Scan(&stillExists))
	require.False(t, stillExists, "DeleteGroup must delete an empty group, unchanged from today's behavior")
}
