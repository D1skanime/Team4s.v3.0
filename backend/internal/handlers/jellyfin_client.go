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

	"team4s.v3/backend/internal/jellyfin"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

// Jellyfin API response types
// Series-intake response types and fetchers live in jellyfin_client_series.go.

// jellyfinEpisodeListResponse enthält die Jellyfin-API-Antwort für Episodenlisten.
type jellyfinEpisodeListResponse struct {
	Items            []jellyfinEpisodeItem `json:"Items"`
	TotalRecordCount *int                  `json:"TotalRecordCount"`
}

// jellyfinEpisodeItem repräsentiert eine einzelne Episode aus der Jellyfin-API.
type jellyfinEpisodeItem struct {
	Chapters          []jellyfinChapter     `json:"Chapters"`
	ID                string                `json:"Id"`
	Type              string                `json:"Type"`
	SeriesID          string                `json:"SeriesId"`
	ParentID          string                `json:"ParentId"`
	Name              string                `json:"Name"`
	Path              string                `json:"Path"`
	IndexNumber       *int                  `json:"IndexNumber"`
	ParentIndexNumber *int                  `json:"ParentIndexNumber"`
	PremiereDate      *string               `json:"PremiereDate"`
	MediaStreams      []jellyfinMediaStream `json:"MediaStreams"`
	MediaSources      []jellyfinMediaSource `json:"MediaSources"`
	RunTimeTicks      *int64                `json:"RunTimeTicks"`
}

// jellyfinMediaSource repräsentiert eine Media-Source eines Jellyfin-Items. Die Id wird fuer den
// Subtitle-Download-Pfad (/Videos/{itemId}/{mediaSourceId}/Subtitles/...) benoetigt und ist nicht
// zwangslaeufig gleich der Item-Id (Multi-Version-Items).
type jellyfinChapter struct {
	Name               *string `json:"Name"`
	StartPositionTicks *int64  `json:"StartPositionTicks"`
}

type jellyfinMediaSource struct {
	Size                    *int64 `json:"Size"`
	ID                      string `json:"Id"`
	Path                    string `json:"Path"`
	Container               string `json:"Container"`
	RunTimeTicks            *int64 `json:"RunTimeTicks"`
	DefaultAudioStreamIndex *int32 `json:"DefaultAudioStreamIndex"`
	// nil means omitted/null; an explicitly empty array is complete.
	MediaStreams []jellyfinMediaStream `json:"MediaStreams"`
}

// jellyfinMediaStream repräsentiert einen Medien-Stream (Video, Audio, Untertitel) innerhalb einer Jellyfin-Episode.
type jellyfinMediaStream struct {
	Index        int32  `json:"Index"`
	Type         string `json:"Type"`
	Codec        string `json:"Codec"`
	Height       *int   `json:"Height"`
	IsDefault    bool   `json:"IsDefault"`
	IsForced     bool   `json:"IsForced"`
	Language     string `json:"Language"`
	DisplayTitle string `json:"DisplayTitle"`
}

// UnmarshalJSON keeps an absent/null stream index unusable, while preserving
// a real index zero and existing explicitly constructed stream DTOs.
func (s *jellyfinMediaStream) UnmarshalJSON(data []byte) error {
	type streamAlias jellyfinMediaStream
	decoded := streamAlias{Index: -1}
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*s = jellyfinMediaStream(decoded)
	return nil
}

// listJellyfinEpisodes fetches all episodes for a series.
func (h *AdminContentHandler) listJellyfinEpisodes(
	ctx context.Context,
	seriesID string,
) ([]jellyfinEpisodeItem, error) {
	values := url.Values{"Fields": {jellyfinSourceFields}, "EnableUserData": {"false"}, "EnableTotalRecordCount": {"true"}}
	items := make([]jellyfinEpisodeItem, 0)
	seen := make(map[string]bool)
	var expectedTotal *int
	for {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if len(items) > 0 {
			values.Set("StartIndex", strconv.Itoa(len(items)))
		}
		var payload jellyfinEpisodeListResponse
		if _, err := h.fetchJellyfinJSON(ctx, fmt.Sprintf("/Shows/%s/Episodes", url.PathEscape(seriesID)), values, &payload); err != nil {
			return nil, err
		}
		if expectedTotal != nil && (payload.TotalRecordCount == nil || *payload.TotalRecordCount != *expectedTotal) {
			return nil, &jellyfinSourceBatchError{Kind: "incomplete"}
		}
		if payload.TotalRecordCount != nil {
			total := *payload.TotalRecordCount
			if total < 0 {
				return nil, &jellyfinSourceBatchError{Kind: "incomplete"}
			}
			expectedTotal = &total
		}
		for _, item := range payload.Items {
			id := strings.TrimSpace(item.ID)
			if id == "" {
				return nil, &jellyfinSourceBatchError{Kind: "missing"}
			}
			if seen[id] {
				return nil, &jellyfinSourceBatchError{Kind: "duplicate", ItemIDs: []string{id}}
			}
			seen[id] = true
			item.ID = id
			items = append(items, item)
		}
		if expectedTotal == nil {
			return items, nil
		}
		if len(items) > *expectedTotal {
			return nil, &jellyfinSourceBatchError{Kind: "incomplete"}
		}
		if len(items) == *expectedTotal {
			return items, nil
		}
		if len(payload.Items) == 0 {
			return nil, &jellyfinSourceBatchError{Kind: "incomplete"}
		}
	}

}

// getJellyfinEpisodeDurationSeconds fetches the runtime for one Jellyfin episode item.
func (h *AdminContentHandler) getJellyfinEpisodeDurationSeconds(
	ctx context.Context,
	itemID string,
) (*int32, error) {
	return h.getJellyfinSourceDurationSeconds(ctx, itemID, nil)
}

func jellyfinRuntimeTicksToSeconds(ticks *int64) *int32 {
	const maxInt32 = int64(2147483647)

	if ticks == nil || *ticks <= 0 {
		return nil
	}
	seconds := *ticks / 10_000_000
	if seconds <= 0 || seconds > maxInt32 {
		return nil
	}
	value := int32(seconds)
	return &value
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
	return fetchJellyfinJSON(ctx, h.httpClient, h.jellyfinBaseURL, h.jellyfinAPIKey, apiPath, query, target)
}

// fetchJellyfinJSON shares the existing decoder/status/transport lifecycle across
// metadata owners without creating a synthetic handler or a second auth client.
func fetchJellyfinJSON(ctx context.Context, client *http.Client, rawBaseURL, rawAPIKey, apiPath string, query url.Values, target any) (int, error) {
	startedAt := time.Now()

	baseURL := strings.TrimSpace(rawBaseURL)
	if baseURL == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin base url missing")
	}
	apiKey := strings.TrimSpace(rawAPIKey)
	if apiKey == "" {
		return http.StatusServiceUnavailable, errors.New("jellyfin api key missing")
	}

	targetURL, err := jellyfin.BuildURL(baseURL, apiPath, query)
	if err != nil {
		return 0, err
	}

	req, err := jellyfin.NewRequest(ctx, http.MethodGet, targetURL.String(), baseURL, rawAPIKey)
	if err != nil {
		return 0, fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := jellyfin.Do(client, req, baseURL)
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
