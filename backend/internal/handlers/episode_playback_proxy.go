package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
)

func (h *EpisodePlaybackHandler) buildEmbyStreamURL(sourceURL string) (string, error) {
	parsedSource, err := url.Parse(strings.TrimSpace(sourceURL))
	if err != nil {
		return "", fmt.Errorf("parse source url: %w", err)
	}

	itemID, err := extractEmbyItemID(parsedSource)
	if err != nil {
		return "", err
	}

	baseURL := strings.TrimSpace(h.embyStreamBaseURL)
	if baseURL == "" {
		baseURL = parsedSource.Scheme + "://" + parsedSource.Host
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse emby base url: %w", err)
	}

	streamPath := fmt.Sprintf(h.embyStreamPathTemplate, itemID)
	parsedBase.Path = path.Clean("/" + strings.TrimPrefix(streamPath, "/"))

	query := parsedBase.Query()
	query.Set("api_key", h.embyAPIKey)
	query.Set("static", "true")
	parsedBase.RawQuery = query.Encode()

	return parsedBase.String(), nil
}

func extractEmbyItemID(sourceURL *url.URL) (string, error) {
	if sourceURL == nil {
		return "", fmt.Errorf("source url missing")
	}

	if itemID := strings.TrimSpace(sourceURL.Query().Get("id")); itemID != "" {
		return itemID, nil
	}

	fragment := strings.TrimSpace(sourceURL.Fragment)
	if fragment != "" {
		trimmed := strings.TrimPrefix(fragment, "!")
		if !strings.HasPrefix(trimmed, "/") {
			trimmed = "/" + trimmed
		}
		parsedFragment, err := url.Parse(trimmed)
		if err == nil {
			if itemID := strings.TrimSpace(parsedFragment.Query().Get("id")); itemID != "" {
				return itemID, nil
			}
		}
	}

	parts := strings.Split(strings.Trim(sourceURL.Path, "/"), "/")
	for i := 0; i < len(parts)-1; i++ {
		if !strings.EqualFold(parts[i], "Videos") {
			continue
		}

		itemID := strings.TrimSpace(parts[i+1])
		if itemID != "" {
			return itemID, nil
		}
	}

	return "", fmt.Errorf("emby item id missing in source url")
}

func copyProxyHeaders(src http.Header, dst http.Header) {
	rangeHeader := strings.TrimSpace(src.Get("Range"))
	if rangeHeader != "" {
		dst.Set("Range", rangeHeader)
	}

	userAgent := strings.TrimSpace(src.Get("User-Agent"))
	if userAgent != "" {
		dst.Set("User-Agent", userAgent)
	}
}

func copyResponseHeaders(src http.Header, dst http.Header) {
	for _, key := range []string{
		"Content-Type",
		"Content-Length",
		"Content-Range",
		"Accept-Ranges",
		"Content-Disposition",
		"Cache-Control",
		"ETag",
		"Last-Modified",
	} {
		value := strings.TrimSpace(src.Get(key))
		if value != "" {
			dst.Set(key, value)
		}
	}
}

func firstNonEmpty(items []string) string {
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
