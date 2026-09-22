package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// tmdbLookupResult beschreibt den ersten TMDB-Treffer (TV-Serie oder Film) für einen Suchbegriff.
type tmdbLookupResult struct {
	MediaType string // "tv" oder "movie"
	ID        int64
}

// lookupTMDBTVOrMovie sucht zuerst bei TMDB /search/tv, dann (falls kein Treffer) bei
// /search/movie. Movie-Format-Anime wie ".hack//G.U. Trilogy" werden bei TMDB ausschließlich
// als Film gelistet und liefern bei /search/tv 0 Treffer -- die Filmsuche ist deshalb ein
// notwendiger zweiter Schritt, kein optionaler Fallback. Wird sowohl von
// TMDBAssetSearchProvider als auch von FanartTVAssetSearchProvider verwendet.
func lookupTMDBTVOrMovie(ctx context.Context, httpClient *http.Client, baseURL, apiKey, query string) (tmdbLookupResult, bool, error) {
	tvID, err := tmdbSearchFirstID(ctx, httpClient, baseURL, apiKey, "/search/tv", query)
	if err != nil {
		return tmdbLookupResult{}, false, err
	}
	if tvID != 0 {
		return tmdbLookupResult{MediaType: "tv", ID: tvID}, true, nil
	}

	movieID, err := tmdbSearchFirstID(ctx, httpClient, baseURL, apiKey, "/search/movie", query)
	if err != nil {
		return tmdbLookupResult{}, false, err
	}
	if movieID != 0 {
		return tmdbLookupResult{MediaType: "movie", ID: movieID}, true, nil
	}

	return tmdbLookupResult{}, false, nil
}

// tmdbSearchFirstID ruft einen TMDB-Suchendpunkt (z. B. /search/tv oder /search/movie) auf und
// liefert die ID des ersten Treffers zurück, oder 0 wenn kein Treffer existiert. Beide
// Endpunkte liefern eine identische {results:[{id}]}-Antwortstruktur (live verifiziert).
func tmdbSearchFirstID(ctx context.Context, httpClient *http.Client, baseURL, apiKey, path, query string) (int64, error) {
	searchURL, err := url.Parse(baseURL + path)
	if err != nil {
		return 0, fmt.Errorf("parse tmdb search url: %w", err)
	}
	qv := url.Values{}
	qv.Set("query", strings.TrimSpace(query))
	qv.Set("page", "1")
	searchURL.RawQuery = qv.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL.String(), nil)
	if err != nil {
		return 0, fmt.Errorf("create tmdb search request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("call tmdb search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return 0, fmt.Errorf("tmdb search returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("read tmdb search response: %w", err)
	}

	var payload struct {
		Results []struct {
			ID int64 `json:"id"`
		} `json:"results"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return 0, fmt.Errorf("decode tmdb search response: %w", err)
	}

	if len(payload.Results) == 0 {
		return 0, nil
	}
	return payload.Results[0].ID, nil
}
