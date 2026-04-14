package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

// Jellyfin API response types

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

// jellyfinEpisodeListResponse enthält die Jellyfin-API-Antwort für Episodenlisten.
type jellyfinEpisodeListResponse struct {
	Items []jellyfinEpisodeItem `json:"Items"`
}

// jellyfinEpisodeItem repräsentiert eine einzelne Episode aus der Jellyfin-API.
type jellyfinEpisodeItem struct {
	ID                string                `json:"Id"`
	Name              string                `json:"Name"`
	Path              string                `json:"Path"`
	IndexNumber       *int                  `json:"IndexNumber"`
	ParentIndexNumber *int                  `json:"ParentIndexNumber"`
	PremiereDate      *string               `json:"PremiereDate"`
	MediaStreams      []jellyfinMediaStream `json:"MediaStreams"`
}

// jellyfinMediaStream repräsentiert einen Medien-Stream (Video, Audio, Untertitel) innerhalb einer Jellyfin-Episode.
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

func (h *AdminContentHandler) listJellyfinThemeVideoIDs(
	ctx context.Context,
	seriesID string,
) ([]string, error) {
	trimmedSeriesID := strings.TrimSpace(seriesID)
	if trimmedSeriesID == "" {
		return []string{}, nil
	}

	apiPath := fmt.Sprintf("/Items/%s/ThemeVideos", url.PathEscape(trimmedSeriesID))
	payload := animeJellyfinThemeVideosResponse{}
	if _, err := h.fetchJellyfinJSON(ctx, apiPath, url.Values{}, &payload); err != nil {
		return nil, err
	}

	seen := make(map[string]struct{}, len(payload.Items))
	result := make([]string, 0, len(payload.Items))
	for _, item := range payload.Items {
		trimmedID := strings.TrimSpace(item.ID)
		if trimmedID == "" {
			continue
		}
		if _, exists := seen[trimmedID]; exists {
			continue
		}
		seen[trimmedID] = struct{}{}
		result = append(result, trimmedID)
	}

	return result, nil
}

// fetchJellyfinJSON performs a GET request to the Jellyfin API.
func (h *AdminContentHandler) fetchJellyfinJSON(
	ctx context.Context,
	apiPath string,
	query url.Values,
	target any,
) (int, error) {
	startedAt := time.Now()

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
		log.Printf(
			"admin_content jellyfin_http: request failed (path=%s, elapsed_ms=%d, category=%s): %v",
			strings.TrimSpace(apiPath),
			time.Since(startedAt).Milliseconds(),
			classifyJellyfinTransportError(err),
			err,
		)
		return 0, fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf(
			"admin_content jellyfin_http: upstream status (path=%s, status=%d, elapsed_ms=%d)",
			strings.TrimSpace(apiPath),
			resp.StatusCode,
			time.Since(startedAt).Milliseconds(),
		)
		return resp.StatusCode, fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf(
			"admin_content jellyfin_http: read response failed (path=%s, status=%d, elapsed_ms=%d): %v",
			strings.TrimSpace(apiPath),
			resp.StatusCode,
			time.Since(startedAt).Milliseconds(),
			err,
		)
		return resp.StatusCode, fmt.Errorf("read jellyfin response: %w", err)
	}
	body = normalizeJellyfinResponseEncoding(body, resp.Header.Get("Content-Type"))
	if err := json.Unmarshal(body, target); err != nil {
		log.Printf(
			"admin_content jellyfin_http: decode response failed (path=%s, status=%d, elapsed_ms=%d): %v",
			strings.TrimSpace(apiPath),
			resp.StatusCode,
			time.Since(startedAt).Milliseconds(),
			err,
		)
		return resp.StatusCode, fmt.Errorf("decode jellyfin response: %w", err)
	}

	return resp.StatusCode, nil
}

// normalizeJellyfinResponseEncoding konvertiert einen nicht-UTF-8-kodierten Antwort-Body in UTF-8.
func normalizeJellyfinResponseEncoding(body []byte, contentType string) []byte {
	if len(body) == 0 || utf8.Valid(body) {
		return body
	}

	normalizedContentType := strings.ToLower(strings.TrimSpace(contentType))
	switch {
	case strings.Contains(normalizedContentType, "charset=windows-1252"),
		strings.Contains(normalizedContentType, "charset=cp1252"):
		if decoded, _, err := transform.Bytes(charmap.Windows1252.NewDecoder(), body); err == nil {
			return decoded
		}
	case strings.Contains(normalizedContentType, "charset=iso-8859-1"),
		strings.Contains(normalizedContentType, "charset=latin1"):
		if decoded, _, err := transform.Bytes(charmap.ISO8859_1.NewDecoder(), body); err == nil {
			return decoded
		}
	}

	if decoded, _, err := transform.Bytes(charmap.Windows1252.NewDecoder(), body); err == nil && utf8.Valid(decoded) {
		return decoded
	}

	if decoded, _, err := transform.Bytes(charmap.ISO8859_1.NewDecoder(), body); err == nil && utf8.Valid(decoded) {
		return decoded
	}

	return body
}

// classifyJellyfinTransportError kategorisiert einen Transportfehler (Timeout, Verbindungsfehler usw.).
func classifyJellyfinTransportError(err error) string {
	if err == nil {
		return "unknown"
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout"
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return "timeout"
	}

	normalized := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(normalized, "connection refused"),
		strings.Contains(normalized, "no such host"),
		strings.Contains(normalized, "network is unreachable"),
		strings.Contains(normalized, "connectex"):
		return "connectivity"
	default:
		return "transport"
	}
}
