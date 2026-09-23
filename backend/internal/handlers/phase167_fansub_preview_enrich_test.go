package handlers

// Behavioral unit tests for enrichEpisodeImportPreviewFansubData (Plan 167-05,
// D-08/D-09). No gin/httptest needed -- the function under test takes a plain
// narrow interface (fansubGroupMatchResolver) and a plain slice, so a
// hand-rolled fake resolver with call counters (mirroring
// fakeProjectResolverRepo in fansub_project_resolver_handler_test.go) is
// sufficient to prove exact-match application, suggestion collection, the
// D-08 single-batch-call budget, release-version detection, and
// confirmed-row protection -- every assertion below calls the real function
// and inspects its return value, never source-inspecting the implementation.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/require"
)

// fakeFansubGroupMatchResolver implements fansubGroupMatchResolver without a
// database, recording call counts/arguments so tests can assert on
// invocation shape (D-08's single-batch-call budget) as well as results.
type fakeFansubGroupMatchResolver struct {
	matches           []models.FansubGroupMatch
	matchErr          error
	suggestionsByName map[string][]models.FansubGroupSuggestion
	suggestionsErr    error

	resolveCalls      int
	resolveCandidates [][]string
	suggestCalls      int
	suggestedFor      []string
}

func (f *fakeFansubGroupMatchResolver) ResolveFansubGroupMatches(_ context.Context, candidates []string) ([]models.FansubGroupMatch, error) {
	f.resolveCalls++
	f.resolveCandidates = append(f.resolveCandidates, candidates)
	if f.matchErr != nil {
		return nil, f.matchErr
	}
	return f.matches, nil
}

func (f *fakeFansubGroupMatchResolver) SuggestSimilarFansubGroups(_ context.Context, candidate string) ([]models.FansubGroupSuggestion, error) {
	f.suggestCalls++
	f.suggestedFor = append(f.suggestedFor, candidate)
	if f.suggestionsErr != nil {
		return nil, f.suggestionsErr
	}
	return f.suggestionsByName[candidate], nil
}

func int64PtrForTest(v int64) *int64 { return &v }

func TestEnrichEpisodeImportPreviewFansubData(t *testing.T) {
	ctx := context.Background()

	t.Run("exact alias match auto-selects group and sets origin", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{
			matches: []models.FansubGroupMatch{
				{
					RawCandidate:   "BDnP",
					GroupID:        7,
					GroupName:      "Bloody-Shadow",
					MatchedVia:     "alias",
					MatchedAliasID: int64PtrForTest(42),
				},
			},
		}
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FansubGroupName: strPtr("BDnP"), Status: models.EpisodeImportMappingStatusSuggested},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.NotNil(t, row.FansubGroupID)
		require.Equal(t, int64(7), *row.FansubGroupID)
		require.Len(t, row.FansubGroups, 1)
		require.NotNil(t, row.FansubGroups[0].ID)
		require.Equal(t, int64(7), *row.FansubGroups[0].ID)
		require.NotNil(t, row.FansubGroupMatchOrigin)
		require.Equal(t, "alias", row.FansubGroupMatchOrigin.MatchedVia)
		require.Equal(t, "Bloody-Shadow", row.FansubGroupMatchOrigin.GroupName)
		require.NotNil(t, row.FansubGroupMatchOrigin.AliasID)
		require.Equal(t, int64(42), *row.FansubGroupMatchOrigin.AliasID)
	})

	t.Run("no exact match falls back to bounded suggestions, never auto-applied", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{
			matches: nil,
			suggestionsByName: map[string][]models.FansubGroupSuggestion{
				"Unknown": {
					{GroupID: 1, GroupName: "First-Subs", GroupSlug: "first-subs"},
					{GroupID: 2, GroupName: "Second-Subs", GroupSlug: "second-subs"},
				},
			},
		}
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FansubGroupName: strPtr("Unknown"), Status: models.EpisodeImportMappingStatusSuggested},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.Nil(t, row.FansubGroupID)
		require.Nil(t, row.FansubGroupMatchOrigin)
		require.Len(t, row.FansubGroupSuggestions, 2)
		require.Equal(t, "First-Subs", row.FansubGroupSuggestions[0].Name)
		require.Equal(t, "Second-Subs", row.FansubGroupSuggestions[1].Name)
	})

	t.Run("empty candidate never triggers a suggestion query and sets nothing", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{}
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FansubGroupName: strPtr(""), Status: models.EpisodeImportMappingStatusSuggested},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.Nil(t, row.FansubGroupID)
		require.Nil(t, row.FansubGroupMatchOrigin)
		require.Nil(t, row.FansubGroupSuggestions)
		require.Equal(t, 0, fake.suggestCalls, "empty candidate must never trigger a wasted SuggestSimilarFansubGroups query")
	})

	t.Run("detects v3 release version when none is set", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{}
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FileName: "[GK]Some-Show - 01(720p)[C281B950]v3.mkv"},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.NotNil(t, row.ReleaseVersion)
		require.Equal(t, "v3", *row.ReleaseVersion)
		require.NotNil(t, row.ReleaseVersionSource)
		require.Equal(t, "detected", *row.ReleaseVersionSource)
	})

	t.Run("never overwrites an already-set release version", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{}
		mappings := []models.EpisodeImportMappingRow{
			{
				MediaItemID:    "m1",
				FileName:       "[GK]Some-Show - 01(720p)[C281B950]v3.mkv",
				ReleaseVersion: strPtr("v9-custom"),
			},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.NotNil(t, row.ReleaseVersion)
		require.Equal(t, "v9-custom", *row.ReleaseVersion)
		require.Nil(t, row.ReleaseVersionSource)
	})

	t.Run("resolves matches for the whole mapping slice in exactly one batch call", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{
			matches: []models.FansubGroupMatch{
				{RawCandidate: "BDnP", GroupID: 7, GroupName: "Bloody-Shadow", MatchedVia: "alias"},
			},
		}
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FansubGroupName: strPtr("BDnP"), Status: models.EpisodeImportMappingStatusSuggested},
			{MediaItemID: "m2", FansubGroupName: strPtr("BDnP"), Status: models.EpisodeImportMappingStatusSuggested},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Equal(t, 1, fake.resolveCalls, "D-08: ResolveFansubGroupMatches must be called exactly once regardless of row count")
		require.Len(t, fake.resolveCandidates, 1)
		require.Len(t, fake.resolveCandidates[0], 1, "duplicate candidate names must be de-duplicated before the batch call")
		require.NotNil(t, result[0].FansubGroupID)
		require.NotNil(t, result[1].FansubGroupID)
		require.Equal(t, int64(7), *result[0].FansubGroupID)
		require.Equal(t, int64(7), *result[1].FansubGroupID)
	})

	t.Run("never overwrites a confirmed row even if its group name would resolve differently", func(t *testing.T) {
		fake := &fakeFansubGroupMatchResolver{
			matches: []models.FansubGroupMatch{
				{RawCandidate: "SomethingElse", GroupID: 5, GroupName: "Other-Group", MatchedVia: "name"},
			},
		}
		existingGroupID := int64(99)
		mappings := []models.EpisodeImportMappingRow{
			{
				MediaItemID:     "m1",
				FansubGroupName: strPtr("SomethingElse"),
				FansubGroupID:   &existingGroupID,
				Status:          models.EpisodeImportMappingStatusConfirmed,
			},
		}

		result := enrichEpisodeImportPreviewFansubData(ctx, fake, mappings)

		require.Len(t, result, 1)
		row := result[0]
		require.NotNil(t, row.FansubGroupID)
		require.Equal(t, int64(99), *row.FansubGroupID, "a confirmed row's existing group selection must never be silently overwritten")
		require.Nil(t, row.FansubGroupMatchOrigin)
	})

	t.Run("WR-04: nil matchRepo returns mappings unchanged instead of panicking", func(t *testing.T) {
		mappings := []models.EpisodeImportMappingRow{
			{MediaItemID: "m1", FansubGroupName: strPtr("BDnP"), Status: models.EpisodeImportMappingStatusSuggested},
		}

		require.NotPanics(t, func() {
			result := enrichEpisodeImportPreviewFansubData(ctx, nil, mappings)
			require.Len(t, result, 1)
			require.Nil(t, result[0].FansubGroupID)
			require.Nil(t, result[0].FansubGroupMatchOrigin)
		})
	})
}
