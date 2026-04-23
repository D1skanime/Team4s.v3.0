package repository

import (
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

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

func TestBuildCreateAnimeV2InsertQuery_SkipsMissingRuntimeColumns(t *testing.T) {
	t.Parallel()

	query, args := buildCreateAnimeV2InsertQuery(
		animeV2SchemaInfo{HasSlug: true},
		7,
		models.AdminAnimeCreateInput{
			ContentType: "anime",
			Status:      "ongoing",
		},
		"lain",
		nil,
	)

	normalized := strings.ToLower(query)
	unexpected := []string{"content_type", "status", "max_episodes", "source"}
	for _, fragment := range unexpected {
		if strings.Contains(normalized, fragment) {
			t.Fatalf("did not expect query to contain %q: %s", fragment, query)
		}
	}

	required := []string{"title", "type", "anime_type_id", "year", "description", "folder_name", "slug", "modified_by"}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected query to contain %q: %s", fragment, query)
		}
	}

	if len(args) != 8 {
		t.Fatalf("expected 8 args for minimal v2 schema, got %d", len(args))
	}
}

func TestBuildCreateAnimeV2InsertQuery_IncludesAvailableRuntimeColumns(t *testing.T) {
	t.Parallel()

	query, args := buildCreateAnimeV2InsertQuery(
		animeV2SchemaInfo{
			HasSlug:        true,
			HasContentType: true,
			HasStatus:      true,
			HasMaxEpisodes: true,
			HasSource:      true,
		},
		7,
		models.AdminAnimeCreateInput{
			ContentType: "anime",
			Status:      "ongoing",
		},
		"lain",
		nil,
	)

	normalized := strings.ToLower(query)
	required := []string{"title", "type", "content_type", "status", "max_episodes", "source", "folder_name", "slug", "modified_by"}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected query to contain %q: %s", fragment, query)
		}
	}

	if len(args) != 12 {
		t.Fatalf("expected 12 args for full runtime schema, got %d", len(args))
	}
}

func TestAnimeTypeV2Names_UsesDatabaseLookupValues(t *testing.T) {
	t.Parallel()

	want := map[string]string{
		"tv":      "tv",
		"film":    "film",
		"ova":     "ova",
		"ona":     "ona",
		"special": "special",
		"bonus":   "bonus",
		"web":     "web",
	}

	for input, expected := range want {
		if got := animeTypeV2Names[input]; got != expected {
			t.Fatalf("expected animeTypeV2Names[%q] = %q, got %q", input, expected, got)
		}
	}
}
