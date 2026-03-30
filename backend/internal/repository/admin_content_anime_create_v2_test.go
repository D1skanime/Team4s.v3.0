package repository

import "testing"

func TestSlugifyAnimeTitle(t *testing.T) {
	t.Parallel()

	got := slugifyAnimeTitle(" Naruto Shippuuden: The Movie / Bonds ")
	want := "naruto-shippuuden-the-movie-bonds"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestInferImageMetadata(t *testing.T) {
	t.Parallel()

	mimeType, format := inferImageMetadata("https://img.local/covers/poster.webp?size=large")
	if mimeType != "image/webp" || format != "webp" {
		t.Fatalf("expected webp metadata, got mime=%q format=%q", mimeType, format)
	}
}

func TestBuildJellyfinMediaExternal(t *testing.T) {
	t.Parallel()

	ref := buildJellyfinMediaExternal("/api/v1/media/image?provider=jellyfin&item_id=series-42&kind=primary")
	if ref == nil {
		t.Fatal("expected jellyfin media external ref")
	}
	if ref.Provider != "jellyfin" || ref.ExternalID != "series-42" || ref.ExternalType != "primary" {
		t.Fatalf("unexpected external ref: %#v", ref)
	}
}
