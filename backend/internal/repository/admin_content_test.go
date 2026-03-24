package repository

import (
	"reflect"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestAdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_UsesExplicitCasts(t *testing.T) {
	query, _ := buildApplyJellyfinSyncMetadataQuery(25, "jellyfin:abc", nil, nil, nil, false)

	requiredFragments := []string{
		"WHEN $6 = true AND $2 <> '' THEN $2",
		"WHEN (source IS NULL OR btrim(source) = '') AND $2 <> '' THEN $2",
		"year = COALESCE(year, $3::smallint)",
		"THEN $4::text",
		"max_episodes = COALESCE(max_episodes, $5::smallint)",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got: %s", fragment, query)
		}
	}
}

func TestAdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_TrimmedSourceAndNullableArgs(t *testing.T) {
	query, args := buildApplyJellyfinSyncMetadataQuery(25, " jellyfin:abc123 ", nil, nil, nil, true)

	if strings.TrimSpace(query) == "" {
		t.Fatalf("expected query to be non-empty")
	}
	if len(args) != 6 {
		t.Fatalf("expected 6 args, got %d", len(args))
	}
	if got := args[0]; got != int64(25) {
		t.Fatalf("expected anime id 25, got %#v", got)
	}
	if got := args[1]; got != "jellyfin:abc123" {
		t.Fatalf("expected trimmed source tag, got %#v", got)
	}
	yearArg, ok := args[2].(*int16)
	if !ok || yearArg != nil {
		t.Fatalf("expected typed nil *int16 year arg, got %#v", args[2])
	}
	descriptionArg, ok := args[3].(*string)
	if !ok || descriptionArg != nil {
		t.Fatalf("expected typed nil *string description arg, got %#v", args[3])
	}
	maxEpisodesArg, ok := args[4].(*int16)
	if !ok || maxEpisodesArg != nil {
		t.Fatalf("expected typed nil *int16 max_episodes arg, got %#v", args[4])
	}
	forceSourceArg, ok := args[5].(bool)
	if !ok || !forceSourceArg {
		t.Fatalf("expected forceSourceUpdate bool arg=true, got %#v", args[5])
	}
}

func TestAdminContentRepository_BuildAuthoritativeAnimeMetadataCreate_MatchesNormalizedReadContract(t *testing.T) {
	titleDE := "Frieren - Nach dem Ende der Reise"
	titleEN := "Frieren: Beyond Journey's End"
	genre := "Fantasy, Adventure, fantasy"

	write := buildAuthoritativeAnimeMetadataCreate(models.AdminAnimeCreateInput{
		Title:   "Sousou no Frieren",
		TitleDE: &titleDE,
		TitleEN: &titleEN,
		Genre:   &genre,
	})

	if len(write.TitleSlots) != 3 {
		t.Fatalf("expected 3 title slots, got %d", len(write.TitleSlots))
	}
	if !write.GenresSet {
		t.Fatal("expected genres to be marked authoritative on create")
	}

	metadata := mergeNormalizedAnimeMetadata(write.normalizedTitleRecords(), write.Genres)
	if metadata == nil {
		t.Fatal("expected normalized metadata")
	}
	if metadata.Title != "Sousou no Frieren" {
		t.Fatalf("expected primary title to survive normalized read, got %q", metadata.Title)
	}
	if metadata.TitleDE == nil || *metadata.TitleDE != titleDE {
		t.Fatalf("expected German title %q, got %#v", titleDE, metadata.TitleDE)
	}
	if metadata.TitleEN == nil || *metadata.TitleEN != titleEN {
		t.Fatalf("expected English title %q, got %#v", titleEN, metadata.TitleEN)
	}

	wantGenres := []string{"Adventure", "Fantasy"}
	if !reflect.DeepEqual(write.Genres, wantGenres) {
		t.Fatalf("expected normalized genres %#v, got %#v", wantGenres, write.Genres)
	}
	if !reflect.DeepEqual(metadata.Genres, wantGenres) {
		t.Fatalf("expected read genres %#v, got %#v", wantGenres, metadata.Genres)
	}
}

func TestAdminContentRepository_BuildAuthoritativeAnimeMetadataPatch_OnlyTouchesExplicitFields(t *testing.T) {
	title := "Orb: On the Movements of the Earth"

	write := buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
		Title: models.OptionalString{
			Set:   true,
			Value: &title,
		},
	})

	if len(write.TitleSlots) != 1 {
		t.Fatalf("expected 1 explicit title slot, got %d", len(write.TitleSlots))
	}
	slot := write.TitleSlots[0]
	if !slot.Set || slot.LanguageCode != "romaji" || slot.TitleType != "main" {
		t.Fatalf("expected romaji/main slot, got %#v", slot)
	}
	if slot.Title == nil || *slot.Title != title {
		t.Fatalf("expected title value %q, got %#v", title, slot.Title)
	}
	if write.GenresSet {
		t.Fatal("expected untouched genres to remain unset in patch")
	}
}

func TestAdminContentRepository_BuildAuthoritativeGenreTokensQuery_UsesNormalizedGenreStore(t *testing.T) {
	query := buildAuthoritativeGenreTokensQuery()

	requiredFragments := []string{
		"FROM anime_genres ag",
		"JOIN genres g ON g.id = ag.genre_id",
		"GROUP BY g.name",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got %s", fragment, query)
		}
	}
}
