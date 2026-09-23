package handlers

// enrichEpisodeImportPreviewFansubData wires Plan 01's hardened filename parser
// (importutil.DeriveReleaseVersion, already consumed for FansubGroupName by
// buildEpisodeImportPreview) and Plan 02's batch-matching repository into the
// actual import preview response (Plan 05, D-08/D-09):
//   - auto-selects a fansub group for any row whose filename-derived kürzel
//     exactly matches an existing alias/name/slug, surfacing the match origin
//     for display,
//   - offers up to 3 fuzzy "did you mean" suggestions when nothing matches
//     exactly, never auto-applying them (D-03/D-12),
//   - pre-fills a detected v2/v3/v4 release version without ever overwriting
//     an already-set value.
//
// Deliberately kept out of admin_episode_import.go (already at the file-size
// ceiling) so that file only gains the single call-site line wiring this in.

import (
	"context"

	"team4s.v3/backend/internal/importutil"
	"team4s.v3/backend/internal/models"
)

// fansubGroupMatchResolver is the narrow seam this function needs from
// *repository.EpisodeImportRepository (Plan 02's ResolveFansubGroupMatches/
// SuggestSimilarFansubGroups), kept as its own interface so unit tests can
// substitute a hand-rolled fake without a database.
type fansubGroupMatchResolver interface {
	ResolveFansubGroupMatches(ctx context.Context, candidates []string) ([]models.FansubGroupMatch, error)
	SuggestSimilarFansubGroups(ctx context.Context, candidate string) ([]models.FansubGroupSuggestion, error)
}

// enrichEpisodeImportPreviewFansubData mutates and returns mappings in place.
// stringPtr (a plain non-trimming pointer helper for known-non-empty
// literals such as "detected") already exists in group_assets_jellyfin.go
// and is reused here rather than duplicated.
// matchRepo may be nil-safe-called only when non-nil; callers (PreviewEpisodeImport)
// always pass a non-nil h.episodeImportRepo.
func enrichEpisodeImportPreviewFansubData(ctx context.Context, matchRepo fansubGroupMatchResolver, mappings []models.EpisodeImportMappingRow) []models.EpisodeImportMappingRow {
	// Step 1: release-version detection, never overwriting an explicit value.
	for i := range mappings {
		row := &mappings[i]
		if row.ReleaseVersion == nil && row.FileName != "" {
			if version, detected := importutil.DeriveReleaseVersion(row.FileName); detected {
				row.ReleaseVersion = stringPtr(version)
				row.ReleaseVersionSource = stringPtr("detected")
			}
		}
	}

	// Step 2: collect distinct non-empty candidate group names for exactly
	// one batch-match query, regardless of row count (D-08 constant-query
	// budget). FansubGroupName is already populated by the existing,
	// Plan-01-hardened DeriveFansubGroupName call inside
	// buildEpisodeImportPreview -- not re-derived here.
	seenCandidates := make(map[string]bool)
	candidates := make([]string, 0, len(mappings))
	for _, row := range mappings {
		if row.FansubGroupName == nil {
			continue
		}
		name := *row.FansubGroupName
		if name == "" || seenCandidates[name] {
			continue
		}
		seenCandidates[name] = true
		candidates = append(candidates, name)
	}

	matchByCandidate := make(map[string]models.FansubGroupMatch)
	if len(candidates) > 0 {
		matches, err := matchRepo.ResolveFansubGroupMatches(ctx, candidates)
		if err == nil {
			for _, match := range matches {
				matchByCandidate[match.RawCandidate] = match
			}
		}
	}

	// Step 3/4: apply exact matches or collect bounded per-row suggestions.
	for i := range mappings {
		row := &mappings[i]
		if row.FansubGroupName == nil || *row.FansubGroupName == "" {
			continue
		}
		// Never silently overwrite an operator-confirmed row.
		if row.Status == models.EpisodeImportMappingStatusConfirmed {
			continue
		}
		name := *row.FansubGroupName

		if match, ok := matchByCandidate[name]; ok {
			groupID := match.GroupID
			row.FansubGroupID = &groupID
			row.FansubGroups = []models.SelectedFansubGroupInput{{ID: &groupID}}
			row.FansubGroupMatchOrigin = &models.EpisodeImportFansubGroupMatchOrigin{
				Raw:        name,
				MatchedVia: match.MatchedVia,
				GroupID:    match.GroupID,
				GroupName:  match.GroupName,
				AliasID:    match.MatchedAliasID,
			}
			continue
		}

		suggestions, err := matchRepo.SuggestSimilarFansubGroups(ctx, name)
		if err != nil || len(suggestions) == 0 {
			continue
		}
		mapped := make([]models.EpisodeImportFansubGroupSuggestion, 0, len(suggestions))
		for _, suggestion := range suggestions {
			mapped = append(mapped, models.EpisodeImportFansubGroupSuggestion{
				ID:   suggestion.GroupID,
				Name: suggestion.GroupName,
				Slug: suggestion.GroupSlug,
			})
		}
		row.FansubGroupSuggestions = mapped
	}

	return mappings
}
