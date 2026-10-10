package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// Phase 178, Plan 02 (D-18): real-Postgres proof that attachGroupAliases bulk-loads
// FansubGroup.Aliases for both the list and single-group read paths, so plans
// 178-03/04/05 can filter against group.aliases directly off an already-fetched
// FansubGroup without an extra per-group round trip.

// TestPhase178FansubGroupAliases_ListGroupsIncludesAliases proves a group with 2
// stored aliases returned via ListGroups has Aliases populated with both alias
// strings, ordered alphabetically.
func TestPhase178FansubGroupAliases_ListGroupsIncludesAliases(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupID := insertPhase167Group(t, pool, "group-a", "Group A")
	_, err := repo.CreateAlias(ctx, groupID, models.FansubAliasCreateInput{
		Alias:           "Zeta",
		NormalizedAlias: "zeta",
	})
	require.NoError(t, err)
	_, err = repo.CreateAlias(ctx, groupID, models.FansubAliasCreateInput{
		Alias:           "Alpha",
		NormalizedAlias: "alpha",
	})
	require.NoError(t, err)

	items, total, err := repo.ListGroups(ctx, models.FansubFilter{Page: 1, PerPage: 50})
	require.NoError(t, err)
	require.GreaterOrEqual(t, total, int64(1))

	var found *models.FansubGroup
	for i := range items {
		if items[i].ID == groupID {
			found = &items[i]
			break
		}
	}
	require.NotNil(t, found, "expected group-a to be present in ListGroups result")
	require.Equal(t, []string{"Alpha", "Zeta"}, found.Aliases, "aliases must be ordered alphabetically")
}

// TestPhase178FansubGroupAliases_GetGroupByIDIncludesAliases proves GetGroupByID
// returns the same Aliases content as ListGroups would for that group (parity
// between the two read paths).
func TestPhase178FansubGroupAliases_GetGroupByIDIncludesAliases(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupID := insertPhase167Group(t, pool, "group-b", "Group B")
	_, err := repo.CreateAlias(ctx, groupID, models.FansubAliasCreateInput{
		Alias:           "BDnP",
		NormalizedAlias: "bdnp",
	})
	require.NoError(t, err)

	reloaded, err := repo.GetGroupByID(ctx, groupID)
	require.NoError(t, err)
	require.Equal(t, []string{"BDnP"}, reloaded.Aliases)
}

// TestPhase178FansubGroupAliases_NoAliasesIsEmptyNotError proves a group with 0
// stored aliases returned via ListGroups has Aliases as nil/empty (not an error,
// not a nil-pointer panic), and that attachGroupAliases on an empty slice returns
// nil immediately without issuing a query.
func TestPhase178FansubGroupAliases_NoAliasesIsEmptyNotError(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupID := insertPhase167Group(t, pool, "group-c", "Group C")

	items, _, err := repo.ListGroups(ctx, models.FansubFilter{Page: 1, PerPage: 50})
	require.NoError(t, err)

	var found *models.FansubGroup
	for i := range items {
		if items[i].ID == groupID {
			found = &items[i]
			break
		}
	}
	require.NotNil(t, found, "expected group-c to be present in ListGroups result")
	require.Empty(t, found.Aliases)

	require.NoError(t, repo.attachGroupAliases(ctx, []models.FansubGroup{}))
}
