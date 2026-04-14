package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// fetchJellyfinJSON sendet eine GET-Anfrage an die Jellyfin-API und deserialisiert die JSON-Antwort in das übergebene Zielobjekt.
func (h *AnimeHandler) fetchJellyfinJSON(ctx context.Context, apiPath string, query url.Values, target any) (int, error) {
	targetURL, err := h.buildJellyfinURL(apiPath, query)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
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

// fetchJellyfinStatus sendet eine GET-Anfrage an die Jellyfin-API und gibt nur den HTTP-Statuscode zurück, ohne den Body zu verarbeiten.
func (h *AnimeHandler) fetchJellyfinStatus(ctx context.Context, apiPath string, query url.Values) (int, error) {
	targetURL, err := h.buildJellyfinURL(apiPath, query)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return 0, fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return resp.StatusCode, fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}
	return resp.StatusCode, nil
}

// buildJellyfinURL baut die vollständige Jellyfin-API-URL aus Basis-URL, Pfad und Query-Parametern zusammen und fügt den API-Schlüssel hinzu.
func (h *AnimeHandler) buildJellyfinURL(apiPath string, query url.Values) (string, error) {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" {
		return "", errors.New("jellyfin base url missing")
	}

	apiKey := strings.TrimSpace(h.jellyfinAPIKey)
	if apiKey == "" {
		return "", errors.New("jellyfin api key missing")
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse jellyfin base url: %w", err)
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

	return parsedBase.String(), nil
}
