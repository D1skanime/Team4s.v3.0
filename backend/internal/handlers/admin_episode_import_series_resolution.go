package handlers

// This file holds the Jellyfin series-by-folder-path resolution concern for
// the episode import pipeline: given an anime's known titles and folder path,
// it searches Jellyfin for a uniquely matching series when no series ID is
// already recorded. Deliberately kept out of admin_episode_import.go to stay
// under the project's 450-line file ceiling (CLAUDE.md D-04).

import (
	"context"
	"strings"
)

func extractAniSearchIDFromSourceLinks(sourceLinks []string) string {
	for _, source := range sourceLinks {
		if anisearchID := extractAniSearchSourceID(&source); anisearchID != "" {
			return anisearchID
		}
	}
	return ""
}

func extractJellyfinSeriesIDFromSourceLinks(sourceLinks []string) string {
	for _, source := range sourceLinks {
		if jellyfinID := extractJellyfinSourceID(&source); jellyfinID != "" {
			return jellyfinID
		}
	}
	return ""
}

func (h *AdminContentHandler) resolveEpisodeImportSeriesByFolderPath(
	ctx context.Context,
	animeTitles []string,
	folderPath *string,
) (*jellyfinSeriesItem, error) {
	normalizedFolderPath := normalizeJellyfinPath(folderPath)
	if normalizedFolderPath == "" {
		return nil, nil
	}

	lookupTerms := make([]string, 0, len(animeTitles)+1)
	lookupTerms = appendUniqueJellyfinLookupTerms(lookupTerms, animeTitles...)
	if titleSeed := buildJellyfinFolderNameTitleSeed(folderPath); titleSeed != nil {
		lookupTerms = appendUniqueJellyfinLookupTerms(lookupTerms, *titleSeed)
	}
	if len(lookupTerms) == 0 {
		return nil, nil
	}

	candidateByID := make(map[string]jellyfinSeriesItem, len(lookupTerms))
	for _, term := range lookupTerms {
		items, err := h.searchJellyfinSeries(ctx, term, 10)
		if err != nil {
			return nil, err
		}
		for _, item := range findJellyfinSeriesMatchesByPath(items, normalizedFolderPath) {
			candidateByID[strings.TrimSpace(item.ID)] = item
		}
	}

	if len(candidateByID) != 1 {
		return nil, nil
	}
	for _, item := range candidateByID {
		return &item, nil
	}
	return nil, nil
}

func appendUniqueJellyfinLookupTerms(existing []string, values ...string) []string {
	seen := make(map[string]struct{}, len(existing)+len(values))
	for _, value := range existing {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "" {
			continue
		}
		seen[normalized] = struct{}{}
	}

	result := existing
	for _, value := range values {
		for _, candidate := range expandJellyfinLookupTerms(value) {
			normalized := strings.ToLower(candidate)
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			result = append(result, candidate)
		}
	}
	return result
}

func expandJellyfinLookupTerms(value string) []string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	candidates := []string{trimmed}
	tokens := strings.FieldsFunc(trimmed, func(r rune) bool {
		return !(r >= '0' && r <= '9' || r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z')
	})
	if len(tokens) > 1 {
		candidates = append(candidates, tokens[0])

		var compact strings.Builder
		for _, token := range tokens {
			compact.WriteString(token)
		}
		if compact.Len() > 0 {
			candidates = append(candidates, compact.String())
		}
	}

	result := make([]string, 0, len(candidates))
	seen := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		normalized := strings.ToLower(candidate)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, candidate)
	}
	return result
}

func findJellyfinSeriesMatchesByPath(items []jellyfinSeriesItem, normalizedFolderPath string) []jellyfinSeriesItem {
	if normalizedFolderPath == "" {
		return []jellyfinSeriesItem{}
	}

	matches := make([]jellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		itemPath := normalizeJellyfinPath(normalizeNullableStringPtr(item.Path))
		if itemPath == "" || itemPath != normalizedFolderPath {
			continue
		}
		matches = append(matches, item)
	}
	return matches
}
