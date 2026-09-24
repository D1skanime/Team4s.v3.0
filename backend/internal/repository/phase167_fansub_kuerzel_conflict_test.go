package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// quick-260924-dso Task 2 (GAP-05): real-Postgres proof that Kürzel uniqueness is
// cross-checked against BOTH other groups' Kürzel AND other groups' Aliases (and
// vice versa), naming the owning group via *repository.ConflictOwnerError, while a
// group setting its OWN existing alias text as its own Kürzel is NOT treated as a
// conflict.

// TestFansubGroupKuerzelUniqueness_SetsFreshKuerzel proves (a): UpdateGroup sets a
// fresh, unique Kürzel successfully and GetGroupByID reflects it.
func TestFansubGroupKuerzelUniqueness_SetsFreshKuerzel(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")

	kuerzel := "BDnP"
	updated, err := repo.UpdateGroup(ctx, groupAID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzel},
	})
	require.NoError(t, err)
	require.NotNil(t, updated.Kuerzel)
	require.Equal(t, "BDnP", *updated.Kuerzel)

	reloaded, err := repo.GetGroupByID(ctx, groupAID)
	require.NoError(t, err)
	require.NotNil(t, reloaded.Kuerzel)
	require.Equal(t, "BDnP", *reloaded.Kuerzel)
}

// TestFansubGroupKuerzelUniqueness_KuerzelVsKuerzelConflict proves (b):
// UpdateGroup(groupB, Kürzel equal to groupA's already-set Kürzel in a DIFFERENT
// casing) returns a *repository.ConflictOwnerError naming groupA.
func TestFansubGroupKuerzelUniqueness_KuerzelVsKuerzelConflict(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")

	kuerzelA := "BDnP"
	_, err := repo.UpdateGroup(ctx, groupAID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelA},
	})
	require.NoError(t, err)

	kuerzelBDifferentCasing := "bdnp"
	_, err = repo.UpdateGroup(ctx, groupBID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelBDifferentCasing},
	})
	require.Error(t, err)

	var ownerErr *ConflictOwnerError
	require.True(t, errors.As(err, &ownerErr), "expected *ConflictOwnerError, got %T: %v", err, err)
	require.Equal(t, groupAID, ownerErr.OwnerGroupID)
	require.Equal(t, "Group A", ownerErr.OwnerGroupName)
}

// TestFansubGroupKuerzelUniqueness_KuerzelVsAliasConflict proves (c):
// UpdateGroup(groupB, Kürzel equal to groupA's existing alias text) returns a
// *ConflictOwnerError naming groupA.
func TestFansubGroupKuerzelUniqueness_KuerzelVsAliasConflict(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")

	_, err := repo.CreateAlias(ctx, groupAID, models.FansubAliasCreateInput{
		Alias:           "BDnP",
		NormalizedAlias: "bdnp",
	})
	require.NoError(t, err)

	kuerzelB := "BDnP"
	_, err = repo.UpdateGroup(ctx, groupBID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelB},
	})
	require.Error(t, err)

	var ownerErr *ConflictOwnerError
	require.True(t, errors.As(err, &ownerErr), "expected *ConflictOwnerError, got %T: %v", err, err)
	require.Equal(t, groupAID, ownerErr.OwnerGroupID)
	require.Equal(t, "Group A", ownerErr.OwnerGroupName)
}

// TestFansubGroupKuerzelUniqueness_AliasVsKuerzelConflict proves (d):
// CreateAlias(groupB, alias equal to groupA's existing Kürzel) returns a
// *ConflictOwnerError naming groupA.
func TestFansubGroupKuerzelUniqueness_AliasVsKuerzelConflict(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")

	kuerzelA := "BDnP"
	_, err := repo.UpdateGroup(ctx, groupAID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelA},
	})
	require.NoError(t, err)

	_, err = repo.CreateAlias(ctx, groupBID, models.FansubAliasCreateInput{
		Alias:           "BDnP",
		NormalizedAlias: "bdnp",
	})
	require.Error(t, err)

	var ownerErr *ConflictOwnerError
	require.True(t, errors.As(err, &ownerErr), "expected *ConflictOwnerError, got %T: %v", err, err)
	require.Equal(t, groupAID, ownerErr.OwnerGroupID)
	require.Equal(t, "Group A", ownerErr.OwnerGroupName)
}

// TestFansubGroupKuerzelUniqueness_SameGroupOwnAliasIsNotAConflict proves (e):
// UpdateGroup(groupA, Kürzel equal to groupA's OWN existing alias text) succeeds
// without conflict -- proving the "another group's" exclusion is not a blanket
// same-value ban.
func TestFansubGroupKuerzelUniqueness_SameGroupOwnAliasIsNotAConflict(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")

	_, err := repo.CreateAlias(ctx, groupAID, models.FansubAliasCreateInput{
		Alias:           "BDnP",
		NormalizedAlias: "bdnp",
	})
	require.NoError(t, err)

	kuerzelA := "BDnP"
	updated, err := repo.UpdateGroup(ctx, groupAID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelA},
	})
	require.NoError(t, err)
	require.NotNil(t, updated.Kuerzel)
	require.Equal(t, "BDnP", *updated.Kuerzel)
}
