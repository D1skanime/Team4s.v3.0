package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

// resolveJellyfinSeries finds the matching Jellyfin series for an anime.
func (h *AdminContentHandler) resolveJellyfinSeries(
	ctx context.Context,
	animeTitles []string,
	requestedSeriesID string,
) (*jellyfinSeriesItem, int, error) {
	if strings.TrimSpace(requestedSeriesID) != "" {
		item, err := h.getJellyfinSeriesByID(ctx, strings.TrimSpace(requestedSeriesID))
		if err != nil {
			return nil, http.StatusBadGateway, errors.New("jellyfin serie konnte nicht geladen werden")
		}
		if item == nil {
			return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
		}
		return item, http.StatusOK, nil
	}

	candidateByID := make(map[string]jellyfinSeriesItem, 8)

	for _, title := range animeTitles {
		items, err := h.searchJellyfinSeries(ctx, title, 10)
		if err != nil {
			return nil, http.StatusBadGateway, errors.New("jellyfin serien konnten nicht gesucht werden")
		}
		if len(items) == 0 {
			continue
		}

		exactMatches := findExactJellyfinSeriesMatches(items, title)
		if len(exactMatches) == 1 {
			return &exactMatches[0], http.StatusOK, nil
		}
		if len(exactMatches) > 0 {
			for _, item := range exactMatches {
				candidateByID[item.ID] = item
			}
			continue
		}

		if len(items) == 1 {
			return &items[0], http.StatusOK, nil
		}
		for _, item := range items {
			candidateByID[item.ID] = item
		}
	}

	if len(candidateByID) == 0 {
		return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
	}
	if len(candidateByID) > 1 {
		return nil, http.StatusConflict, errors.New("mehrere jellyfin serien gefunden, bitte jellyfin_series_id angeben")
	}

	for _, item := range candidateByID {
		return &item, http.StatusOK, nil
	}

	return nil, http.StatusNotFound, errors.New("jellyfin serie nicht gefunden")
}

// uniqueLookupTitles deduplicates and normalizes anime titles for search.
func uniqueLookupTitles(primary string, titleDE *string, titleEN *string) []string {
	values := []string{primary}
	if titleDE != nil {
		values = append(values, *titleDE)
	}
	if titleEN != nil {
		values = append(values, *titleEN)
	}

	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, raw := range values {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}

	return result
}

// jellyfinSeriesIDFromSource extracts Jellyfin series ID from anime source field.
func jellyfinSeriesIDFromSource(source *string) string {
	if source == nil {
		return ""
	}

	trimmed := strings.TrimSpace(*source)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	if !strings.HasPrefix(lower, "jellyfin:") {
		return ""
	}

	return strings.TrimSpace(trimmed[len("jellyfin:"):])
}

// findExactJellyfinSeriesMatches filters items by exact title match.
func findExactJellyfinSeriesMatches(items []jellyfinSeriesItem, title string) []jellyfinSeriesItem {
	normalizedTitle := normalizeJellyfinLookup(title)
	if normalizedTitle == "" {
		return []jellyfinSeriesItem{}
	}

	matches := make([]jellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		if normalizeJellyfinLookup(item.Name) != normalizedTitle {
			continue
		}
		matches = append(matches, item)
	}

	return matches
}

// normalizeJellyfinLookup normalizes a string for fuzzy comparison.
func normalizeJellyfinLookup(value string) string {
	raw := strings.ToLower(strings.TrimSpace(value))
	if raw == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(raw))
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		}
	}

	return builder.String()
}
