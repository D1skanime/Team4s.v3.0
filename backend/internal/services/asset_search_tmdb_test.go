package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

// TestTMDBAssetSearchProvider_FindsMovieOnlyResultsViaSearchMovie proves that a movie-format
// anime (e.g. ".hack//G.U. Trilogy", which TMDB lists ONLY as a movie) is found by falling back
// from /search/tv (0 results) to /search/movie, and that the resulting candidate points at the
// /movie/{id}/images endpoint.
func TestTMDBAssetSearchProvider_FindsMovieOnlyResultsViaSearchMovie(t *testing.T) {
	t.Parallel()

	var searchTVCalls, searchMovieCalls int
	mux := http.NewServeMux()
	mux.HandleFunc("/search/tv", func(w http.ResponseWriter, r *http.Request) {
		searchTVCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[]}`))
	})
	mux.HandleFunc("/search/movie", func(w http.ResponseWriter, r *http.Request) {
		searchMovieCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[{"id":26595}]}`))
	})
	mux.HandleFunc("/movie/26595/images", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"posters":[{"file_path":"/poster.jpg","width":2000,"height":3000}],"backdrops":[]}`))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	provider := &TMDBAssetSearchProvider{
		apiKey:     "test",
		baseURL:    server.URL,
		imageBase:  "https://image.tmdb.org/t/p",
		httpClient: server.Client(),
	}

	candidates, err := provider.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "cover",
		Query:     ".hack//G.U. Trilogy",
		Limit:     5,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly 1 candidate, got %#v", candidates)
	}
	if candidates[0].SourceURL == nil || !strings.Contains(*candidates[0].SourceURL, "/movie/26595") {
		t.Fatalf("expected source url to contain /movie/26595, got %#v", candidates[0].SourceURL)
	}
	if !strings.HasPrefix(candidates[0].ID, "tmdb-movie-26595-") {
		t.Fatalf("expected candidate id to start with tmdb-movie-26595-, got %q", candidates[0].ID)
	}

	if searchTVCalls != 1 {
		t.Fatalf("expected /search/tv to be called exactly once, got %d", searchTVCalls)
	}
	if searchMovieCalls != 1 {
		t.Fatalf("expected /search/movie to be called exactly once, got %d", searchMovieCalls)
	}
}

// TestTMDBAssetSearchProvider_TVSeriesRegressionSkipsSearchMovie proves that a TV-series match
// still works exactly as before, and does NOT trigger an unnecessary second /search/movie call.
func TestTMDBAssetSearchProvider_TVSeriesRegressionSkipsSearchMovie(t *testing.T) {
	t.Parallel()

	var searchMovieCalls int
	mux := http.NewServeMux()
	mux.HandleFunc("/search/tv", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[{"id":1234}]}`))
	})
	mux.HandleFunc("/search/movie", func(w http.ResponseWriter, r *http.Request) {
		searchMovieCalls++
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[]}`))
	})
	mux.HandleFunc("/tv/1234/images", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"posters":[{"file_path":"/poster.jpg","width":2000,"height":3000}],"backdrops":[]}`))
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	provider := &TMDBAssetSearchProvider{
		apiKey:     "test",
		baseURL:    server.URL,
		imageBase:  "https://image.tmdb.org/t/p",
		httpClient: server.Client(),
	}

	candidates, err := provider.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "cover",
		Query:     "Some Series",
		Limit:     5,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly 1 candidate, got %#v", candidates)
	}
	if candidates[0].SourceURL == nil || !strings.Contains(*candidates[0].SourceURL, "/tv/1234") {
		t.Fatalf("expected source url to contain /tv/1234, got %#v", candidates[0].SourceURL)
	}
	if !strings.HasPrefix(candidates[0].ID, "tmdb-tv-1234-") {
		t.Fatalf("expected candidate id to start with tmdb-tv-1234-, got %q", candidates[0].ID)
	}

	if searchMovieCalls != 0 {
		t.Fatalf("expected /search/movie to never be called for a TV hit, got %d calls", searchMovieCalls)
	}
}
