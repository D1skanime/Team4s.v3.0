package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

// TestFanartTVAssetSearchProvider_TVSeriesRegressionUsesTVDBPath proves that a TV-series match
// still resolves via TMDB search -> external_ids -> TVDB ID -> fanart.tv /tv/{tvdbID}, and never
// touches the fanart.tv /movies/ endpoint.
func TestFanartTVAssetSearchProvider_TVSeriesRegressionUsesTVDBPath(t *testing.T) {
	t.Parallel()

	var fanartMoviesCalls int
	tmdbMux := http.NewServeMux()
	tmdbMux.HandleFunc("/search/tv", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[{"id":555}]}`))
	})
	tmdbMux.HandleFunc("/tv/555/external_ids", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"tvdb_id":777}`))
	})
	tmdbFake := httptest.NewServer(tmdbMux)
	defer tmdbFake.Close()

	fanartMux := http.NewServeMux()
	fanartMux.HandleFunc("/tv/777", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"hdtvlogo":[{"id":"111","url":"https://assets.fanart.tv/fanart/tv-logo.png"}]}`))
	})
	fanartMux.HandleFunc("/movies/", func(w http.ResponseWriter, r *http.Request) {
		fanartMoviesCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{}`))
	})
	fanartFake := httptest.NewServer(fanartMux)
	defer fanartFake.Close()

	provider := &FanartTVAssetSearchProvider{
		apiKey:      "fkey",
		tmdbAPIKey:  "tkey",
		baseURL:     fanartFake.URL,
		tmdbBaseURL: tmdbFake.URL,
		httpClient:  http.DefaultClient,
	}

	candidates, err := provider.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "logo",
		Query:     "Some Series",
		Limit:     5,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly 1 candidate, got %#v", candidates)
	}
	if candidates[0].SourceURL == nil || !strings.Contains(*candidates[0].SourceURL, "/series/777") {
		t.Fatalf("expected source url to contain /series/777, got %#v", candidates[0].SourceURL)
	}

	if fanartMoviesCalls != 0 {
		t.Fatalf("expected fanart.tv /movies/ to never be called for a TV hit, got %d calls", fanartMoviesCalls)
	}
}

// TestFanartTVAssetSearchProvider_MovieHitUsesMoviesEndpointDirectly proves that a movie-only
// match (e.g. ".hack//G.U. Trilogy", TMDB movie id 26595) goes straight to the fanart.tv
// /movies/{tmdbMovieID} endpoint, skipping the TVDB resolution step entirely.
func TestFanartTVAssetSearchProvider_MovieHitUsesMoviesEndpointDirectly(t *testing.T) {
	t.Parallel()

	var externalIDsCalls int
	tmdbMux := http.NewServeMux()
	tmdbMux.HandleFunc("/search/tv", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[]}`))
	})
	tmdbMux.HandleFunc("/search/movie", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[{"id":26595}]}`))
	})
	tmdbMux.HandleFunc("/tv/26595/external_ids", func(w http.ResponseWriter, r *http.Request) {
		externalIDsCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"tvdb_id":0}`))
	})
	tmdbFake := httptest.NewServer(tmdbMux)
	defer tmdbFake.Close()

	var fanartTVCalls int
	fanartMux := http.NewServeMux()
	fanartMux.HandleFunc("/movies/26595", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"hdmovielogo":[{"id":"423538","lang":"en","likes":"2","url":"https://assets.fanart.tv/fanart/hackgu-trilogy.png"}],"imdb_id":"tt1164545","tmdb_id":"26595"}`))
	})
	fanartMux.HandleFunc("/tv/", func(w http.ResponseWriter, r *http.Request) {
		fanartTVCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{}`))
	})
	fanartFake := httptest.NewServer(fanartMux)
	defer fanartFake.Close()

	provider := &FanartTVAssetSearchProvider{
		apiKey:      "fkey",
		tmdbAPIKey:  "tkey",
		baseURL:     fanartFake.URL,
		tmdbBaseURL: tmdbFake.URL,
		httpClient:  http.DefaultClient,
	}

	candidates, err := provider.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "logo",
		Query:     ".hack//G.U. Trilogy",
		Limit:     5,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly 1 candidate, got %#v", candidates)
	}
	if candidates[0].ImageURL != "https://assets.fanart.tv/fanart/hackgu-trilogy.png" {
		t.Fatalf("expected fixture image url, got %q", candidates[0].ImageURL)
	}
	if candidates[0].SourceURL == nil || !strings.Contains(*candidates[0].SourceURL, "/movie/26595") {
		t.Fatalf("expected source url to contain /movie/26595, got %#v", candidates[0].SourceURL)
	}

	if fanartTVCalls != 0 {
		t.Fatalf("expected fanart.tv /tv/ to never be called for a movie hit, got %d calls", fanartTVCalls)
	}
	if externalIDsCalls != 0 {
		t.Fatalf("expected TMDB /tv/{id}/external_ids to never be called for a movie hit, got %d calls", externalIDsCalls)
	}
}
