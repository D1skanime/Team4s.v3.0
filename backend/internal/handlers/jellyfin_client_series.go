package handlers

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// jellyfinSeriesListResponse enthält die Jellyfin-API-Antwort für Seriensuchen.
type jellyfinSeriesListResponse struct {
	Items []jellyfinSeriesItem `json:"Items"`
}

// jellyfinSeriesItem repräsentiert eine einzelne Serie aus der Jellyfin-API.
type jellyfinSeriesItem struct {
	ID                string            `json:"Id"`
	Name              string            `json:"Name"`
	ProductionYear    *int              `json:"ProductionYear"`
	Overview          string            `json:"Overview"`
	Path              string            `json:"Path"`
	Genres            []string          `json:"Genres"`
	Tags              []string          `json:"Tags"`
	ProviderIDs       map[string]string `json:"ProviderIds"`
	ImageTags         map[string]string `json:"ImageTags"`
	BackdropImageTags []string          `json:"BackdropImageTags"`
}

// jellyfinSeriesDetailItem enthält detaillierte Metadaten einer einzelnen Serie aus der Jellyfin-API.
type jellyfinSeriesDetailItem struct {
	ID                string            `json:"Id"`
	Name              string            `json:"Name"`
	ProductionYear    *int              `json:"ProductionYear"`
	Overview          string            `json:"Overview"`
	Path              string            `json:"Path"`
	Genres            []string          `json:"Genres"`
	Tags              []string          `json:"Tags"`
	ProviderIDs       map[string]string `json:"ProviderIds"`
	ImageTags         map[string]string `json:"ImageTags"`
	BackdropImageTags []string          `json:"BackdropImageTags"`
}

// searchJellyfinSeries searches for series by title.
// When h.jellyfinAllowedLibraryIDs is set, one /Items request is made per library
// with ParentId filtering and results are deduplicated by item ID.
// When it is empty, a single global /Items request is made (unchanged behavior).
func (h *AdminContentHandler) searchJellyfinSeries(
	ctx context.Context,
	title string,
	limit int,
) ([]jellyfinSeriesItem, error) {
	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("SearchTerm", strings.TrimSpace(title))
	values.Set("Limit", strconv.Itoa(limit))
	values.Set("Fields", "Path,ProductionYear,Overview")

	allowedIDs := h.jellyfinAllowedLibraryIDs

	if len(allowedIDs) == 0 {
		// No filter: existing single global request.
		var payload jellyfinSeriesListResponse
		if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
			return nil, err
		}
		items := make([]jellyfinSeriesItem, 0, len(payload.Items))
		for _, item := range payload.Items {
			if strings.TrimSpace(item.ID) == "" {
				continue
			}
			items = append(items, item)
		}
		return items, nil
	}

	// Filtered: one request per allowed library ID, deduplicated by Jellyfin item ID.
	seen := make(map[string]struct{})
	var allItems []jellyfinSeriesItem
	for _, libraryID := range allowedIDs {
		libValues := url.Values{}
		for k, v := range values {
			libValues[k] = v
		}
		libValues.Set("ParentId", libraryID)
		var payload jellyfinSeriesListResponse
		if _, err := h.fetchJellyfinJSON(ctx, "/Items", libValues, &payload); err != nil {
			return nil, err
		}
		for _, item := range payload.Items {
			itemID := strings.TrimSpace(item.ID)
			if itemID == "" {
				continue
			}
			if _, exists := seen[itemID]; exists {
				continue
			}
			seen[itemID] = struct{}{}
			allItems = append(allItems, item)
		}
	}
	return allItems, nil
}

// getJellyfinSeriesByID fetches a single series by ID.
func (h *AdminContentHandler) getJellyfinSeriesByID(
	ctx context.Context,
	seriesID string,
) (*jellyfinSeriesItem, error) {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return nil, nil
	}

	values := url.Values{}
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("Ids", trimmedSeriesID)
	values.Set("Limit", "1")
	values.Set("Fields", "Path,ProductionYear,Overview")

	var payload jellyfinSeriesListResponse
	statusCode, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload)
	if statusCode == http.StatusNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(payload.Items) == 0 {
		return nil, nil
	}

	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) == trimmedSeriesID {
			return &item, nil
		}
	}

	return &payload.Items[0], nil
}

func (h *AdminContentHandler) getJellyfinSeriesIntakeDetail(
	ctx context.Context,
	seriesID string,
) (*jellyfinSeriesDetailItem, error) {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return nil, nil
	}

	values := url.Values{}
	values.Set("Ids", trimmedSeriesID)
	values.Set("IncludeItemTypes", "Series")
	values.Set("Recursive", "true")
	values.Set("Limit", "1")
	values.Set("Fields", "Path,ProductionYear,Overview,ProviderIds,Genres,Tags,ImageTags,BackdropImageTags")

	var payload jellyfinSeriesListResponse
	statusCode, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload)
	if statusCode == http.StatusNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(payload.Items) == 0 {
		return nil, nil
	}

	for _, item := range payload.Items {
		if strings.TrimSpace(item.ID) == trimmedSeriesID {
			return &jellyfinSeriesDetailItem{
				ID:                item.ID,
				Name:              item.Name,
				ProductionYear:    item.ProductionYear,
				Overview:          item.Overview,
				Path:              item.Path,
				Genres:            item.Genres,
				Tags:              item.Tags,
				ProviderIDs:       item.ProviderIDs,
				ImageTags:         item.ImageTags,
				BackdropImageTags: item.BackdropImageTags,
			}, nil
		}
	}

	item := payload.Items[0]
	return &jellyfinSeriesDetailItem{
		ID:                item.ID,
		Name:              item.Name,
		ProductionYear:    item.ProductionYear,
		Overview:          item.Overview,
		Path:              item.Path,
		Genres:            item.Genres,
		Tags:              item.Tags,
		ProviderIDs:       item.ProviderIDs,
		ImageTags:         item.ImageTags,
		BackdropImageTags: item.BackdropImageTags,
	}, nil
}
