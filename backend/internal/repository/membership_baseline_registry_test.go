package repository

// Phase 145 Plan 02 -- proves, against real PostgreSQL (not the pure-Go fixtures Plan 145-01
// already locked), that migration 0160 seeds exactly the 3 expected role_capabilities rows for
// the reserved group_member pseudo-role, rolls back cleanly, and that the pseudo-role-sourced
// baseline resolution and catalog-exclusion SQL genuinely work against a real migrated schema.

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"
)

// phase145MigrationPath resolves a database/migrations/<name> path relative to this test file
// (repository package cannot reach testsupport's own unexported phase145MigrationPath helper).
// Mirrors the established local-helper precedent in review_delegation_repository_test.go.
func phase145MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-145 migration test path")
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", name)
}

// membershipBaselineFakeResolver is a small local double implementing exactly what
// ResolveGroupRights needs for this proof: no role grants (roles: nil, so the baseline switch
// case -- not the role_grant case -- must decide), an active membership. Re-declared locally
// (mirrors effective_rights_test.go's effectiveRightsFakeResolver, which is unexported in the
// permissions package and therefore not reusable from here).
type membershipBaselineFakeResolver struct {
	activeMembership bool
}

func (f *membershipBaselineFakeResolver) ResolveFansubGroup(context.Context, int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{1}}, nil
}

func (f *membershipBaselineFakeResolver) ResolveRelease(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (f *membershipBaselineFakeResolver) ResolveReleaseVersion(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (f *membershipBaselineFakeResolver) ResolveReleaseVersionMedia(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}

func (f *membershipBaselineFakeResolver) ListActorGroupRoles(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *membershipBaselineFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *membershipBaselineFakeResolver) ResolveActorGroupMembership(context.Context, int64, int64) (*permissions.GroupMembershipState, error) {
	return &permissions.GroupMembershipState{ActiveMembership: f.activeMembership}, nil
}

var (
	_ permissions.Resolver                      = (*membershipBaselineFakeResolver)(nil)
	_ permissions.GroupRightsMembershipResolver = (*membershipBaselineFakeResolver)(nil)
)

// membershipBaselineFillGapCacheLoader wraps the real repository CacheLoader so that
// permissions.Service.LoadCache's whole-catalog completeness gate (validateCapabilityCatalog --
// every permissions.Action must be granted by some role or be declared standalone, unrelated to
// what this plan tests) does not block loading the REAL Postgres-sourced group_member
// pseudo-role rows this test verifies. testsupport.OpenPhase145Postgres deliberately applies
// only 4 migrations (0085/0100/0108/0112) plus this test's own 0160 apply -- production's full
// action inventory spans many more migrations this narrow fixture does not replay. Every action
// NOT already granted by the real, migrated role_capabilities table is synthetically granted to
// a filler role here so the completeness gate passes; role_code='group_member' itself is
// completely untouched by this wrapper and 100% sourced from the real database.
type membershipBaselineFillGapCacheLoader struct {
	inner permissions.CacheLoader
}

func (l membershipBaselineFillGapCacheLoader) LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error) {
	data, err := l.inner.LoadRoleCapabilities(ctx)
	if err != nil {
		return nil, err
	}
	seen := make(map[permissions.Action]bool, len(data))
	for _, actions := range data {
		for _, a := range actions {
			seen[a] = true
		}
	}
	const fillerRole = "phase145_catalog_completeness_filler"
	for _, action := range []permissions.Action{
		permissions.ActionFansubGroupHistoricalMembersManage,
		permissions.ActionFansubGroupHistoricalRolesManage,
		permissions.ActionFansubGroupHistoricalMembersLink,
		permissions.ActionFansubGroupMediaUpdate,
		permissions.ActionFansubGroupMediaUpdateOwn,
		permissions.ActionFansubGroupMediaReorder,
		permissions.ActionFansubGroupMediaDelete,
		permissions.ActionFansubGroupPageGeneralEdit,
		permissions.ActionFansubGroupPageTechnicalLinksEdit,
		permissions.ActionFansubGroupPageFoundingHistoryEdit,
		permissions.ActionFansubGroupLinksUpdate,
		permissions.ActionAnimeFansubProjectTimelineUpdate,
		permissions.ActionReleaseVersionSegmentsManage,
		permissions.ActionReleaseVersionMetadataUpdate,
		permissions.ActionReviewTextDecide,
		permissions.ActionReviewImageDecide,
		permissions.ActionReviewContributionDecide,
		permissions.ActionUserGroupCapabilityOverrideManage,
	} {
		if !seen[action] {
			data[fillerRole] = append(data[fillerRole], action)
		}
	}
	return data, nil
}

var _ permissions.CacheLoader = membershipBaselineFillGapCacheLoader{}

// TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights proves
// Phase 145's Success Criterion 2 against a real, migrated (through 0112) Postgres schema:
// migration 0160 seeds exactly the 3 expected role_capabilities rows for the reserved
// group_member pseudo-role, the down migration removes them cleanly with no FK violation, and
// an active member's resolved effective rights for the 3 baseline actions are byte-identical to
// Plan 145-01's locked pure-Go snapshot (TestResolveGroupRightsActiveMemberGetsMembershipBaselineRights)
// once the registry-sourced mechanism is wired to a real loaded cache.
func TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()

	// (a) Before 0160: role_capabilities has 0 rows for role_code='group_member' and
	// role_definitions has no such row.
	var preCapabilityCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM role_capabilities WHERE role_code = 'group_member'`).Scan(&preCapabilityCount))
	assert.Equal(t, 0, preCapabilityCount, "role_capabilities must have zero group_member rows before migration 0160")

	var preRoleExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM role_definitions WHERE code = 'group_member')`).Scan(&preRoleExists))
	assert.False(t, preRoleExists, "role_definitions must have no group_member row before migration 0160")

	// (b) Apply migration 0160 and confirm the exact 3-action seed, no more, no fewer.
	testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))

	rows, err := pool.Query(ctx, `SELECT action_code FROM role_capabilities WHERE role_code = 'group_member' ORDER BY action_code`)
	require.NoError(t, err)
	var actionCodes []string
	for rows.Next() {
		var code string
		require.NoError(t, rows.Scan(&code))
		actionCodes = append(actionCodes, code)
	}
	rows.Close()
	require.NoError(t, rows.Err())
	require.Len(t, actionCodes, 3, "migration 0160 must seed exactly 3 baseline actions, no more, no fewer")
	assert.ElementsMatch(t, []string{
		"fansub_group.members.view",
		"fansub_group_media.upload",
		"fansub_group_media.view",
	}, actionCodes, "migration 0160 must seed exactly the 3 expected baseline actions (order not asserted -- Postgres' default locale collation does not sort '.' vs '_' as plain ASCII byte order)")

	// (c) Load a real cache from Postgres and prove ResolveGroupRights sources the 3 baseline
	// actions from the pseudo-role's registry entry, matching Plan 145-01's locked pure-Go
	// snapshot (TestResolveGroupRightsActiveMemberGetsMembershipBaselineRights).
	repo := NewAuthzRepository(pool)
	resolver := &membershipBaselineFakeResolver{activeMembership: true}
	svc := permissions.NewService(resolver)
	require.NoError(t, svc.LoadCache(ctx, membershipBaselineFillGapCacheLoader{inner: repo}))

	actor := permissions.Actor{AppUserID: 1, Status: "active"}
	res, err := svc.ResolveGroupRights(ctx, actor, 1)
	require.NoError(t, err)

	for _, action := range []permissions.Action{
		permissions.ActionFansubGroupMembersView,
		permissions.ActionFansubGroupMediaView,
		permissions.ActionFansubGroupMediaUpload,
	} {
		state := res.Can(action)
		assert.True(t, state.Allowed, "active member must be allowed %s via the registry-sourced baseline", action)
		assert.Equal(t, "membership_baseline", state.DecisiveSource, "action %s must resolve via membership_baseline provenance", action)
	}

	// (d) Apply the down migration and confirm a clean, symmetric, zero-row reversal.
	testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.down.sql"))

	var postCapabilityCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM role_capabilities WHERE role_code = 'group_member'`).Scan(&postCapabilityCount))
	assert.Equal(t, 0, postCapabilityCount, "down migration must remove all group_member role_capabilities rows")

	var postRoleExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM role_definitions WHERE code = 'group_member')`).Scan(&postRoleExists))
	assert.False(t, postRoleExists, "down migration must remove the group_member role_definitions row")
}

// TestLoadFansubGroupRolesExcludesReservedPseudoRoleAfterMigration is the real-SQL complement
// to Plan 145-01's stub-based TestPseudoRoleCapabilityEditableButNotAssignable: proves the
// actual LoadFansubGroupRoles SQL query excludes the reserved pseudo-role even though its
// contexts array contains 'fansub_group', which would otherwise satisfy the OR predicate.
func TestLoadFansubGroupRolesExcludesReservedPseudoRoleAfterMigration(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()

	testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))

	var contexts []string
	require.NoError(t, pool.QueryRow(ctx, `SELECT contexts FROM role_definitions WHERE code = 'group_member'`).Scan(&contexts))
	require.Contains(t, contexts, "fansub_group", "the reserved pseudo-role must carry the fansub_group context that would otherwise satisfy LoadFansubGroupRoles' OR predicate")

	repo := NewAuthzRepository(pool)
	roles, err := repo.LoadFansubGroupRoles(ctx)
	require.NoError(t, err)
	assert.NotContains(t, roles, "group_member", "LoadFansubGroupRoles must exclude the reserved pseudo-role from the assignable catalog")
}
