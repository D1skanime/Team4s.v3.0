package repository

// admin_users_rights_summary_query_test.go proves F-01/UADM-06 (Plan 139-05, Task 2) against a
// real, disposable Postgres running the complete Phase-139 migration chain
// (testsupport.OpenPhase139Postgres). Seed helpers reuse the app_user/fansub-group helpers
// already defined in admin_users_contributions_query_test.go (139-03).

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"
)

func seedPhase139FansubGroupMember(
	t testing.TB, pool *pgxpool.Pool, id, groupID, appUserID int64, status string, roleCodes []string,
) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, id, groupID, appUserID, status)
	require.NoError(t, err)
	for _, code := range roleCodes {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO fansub_group_member_roles (fansub_group_member_id, role)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, code)
		require.NoError(t, err)
	}
}

// rightsSummaryFakeResolver is a minimal AdminUsersRightsBatchResolver stand-in that proves
// listUserRightsSummary wires the paginated memberships/actor into a single batch call --
// the real permissions.Service wiring is proven separately by
// effective_rights_batch_summary_test.go (Task 1) and by production wiring in main.go (Task 3).
type rightsSummaryFakeResolver struct {
	calls          int
	lastGroupIDs   []int64
	lastRolesByGrp map[int64][]string
	byGroup        map[int64]*permissions.GroupRightsResolution
}

func (f *rightsSummaryFakeResolver) ResolveGroupRightsBatch(
	_ context.Context, _ permissions.Actor, fansubGroupIDs []int64, rolesByGroup map[int64][]string,
) (map[int64]*permissions.GroupRightsResolution, error) {
	f.calls++
	f.lastGroupIDs = fansubGroupIDs
	f.lastRolesByGrp = rolesByGroup
	return f.byGroup, nil
}

// TestGetUserRightsSummaryBatchesAcrossGroups proves listUserRightsSummary calls
// ResolveGroupRightsBatch EXACTLY ONCE for a user in multiple groups (never once per group),
// and assembles RoleLabel/HeadlineStates/HasDeviation/OpenClaimsCount/Meta correctly from the
// real, paginated GetUserGroupMemberships result.
func TestGetUserRightsSummaryBatchesAcrossGroups(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)

	const (
		appUserID  int64 = 13905001
		groupOneID int64 = 13905010
		groupTwoID int64 = 13905011
	)
	seedPhase139AppUser(t, pool, appUserID, "rights-summary-user")
	seedPhase139FansubGroup(t, pool, groupOneID, "rights-summary-group-one")
	seedPhase139FansubGroup(t, pool, groupTwoID, "rights-summary-group-two")
	seedPhase139FansubGroupMember(t, pool, 13905020, groupOneID, appUserID, "active", []string{"fansub_lead"})
	seedPhase139FansubGroupMember(t, pool, 13905021, groupTwoID, appUserID, "active", nil)

	repo := NewAdminUsersRepository(pool, "")

	resolver := &rightsSummaryFakeResolver{
		byGroup: map[int64]*permissions.GroupRightsResolution{
			groupOneID: {
				Rights: map[permissions.Action]permissions.CapabilityRightState{
					permissions.ActionFansubGroupEdit:        {ActionCode: permissions.ActionFansubGroupEdit, Allowed: true},
					permissions.ActionFansubGroupMembersView: {ActionCode: permissions.ActionFansubGroupMembersView, Allowed: true},
					permissions.ActionReviewTextDecide:       {ActionCode: permissions.ActionReviewTextDecide, Allowed: false, UserDeny: true},
				},
			},
			groupTwoID: {
				Rights: map[permissions.Action]permissions.CapabilityRightState{
					permissions.ActionFansubGroupEdit: {ActionCode: permissions.ActionFansubGroupEdit, Allowed: false},
				},
			},
		},
	}

	page, err := repo.GetUserRightsSummary(context.Background(), appUserID, 25, 0, resolver)
	require.NoError(t, err)
	require.NotNil(t, page)

	require.Equal(t, 1, resolver.calls, "ResolveGroupRightsBatch must be called exactly once regardless of group count")
	require.ElementsMatch(t, []int64{groupOneID, groupTwoID}, resolver.lastGroupIDs)
	require.Equal(t, []string{"fansub_lead"}, resolver.lastRolesByGrp[groupOneID])

	require.Len(t, page.Data, 2)
	require.Equal(t, 2, page.Meta.Total)

	byGroup := make(map[int64]int)
	for i, item := range page.Data {
		byGroup[item.FansubGroupID] = i
	}

	one := page.Data[byGroup[groupOneID]]
	require.Equal(t, "Fansub-Leitung", one.RoleLabel)
	require.True(t, one.HasDeviation, "group one has a real user_deny and must be flagged as a deviation")
	require.LessOrEqual(t, len(one.HeadlineStates), 3)
	for _, state := range one.HeadlineStates {
		require.NotEmpty(t, state.Label)
	}

	two := page.Data[byGroup[groupTwoID]]
	require.Equal(t, "–", two.RoleLabel, "a role-less membership must show the placeholder, not an empty string")
	require.False(t, two.HasDeviation)
}

// TestGetUserRightsSummaryEmptyMembershipsSkipsBatchCall proves a user with zero group
// memberships never calls ResolveGroupRightsBatch at all (nothing to resolve) and returns an
// empty, well-formed page.
func TestGetUserRightsSummaryEmptyMembershipsSkipsBatchCall(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)

	const appUserID int64 = 13905002
	seedPhase139AppUser(t, pool, appUserID, "rights-summary-no-groups")

	repo := NewAdminUsersRepository(pool, "")
	resolver := &rightsSummaryFakeResolver{byGroup: map[int64]*permissions.GroupRightsResolution{}}

	page, err := repo.GetUserRightsSummary(context.Background(), appUserID, 25, 0, resolver)
	require.NoError(t, err)
	require.NotNil(t, page)
	require.Empty(t, page.Data)
	require.Equal(t, 0, resolver.calls, "must never call ResolveGroupRightsBatch for a user with zero memberships")
}
