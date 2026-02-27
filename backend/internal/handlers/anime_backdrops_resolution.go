package handlers

import (
	"context"
	"net/url"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
)

func (h *AnimeHandler) resolveJellyfinSeriesID(ctx context.Context, lookup *models.AnimeMediaLookup) (string, error) {
	terms := uniqueAnimeBackdropTerms(lookup)
	if len(terms) == 0 {
		return "", nil
	}

	fallbackID := ""
	for _, term := range terms {
		items, err := h.searchJellyfinSeries(ctx, term, 10)
		if err != nil {
			return "", err
		}
		if len(items) == 0 {
			continue
		}

		exactMatches := findExactAnimeJellyfinSeriesMatches(items, term)
		if len(exactMatches) == 1 {
			return strings.TrimSpace(exactMatches[0].ID), nil
		}
		if fallbackID == "" && len(items) == 1 {
			fallbackID = strings.TrimSpace(items[0].ID)
		}
		if fallbackID == "" && len(exactMatches) > 0 {
			fallbackID = strings.TrimSpace(exactMatches[0].ID)
		}
		if fallbackID == "" {
			fallbackID = strings.TrimSpace(items[0].ID)
		}
	}

	return fallbackID, nil
}

func uniqueAnimeBackdropTerms(lookup *models.AnimeMediaLookup) []string {
	if lookup == nil {
		return nil
	}

	baseTerms := uniqueLookupTitles(lookup.Title, lookup.TitleDE, lookup.TitleEN)
	folderTerm := folderLookupTerm(lookup.FolderName)
	if folderTerm == "" {
		return baseTerms
	}

	seen := make(map[string]struct{}, len(baseTerms)+1)
	for _, term := range baseTerms {
		seen[strings.ToLower(term)] = struct{}{}
	}
	if _, exists := seen[strings.ToLower(folderTerm)]; exists {
		return baseTerms
	}

	return append(baseTerms, folderTerm)
}

func folderLookupTerm(raw *string) string {
	if raw == nil {
		return ""
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return ""
	}

	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	normalized = strings.Trim(normalized, "/")
	if normalized == "" {
		return ""
	}

	segments := strings.Split(normalized, "/")
	last := strings.TrimSpace(segments[len(segments)-1])
	if last == "" {
		return ""
	}

	return last
}

func findExactAnimeJellyfinSeriesMatches(items []animeJellyfinSeriesItem, title string) []animeJellyfinSeriesItem {
	normalizedTitle := normalizeJellyfinLookup(title)
	if normalizedTitle == "" {
		return []animeJellyfinSeriesItem{}
	}

	matches := make([]animeJellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		if normalizeJellyfinLookup(item.Name) == normalizedTitle {
			matches = append(matches, item)
		}
	}

	return matches
}

func (h *AnimeHandler) searchJellyfinSeries(ctx context.Context, title string, limit int) ([]animeJellyfinSeriesItem, error) {
	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("SearchTerm", strings.TrimSpace(title))
	values.Set("Limit", strconv.Itoa(limit))

	var payload animeJellyfinSeriesListResponse
	if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
		return nil, err
	}

	items := make([]animeJellyfinSeriesItem, 0, len(payload.Items))
	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) != "" {
			items = append(items, item)
		}
	}

	return items, nil
}
