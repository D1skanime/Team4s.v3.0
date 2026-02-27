package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// Jellyfin API response types

type jellyfinSeriesListResponse struct {
	Items []jellyfinSeriesItem `json:"Items"`
}

type jellyfinSeriesItem struct {
	ID             string `json:"Id"`
	Name           string `json:"Name"`
	ProductionYear *int   `json:"ProductionYear"`
	Overview       string `json:"Overview"`
	Path           string `json:"Path"`
}

type jellyfinEpisodeListResponse struct {
	Items []jellyfinEpisodeItem `json:"Items"`
}

type jellyfinEpisodeItem struct {
	ID                string                `json:"Id"`
	Name              string                `json:"Name"`
	Path              string                `json:"Path"`
	IndexNumber       *int                  `json:"IndexNumber"`
	ParentIndexNumber *int                  `json:"ParentIndexNumber"`
	PremiereDate      *string               `json:"PremiereDate"`
	MediaStreams      []jellyfinMediaStream `json:"MediaStreams"`
}

type jellyfinMediaStream struct {
	Type   string `json:"Type"`
	Height *int   `json:"Height"`
}

// searchJellyfinSeries searches for series by title.
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

// listJellyfinEpisodes fetches all episodes for a series.
func (h *AdminContentHandler) listJellyfinEpisodes(
	ctx context.Context,
	seriesID string,
) ([]jellyfinEpisodeItem, error) {
	values := url.Values{}
	values.Set("Fields", "MediaStreams,Path")
	values.Set("EnableUserData", "false")

	var payload jellyfinEpisodeListResponse
	if _, err := h.fetchJellyfinJSON(ctx, fmt.Sprintf("/Shows/%s/Episodes", url.PathEscape(seriesID)), values, &payload); err != nil {
		return nil, err
	}

	return payload.Items, nil
}

// fetchJellyfinJSON performs a GET request to the Jellyfin API.
func (h *AdminContentHandler) fetchJellyfinJSON(
	ctx context.Context,
	apiPath string,
	query url.Values,
	target any,
) (int, error) {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin base url missing")
	}
	apiKey := strings.TrimSpace(h.jellyfinAPIKey)
	if apiKey == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin api key missing")
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return 0, fmt.Errorf("parse jellyfin base url: %w", err)
	}

	resolvedPath := strings.TrimPrefix(apiPath, "/")
	if strings.HasSuffix(parsedBase.Path, "/") {
		parsedBase.Path = strings.TrimSuffix(parsedBase.Path, "/")
	}
	parsedBase.Path = parsedBase.Path + "/" + resolvedPath

	values := url.Values{}
	for key, entries := range query {
		for _, value := range entries {
			values.Add(key, value)
		}
	}
	values.Set("api_key", apiKey)
	parsedBase.RawQuery = values.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedBase.String(), nil)
	if err != nil {
		return 0, fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return resp.StatusCode, fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, fmt.Errorf("read jellyfin response: %w", err)
	}
	if err := json.Unmarshal(body, target); err != nil {
		return resp.StatusCode, fmt.Errorf("decode jellyfin response: %w", err)
	}

	return resp.StatusCode, nil
}
