package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// Phase 176, Scope Addition 2 (Kürzel-Feld + Aliase-Umbenennung, Anlegeseite):
// real-Postgres proof that CreateGroup validates a non-empty Kürzel exactly
// like UpdateGroup -- cross-checked against every OTHER group's Kürzel AND
// Alias, naming the owning group via *repository.ConflictOwnerError -- and
// that an absent/empty Kürzel persists as NULL rather than an empty string.
// Reuses the Phase-167 fixture (same fansub_groups/fansub_group_aliases
// shape the existing Kürzel-conflict suite already exercises).

// TestFansubGroupCreateKuerzel_SetsFreshKuerzel proves CreateGroup persists a
// fresh, unique Kürzel and that GetGroupByID reflects it afterwards.
func TestFansubGroupCreateKuerzel_SetsFreshKuerzel(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	kuerzel := "BDnP"
	created, err := repo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:    "group-a",
		Name:    "Group A",
		Status:  "active",
		Kuerzel: &kuerzel,
	})
	require.NoError(t, err)
	require.NotNil(t, created.Kuerzel)
	require.Equal(t, "BDnP", *created.Kuerzel)

	reloaded, err := repo.GetGroupByID(ctx, created.ID)
	require.NoError(t, err)
	require.NotNil(t, reloaded.Kuerzel)
	require.Equal(t, "BDnP", *reloaded.Kuerzel)
}

// TestFansubGroupCreateKuerzel_EmptyKuerzelBecomesNull proves CreateGroup
// with a nil Kürzel persists NULL, not an empty string.
func TestFansubGroupCreateKuerzel_EmptyKuerzelBecomesNull(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	created, err := repo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "group-b",
		Name:   "Group B",
		Status: "active",
	})
	require.NoError(t, err)
	require.Nil(t, created.Kuerzel)

	reloaded, err := repo.GetGroupByID(ctx, created.ID)
	require.NoError(t, err)
	require.Nil(t, reloaded.Kuerzel)
}

// TestFansubGroupCreateKuerzel_ConflictsWithExistingKuerzel proves
// CreateGroup rejects a Kürzel (different casing) that another group already
// holds as its Kürzel, naming the owning group via *ConflictOwnerError, and
// that the rejected group is never inserted (no partial row created).
func TestFansubGroupCreateKuerzel_ConflictsWithExistingKuerzel(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	kuerzelA := "BDnP"
	_, err := repo.UpdateGroup(ctx, groupAID, models.FansubGroupPatchInput{
		Kuerzel: models.OptionalString{Set: true, Value: &kuerzelA},
	})
	require.NoError(t, err)

	kuerzelBDifferentCasing := "bdnp"
	_, err = repo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:    "group-b",
		Name:    "Group B",
		Status:  "active",
		Kuerzel: &kuerzelBDifferentCasing,
	})
	require.Error(t, err)

	var ownerErr *ConflictOwnerError
	require.True(t, errors.As(err, &ownerErr), "expected *ConflictOwnerError, got %T: %v", err, err)
	require.Equal(t, groupAID, ownerErr.OwnerGroupID)
	require.Equal(t, "Group A", ownerErr.OwnerGroupName)

	_, err = repo.GetGroupBySlug(ctx, "group-b")
	require.ErrorIs(t, err, ErrNotFound, "rejected create must not leave a partial row behind")
}

// TestFansubGroupCreateKuerzel_ConflictsWithExistingAlias proves CreateGroup
// rejects a Kürzel equal to another group's existing alias text, naming the
// owning group via *ConflictOwnerError.
func TestFansubGroupCreateKuerzel_ConflictsWithExistingAlias(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	_, err := repo.CreateAlias(ctx, groupAID, models.FansubAliasCreateInput{
		Alias:           "BDnP",
		NormalizedAlias: "bdnp",
	})
	require.NoError(t, err)

	kuerzelB := "BDnP"
	_, err = repo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:    "group-b",
		Name:    "Group B",
		Status:  "active",
		Kuerzel: &kuerzelB,
	})
	require.Error(t, err)

	var ownerErr *ConflictOwnerError
	require.True(t, errors.As(err, &ownerErr), "expected *ConflictOwnerError, got %T: %v", err, err)
	require.Equal(t, groupAID, ownerErr.OwnerGroupID)
	require.Equal(t, "Group A", ownerErr.OwnerGroupName)
}
