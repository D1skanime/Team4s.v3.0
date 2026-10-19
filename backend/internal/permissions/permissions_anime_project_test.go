package permissions

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// animeProjectResolverStub implements the full Resolver interface (six no-op methods,
// mirroring resolverStub in permissions_test.go) PLUS the optional
// AnimeProjectContributionResolver capability (Task 2/3). contributionRoles is keyed by
// fansubGroupID only (ignoring animeID) since every test case below only ever exercises a
// single anime -- matching the plan's documented stub shape.
type animeProjectResolverStub struct {
	roles             map[int64][]string
	contributionRoles map[int64][]string
}

func (s animeProjectResolverStub) ResolveFansubGroup(_ context.Context, _ int64) (*Context, error) {
	return nil, nil
}

func (s animeProjectResolverStub) ResolveRelease(_ context.Context, _ int64) (*Context, error) {
	return nil, nil
}

func (s animeProjectResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*Context, error) {
	return nil, nil
}

func (s animeProjectResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*Context, error) {
	return nil, nil
}

func (s animeProjectResolverStub) ListActorGroupRoles(_ context.Context, _ int64, fansubGroupID int64) ([]string, error) {
	return s.roles[fansubGroupID], nil
}

func (s animeProjectResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func (s animeProjectResolverStub) ListActorContributionRolesForAnimeProject(_ context.Context, _ int64, _ int64, fansubGroupID int64) ([]string, error) {
	return s.contributionRoles[fansubGroupID], nil
}

// TestCanForAnimeProjectDeniesNonGrantingGroupRoleWithoutProjectRole ist Testfall 1: eine
// Gruppenrolle ("editor"), die das Recht gar nicht trägt, und keine Projektrolle -> denied.
func TestCanForAnimeProjectDeniesNonGrantingGroupRoleWithoutProjectRole(t *testing.T) {
	snapshot := SnapshotLoadedCacheForTests()
	t.Cleanup(func() { RestoreLoadedCacheForTests(snapshot) })
	cacheMu.Lock()
	loadedCache = fullValidCacheData()
	cacheMu.Unlock()

	resolver := animeProjectResolverStub{
		roles: map[int64][]string{26: {RoleEditor}},
	}
	svc := NewService(resolver)

	result, err := svc.CanForAnimeProject(context.Background(), Actor{AppUserID: 6, Status: "active"}, ActionAnimeFansubProjectTimelineUpdate, 3, 26)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
	assert.Equal(t, ReasonInsufficientRole, result.ReasonCode)
}

// TestCanForAnimeProjectAllowsConfirmedProjectLeadWithoutGroupGrant ist Testfall 2, der
// Kernfall des Bugfixes (D-12): eine bestätigte Projektrolle project_lead genügt, auch ohne
// granting Gruppenrolle.
func TestCanForAnimeProjectAllowsConfirmedProjectLeadWithoutGroupGrant(t *testing.T) {
	snapshot := SnapshotLoadedCacheForTests()
	t.Cleanup(func() { RestoreLoadedCacheForTests(snapshot) })
	cacheMu.Lock()
	loadedCache = fullValidCacheData()
	cacheMu.Unlock()

	resolver := animeProjectResolverStub{
		roles:             map[int64][]string{26: {RoleEditor}},
		contributionRoles: map[int64][]string{26: {RoleProjectLead}},
	}
	svc := NewService(resolver)

	result, err := svc.CanForAnimeProject(context.Background(), Actor{AppUserID: 6, Status: "active"}, ActionAnimeFansubProjectTimelineUpdate, 3, 26)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
	assert.Equal(t, RoleProjectLead, result.MatchedRole)
}

// TestCanForAnimeProjectDeniesTypesetterAfterMigrationGroupRole ist Testfall 5 Variante A
// (D-11-Regressionsschutz, Post-Migrations-Zustand simuliert: typesetter fehlt im Cache):
// eine Gruppenrolle typesetter ohne Projektrollen-Treffer darf nicht mehr erlauben.
func TestCanForAnimeProjectDeniesTypesetterAfterMigrationGroupRole(t *testing.T) {
	snapshot := SnapshotLoadedCacheForTests()
	t.Cleanup(func() { RestoreLoadedCacheForTests(snapshot) })
	cacheMu.Lock()
	loadedCache = fullValidCacheData()
	cacheMu.Unlock()

	resolver := animeProjectResolverStub{
		roles: map[int64][]string{26: {RoleTypesetter}},
	}
	svc := NewService(resolver)

	result, err := svc.CanForAnimeProject(context.Background(), Actor{AppUserID: 6, Status: "active"}, ActionAnimeFansubProjectTimelineUpdate, 3, 26)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
}

// TestCanForAnimeProjectDeniesTypesetterAfterMigrationProjectRole ist Testfall 5 Variante B
// (D-11-Regressionsschutz): keine granting Gruppenrolle, aber eine (nach Migration wirkungslose)
// Projektrolle typesetter -- darf ebenfalls nicht mehr erlauben.
func TestCanForAnimeProjectDeniesTypesetterAfterMigrationProjectRole(t *testing.T) {
	snapshot := SnapshotLoadedCacheForTests()
	t.Cleanup(func() { RestoreLoadedCacheForTests(snapshot) })
	cacheMu.Lock()
	loadedCache = fullValidCacheData()
	cacheMu.Unlock()

	resolver := animeProjectResolverStub{
		contributionRoles: map[int64][]string{26: {RoleTypesetter}},
	}
	svc := NewService(resolver)

	result, err := svc.CanForAnimeProject(context.Background(), Actor{AppUserID: 6, Status: "active"}, ActionAnimeFansubProjectTimelineUpdate, 3, 26)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
}

// TestCanForAnimeProjectAllowsFansubLeadGroupRoleAfterMigration ist Testfall 6, der konkrete
// Live-Fall aus D-10: fansub_lead als Gruppenrolle genügt nach der Migration ohne jede
// Projektrolle.
func TestCanForAnimeProjectAllowsFansubLeadGroupRoleAfterMigration(t *testing.T) {
	snapshot := SnapshotLoadedCacheForTests()
	t.Cleanup(func() { RestoreLoadedCacheForTests(snapshot) })
	cacheMu.Lock()
	loadedCache = fullValidCacheData()
	cacheMu.Unlock()

	resolver := animeProjectResolverStub{
		roles: map[int64][]string{26: {RoleFansubLead}},
	}
	svc := NewService(resolver)

	result, err := svc.CanForAnimeProject(context.Background(), Actor{AppUserID: 6, Status: "active"}, ActionAnimeFansubProjectTimelineUpdate, 3, 26)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
	assert.Equal(t, RoleFansubLead, result.MatchedRole)
}
