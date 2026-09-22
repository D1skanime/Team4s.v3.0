package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/models"
)

// TestAniListAssetSearchProvider_CoverSlotUsesCoverImageExtraLarge proves that a movie-format
// anime (bannerImage: null, live-verified AniList media id 3269 ".hack//G.U. Trilogy") is found
// via the "cover" slot using coverImage.extraLarge.
func TestAniListAssetSearchProvider_CoverSlotUsesCoverImageExtraLarge(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":{"Page":{"media":[{"id":3269,"title":{"romaji":".hack//G.U. Trilogy","english":null},"bannerImage":null,"coverImage":{"extraLarge":"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx3269-8LX2zM2vgr4f.jpg","large":"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx3269-8LX2zM2vgr4f.jpg"},"format":"MOVIE"}]}}}`))
	}))
	defer server.Close()

	provider := &AniListAssetSearchProvider{baseURL: server.URL, httpClient: server.Client()}

	if !provider.SupportsAssetKind("cover") {
		t.Fatalf("expected SupportsAssetKind(cover) to be true")
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
	want := "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx3269-8LX2zM2vgr4f.jpg"
	if candidates[0].ImageURL != want {
		t.Fatalf("expected image url %q, got %q", want, candidates[0].ImageURL)
	}
}

// TestAniListAssetSearchProvider_CoverSlotFallsBackToCoverImageLarge proves that when
// coverImage.extraLarge is empty, the provider falls back to coverImage.large.
func TestAniListAssetSearchProvider_CoverSlotFallsBackToCoverImageLarge(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":{"Page":{"media":[{"id":3269,"title":{"romaji":".hack//G.U. Trilogy","english":null},"bannerImage":null,"coverImage":{"extraLarge":"","large":"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx3269-8LX2zM2vgr4f.jpg"},"format":"MOVIE"}]}}}`))
	}))
	defer server.Close()

	provider := &AniListAssetSearchProvider{baseURL: server.URL, httpClient: server.Client()}

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
	want := "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx3269-8LX2zM2vgr4f.jpg"
	if candidates[0].ImageURL != want {
		t.Fatalf("expected fallback to coverImage.large %q, got %q", want, candidates[0].ImageURL)
	}
}

// TestAniListAssetSearchProvider_BannerSlotRegressionStillUsesBannerImage proves that the
// pre-existing "banner" slot behavior is unchanged: it uses bannerImage, not coverImage.
func TestAniListAssetSearchProvider_BannerSlotRegressionStillUsesBannerImage(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":{"Page":{"media":[{"id":100,"title":{"romaji":"Lain","english":"Serial Experiments Lain"},"bannerImage":"https://s4.anilist.co/file/anilistcdn/media/anime/banner/100.jpg","coverImage":{"extraLarge":"https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/100.jpg","large":"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/100.jpg"},"format":"TV"}]}}}`))
	}))
	defer server.Close()

	provider := &AniListAssetSearchProvider{baseURL: server.URL, httpClient: server.Client()}

	candidates, err := provider.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "banner",
		Query:     "Lain",
		Limit:     5,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected exactly 1 candidate, got %#v", candidates)
	}
	want := "https://s4.anilist.co/file/anilistcdn/media/anime/banner/100.jpg"
	if candidates[0].ImageURL != want {
		t.Fatalf("expected banner slot to use bannerImage %q, got %q", want, candidates[0].ImageURL)
	}
}
