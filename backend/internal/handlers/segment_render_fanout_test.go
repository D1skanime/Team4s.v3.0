package handlers

import (
	"context"
	"reflect"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// fakeAssignmentOverrideRepo implementiert nur die zwei Methoden, die
// nonOverriddenSegmentAssignments benoetigt -- der Rest der adminThemeRepository-Schnittstelle
// bleibt bewusst ungesetzt (nil-embedded), da diese Tests ihn nicht aufrufen.
type fakeAssignmentOverrideRepo struct {
	adminThemeRepository

	assignedIDs []int64
	overridden  map[int64]bool
}

func (f *fakeAssignmentOverrideRepo) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error) {
	return f.assignedIDs, nil
}

func (f *fakeAssignmentOverrideRepo) GetThemeSegmentEpisodeOverride(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.AdminThemeSegmentEpisodeOverride, error) {
	if f.overridden[releaseVersionID] {
		return &models.AdminThemeSegmentEpisodeOverride{ThemeSegmentID: segmentID, ReleaseVersionID: releaseVersionID}, nil
	}
	return nil, repository.ErrNotFound
}

// TestFilterAssignmentsWithoutOverrideExcludesOverriddenIDs beweist explizit, dass eine
// ueberschriebene Release-Version VOM Fan-Out ausgenommen wird (Plan 117-04 Task 3
// Akzeptanzkriterium), nicht nur, dass nicht-ueberschriebene invalidiert werden.
func TestFilterAssignmentsWithoutOverrideExcludesOverriddenIDs(t *testing.T) {
	assigned := []int64{101, 102, 103}
	overridden := map[int64]bool{102: true}

	got := filterAssignmentsWithoutOverride(assigned, overridden)
	want := []int64{101, 103}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected exactly the two non-overridden IDs %v, got %v", want, got)
	}
}

func TestFilterAssignmentsWithoutOverrideNoOverridesReturnsAllIDs(t *testing.T) {
	assigned := []int64{1, 2, 3}
	got := filterAssignmentsWithoutOverride(assigned, map[int64]bool{})
	if !reflect.DeepEqual(got, assigned) {
		t.Fatalf("expected all IDs unchanged, got %v", got)
	}
}

// TestNonOverriddenSegmentAssignmentsExcludesOverriddenReleaseVersion verifiziert den
// DB-abstrahierten Aufrufer von filterAssignmentsWithoutOverride: drei Zuweisungen, eine mit
// aktivem Override -> liefert genau zwei IDs zurueck (D-01/D-03, Plan 117-04 Task 3).
func TestNonOverriddenSegmentAssignmentsExcludesOverriddenReleaseVersion(t *testing.T) {
	repoStub := &fakeAssignmentOverrideRepo{
		assignedIDs: []int64{101, 102, 103},
		overridden:  map[int64]bool{102: true},
	}

	got, err := nonOverriddenSegmentAssignments(context.Background(), repoStub, 7)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []int64{101, 103}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected the overridden release version 102 to be excluded, got %v", got)
	}
}
