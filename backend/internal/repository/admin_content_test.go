package repository

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestAdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_UsesExplicitCasts(t *testing.T) {
	query, _ := buildApplyJellyfinSyncMetadataQuery(25, "jellyfin:abc", nil, nil, nil, nil, false)

	requiredFragments := []string{
		"WHEN $7 = true AND $2 <> '' THEN $2",
		"WHEN (source IS NULL OR btrim(source) = '') AND $2 <> '' THEN $2",
		"COALESCE($3::text, '') <> ''",
		"year = COALESCE(year, $4::smallint)",
		"THEN $5::text",
		"max_episodes = COALESCE(max_episodes, $6::smallint)",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got: %s", fragment, query)
		}
	}
}

func TestAdminContentRepository_BuildApplyJellyfinSyncMetadataQuery_TrimmedSourceAndNullableArgs(t *testing.T) {
	query, args := buildApplyJellyfinSyncMetadataQuery(25, " jellyfin:abc123 ", nil, nil, nil, nil, true)

	if strings.TrimSpace(query) == "" {
		t.Fatalf("expected query to be non-empty")
	}
	if len(args) != 7 {
		t.Fatalf("expected 7 args, got %d", len(args))
	}
	if got := args[0]; got != int64(25) {
		t.Fatalf("expected anime id 25, got %#v", got)
	}
	if got := args[1]; got != "jellyfin:abc123" {
		t.Fatalf("expected trimmed source tag, got %#v", got)
	}
	folderNameArg, ok := args[2].(*string)
	if !ok || folderNameArg != nil {
		t.Fatalf("expected typed nil *string folder_name arg, got %#v", args[2])
	}
	yearArg, ok := args[3].(*int16)
	if !ok || yearArg != nil {
		t.Fatalf("expected typed nil *int16 year arg, got %#v", args[3])
	}
	descriptionArg, ok := args[4].(*string)
	if !ok || descriptionArg != nil {
		t.Fatalf("expected typed nil *string description arg, got %#v", args[4])
	}
	maxEpisodesArg, ok := args[5].(*int16)
	if !ok || maxEpisodesArg != nil {
		t.Fatalf("expected typed nil *int16 max_episodes arg, got %#v", args[5])
	}
	forceSourceArg, ok := args[6].(bool)
	if !ok || !forceSourceArg {
		t.Fatalf("expected forceSourceUpdate bool arg=true, got %#v", args[6])
	}
}

func TestAdminContentRepository_Task1FilesStayWithinLineBudget(t *testing.T) {
	files := []string{
		"admin_content.go",
		"admin_content_anime_metadata.go",
		"admin_content_episode.go",
		"admin_content_sync.go",
		"admin_content_anime_audit.go",
	}

	for _, file := range files {
		if got := repositoryFileLineCount(t, file); got > 450 {
			t.Fatalf("expected %s to stay at or below 450 lines, got %d", file, got)
		}
	}
}

func TestAnimeRepository_Task2FilesStayWithinLineBudget(t *testing.T) {
	files := []string{
		"anime.go",
		"anime_metadata.go",
	}

	for _, file := range files {
		if got := repositoryFileLineCount(t, file); got > 450 {
			t.Fatalf("expected %s to stay at or below 450 lines, got %d", file, got)
		}
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

func TestAdminContentRepository_AuthoritativeTitlePatchReplacesNormalizedReadValues(t *testing.T) {
	title := "Kimi no Na wa."
	titleDE := "Your Name."
	titleEN := "Your Name"

	updatedTitles, updatedGenres := applyAuthoritativeAnimeMetadataWrite(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "romaji", TitleType: "main", Title: "Old Title"},
			{LanguageCode: "de", TitleType: "main", Title: "Alter Titel"},
			{LanguageCode: "en", TitleType: "official", Title: "Old English"},
		},
		[]string{"Drama"},
		buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
			Title: models.OptionalString{Set: true, Value: &title},
			TitleDE: models.OptionalString{
				Set:   true,
				Value: &titleDE,
			},
			TitleEN: models.OptionalString{
				Set:   true,
				Value: &titleEN,
			},
		}),
	)

	metadata := mergeNormalizedAnimeMetadata(updatedTitles, updatedGenres)
	if metadata == nil {
		t.Fatal("expected normalized metadata after patch")
	}
	if metadata.Title != title {
		t.Fatalf("expected primary title %q, got %q", title, metadata.Title)
	}
	if metadata.TitleDE == nil || *metadata.TitleDE != titleDE {
		t.Fatalf("expected German title %q, got %#v", titleDE, metadata.TitleDE)
	}
	if metadata.TitleEN == nil || *metadata.TitleEN != titleEN {
		t.Fatalf("expected English title %q, got %#v", titleEN, metadata.TitleEN)
	}
}

func TestAdminContentRepository_AuthoritativeGenrePatchReplacesAndClearsReadValues(t *testing.T) {
	replacement := "Sci-Fi, Drama"

	updatedTitles, updatedGenres := applyAuthoritativeAnimeMetadataWrite(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "romaji", TitleType: "main", Title: "Psycho-Pass"},
		},
		[]string{"Action", "Thriller"},
		buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
			Genre: models.OptionalString{Set: true, Value: &replacement},
		}),
	)

	metadata := mergeNormalizedAnimeMetadata(updatedTitles, updatedGenres)
	wantGenres := []string{"Drama", "Sci-Fi"}
	if metadata == nil || !reflect.DeepEqual(metadata.Genres, wantGenres) {
		t.Fatalf("expected replacement genres %#v, got %#v", wantGenres, metadata)
	}

	clearedTitles, clearedGenres := applyAuthoritativeAnimeMetadataWrite(
		updatedTitles,
		updatedGenres,
		buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
			Genre: models.OptionalString{Set: true, Value: nil},
		}),
	)

	clearedMetadata := mergeNormalizedAnimeMetadata(clearedTitles, clearedGenres)
	if clearedMetadata == nil {
		t.Fatal("expected title metadata to remain after clearing genres")
	}
	if len(clearedMetadata.Genres) != 0 {
		t.Fatalf("expected genres to be cleared, got %#v", clearedMetadata.Genres)
	}
}

func TestAdminContentRepository_FilterGenreTokens_PrioritizesPrefixMatches(t *testing.T) {
	filtered := filterGenreTokens([]models.GenreToken{
		{Name: "Drama", Count: 4},
		{Name: "Dark Fantasy", Count: 2},
		{Name: "Adventure", Count: 8},
	}, "d", 2)

	want := []models.GenreToken{
		{Name: "Dark Fantasy", Count: 2},
		{Name: "Drama", Count: 4},
	}
	if !reflect.DeepEqual(filtered, want) {
		t.Fatalf("expected filtered genre tokens %#v, got %#v", want, filtered)
	}
}

func TestAdminContentRepository_BuildAnimeCreateAuditEntry_PersistsActorAndPayload(t *testing.T) {
	titleDE := "German"
	genre := "Drama, Mystery"

	entry, err := buildAdminAnimeAuditEntryForCreate(42, 77, models.AdminAnimeCreateInput{
		Title:       "Monster",
		TitleDE:     &titleDE,
		Type:        "tv",
		ContentType: "anime",
		Status:      "done",
		Genre:       &genre,
	})
	if err != nil {
		t.Fatalf("build create audit entry: %v", err)
	}
	if entry.ActorUserID != 42 {
		t.Fatalf("expected actor 42, got %d", entry.ActorUserID)
	}
	if entry.AnimeID != 77 {
		t.Fatalf("expected anime 77, got %d", entry.AnimeID)
	}
	if entry.MutationKind != adminAnimeMutationKindCreate {
		t.Fatalf("expected mutation kind %q, got %q", adminAnimeMutationKindCreate, entry.MutationKind)
	}

	var payload map[string]any
	if err := json.Unmarshal(entry.RequestPayload, &payload); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if payload["title"] != "Monster" {
		t.Fatalf("expected title in payload, got %#v", payload["title"])
	}
	if payload["genre"] != "Drama, Mystery" {
		t.Fatalf("expected genre in payload, got %#v", payload["genre"])
	}
}

func TestAdminContentRepository_BuildAnimePatchAuditEntry_UsesCoverRemoveMutationKind(t *testing.T) {
	entry, err := buildAdminAnimeAuditEntryForPatch(11, 88, models.AdminAnimePatchInput{
		CoverImage: models.OptionalString{Set: true, Value: nil},
	})
	if err != nil {
		t.Fatalf("build patch audit entry: %v", err)
	}
	if entry.MutationKind != adminAnimeMutationKindCoverRemove {
		t.Fatalf("expected mutation kind %q, got %q", adminAnimeMutationKindCoverRemove, entry.MutationKind)
	}

	var payload map[string]any
	if err := json.Unmarshal(entry.RequestPayload, &payload); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	rawCover, ok := payload["cover_image"]
	if !ok {
		t.Fatalf("expected cover_image in payload")
	}
	if rawCover != nil {
		t.Fatalf("expected cover_image null in payload, got %#v", rawCover)
	}
}

func TestAdminContentRepository_BuildAnimeDeleteAuditEntry_PersistsDeletedAnimeContext(t *testing.T) {
	entry, err := buildAdminAnimeAuditEntryForDelete(19, models.AdminAnimeDeleteResult{
		AnimeID: 55,
		Title:   "Erased",
	})
	if err != nil {
		t.Fatalf("build delete audit entry: %v", err)
	}
	if entry.ActorUserID != 19 {
		t.Fatalf("expected actor 19, got %d", entry.ActorUserID)
	}
	if entry.AnimeID != 55 {
		t.Fatalf("expected anime 55, got %d", entry.AnimeID)
	}
	if entry.MutationKind != adminAnimeMutationKindDelete {
		t.Fatalf("expected mutation kind %q, got %q", adminAnimeMutationKindDelete, entry.MutationKind)
	}

	var payload map[string]any
	if err := json.Unmarshal(entry.RequestPayload, &payload); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if payload["anime_id"] != float64(55) {
		t.Fatalf("expected anime_id 55 in payload, got %#v", payload["anime_id"])
	}
	if payload["title"] != "Erased" {
		t.Fatalf("expected title in payload, got %#v", payload["title"])
	}
}

func TestAdminContentRepository_DeleteAnimeSourceWritesAuditBeforeDelete(t *testing.T) {
	content := readRepositorySource(t, "admin_content_anime_delete.go")
	normalized := strings.ToLower(content)

	auditPos := strings.Index(normalized, "if err := insertadminanimeauditentry(ctx, tx, auditentry); err != nil {")
	deletePos := strings.Index(normalized, "deletetag, err := tx.exec(ctx, `delete from anime where id = $1`, id)")
	if auditPos == -1 || deletePos == -1 {
		t.Fatalf("expected delete source to contain audit insert and delete statements")
	}
	if auditPos > deletePos {
		t.Fatalf("expected audit insert to happen before anime delete")
	}
}

// ---------------------------------------------------------------------------
// Tag normalization, authoritative persistence, token listing, and delete
// cleanup tests — Task 1 TDD coverage for Plan 10-02.
// ---------------------------------------------------------------------------

// TestAdminContentRepository_NormalizeTagList_TrimsDedupesSorts verifies that
// the normalizeTagList helper collapses duplicates case-insensitively, trims
// whitespace, and returns a sorted result so stored tag names are canonical.
func TestAdminContentRepository_NormalizeTagList_TrimsDedupesSorts(t *testing.T) {
	raw := []string{" Mecha ", "mecha", "Classic", " classic ", "sci-fi"}
	got := normalizeTagList(raw)

	// "mecha" and "Mecha" collapse; "classic" and "Classic" collapse.
	// First-seen casing wins, so order of input determines winner.
	// After dedup the result must be sorted.
	if len(got) != 3 {
		t.Fatalf("expected 3 deduplicated tags, got %d: %v", len(got), got)
	}

	// Result must be sorted ascending (case-insensitive order is fine but the
	// slice itself must be deterministic and ascending).
	for i := 1; i < len(got); i++ {
		if strings.ToLower(got[i-1]) > strings.ToLower(got[i]) {
			t.Fatalf("expected sorted tags, got %v", got)
		}
	}
}

// TestAdminContentRepository_NormalizeTagList_EmptyInput returns nil for empty
// or nil input so callers can distinguish "no tags provided" from "empty list".
func TestAdminContentRepository_NormalizeTagList_EmptyInput(t *testing.T) {
	if got := normalizeTagList(nil); got != nil {
		t.Fatalf("expected nil for nil input, got %v", got)
	}
	if got := normalizeTagList([]string{}); got != nil {
		t.Fatalf("expected nil for empty slice, got %v", got)
	}
	if got := normalizeTagList([]string{"  ", ""}); got != nil {
		t.Fatalf("expected nil for whitespace-only slice, got %v", got)
	}
}

// TestAdminContentRepository_BuildAuthoritativeAnimeMetadataCreate_TagsSet
// verifies that a create input with tags populates TagsSet and a normalized
// Tags slice on the resulting write struct.
func TestAdminContentRepository_BuildAuthoritativeAnimeMetadataCreate_TagsSet(t *testing.T) {
	write := buildAuthoritativeAnimeMetadataCreate(models.AdminAnimeCreateInput{
		Title:       "Fullmetal Alchemist",
		Type:        "tv",
		ContentType: "anime",
		Status:      "done",
		Tags:        []string{" Action ", "action", "Fantasy"},
	})

	if !write.TagsSet {
		t.Fatal("expected TagsSet to be true when tags are provided on create")
	}

	// Deduplication must have collapsed "Action"/"action".
	if len(write.Tags) != 2 {
		t.Fatalf("expected 2 normalized tags, got %d: %v", len(write.Tags), write.Tags)
	}
}

// TestAdminContentRepository_BuildAuthoritativeAnimeMetadataPatch_TagsSetOnly
// verifies that a patch with tags sets TagsSet while a patch without tags
// leaves TagsSet false (authoritative replace semantics).
func TestAdminContentRepository_BuildAuthoritativeAnimeMetadataPatch_TagsSetOnly(t *testing.T) {
	title := "Steins;Gate"

	withTagsPatch := buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
		Title: models.OptionalString{Set: true, Value: &title},
		Tags:  models.OptionalStringSlice{Set: true, Value: []string{"Sci-Fi", "Thriller"}},
	})
	if !withTagsPatch.TagsSet {
		t.Fatal("expected TagsSet=true when patch includes tags")
	}
	if len(withTagsPatch.Tags) != 2 {
		t.Fatalf("expected 2 tags on patch, got %d: %v", len(withTagsPatch.Tags), withTagsPatch.Tags)
	}

	withoutTagsPatch := buildAuthoritativeAnimeMetadataPatch(models.AdminAnimePatchInput{
		Title: models.OptionalString{Set: true, Value: &title},
	})
	if withoutTagsPatch.TagsSet {
		t.Fatal("expected TagsSet=false when patch does not include tags")
	}
}

// TestAdminContentRepository_BuildAuthoritativeTagTokensQuery_UsesNormalizedTagStore
// verifies that the SQL returned by buildAuthoritativeTagTokensQuery joins the
// expected tables — mirrors the genre token query coverage test.
func TestAdminContentRepository_BuildAuthoritativeTagTokensQuery_UsesNormalizedTagStore(t *testing.T) {
	query := buildAuthoritativeTagTokensQuery()

	requiredFragments := []string{
		"FROM anime_tags",
		"JOIN tags",
		"GROUP BY",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected tag token query to contain %q, got:\n%s", fragment, query)
		}
	}
}

// TestAdminContentRepository_FilterTagTokens_PrioritizesPrefixMatches mirrors
// the genre token prefix-priority test for tag tokens.
func TestAdminContentRepository_FilterTagTokens_PrioritizesPrefixMatches(t *testing.T) {
	filtered := filterTagTokens([]models.AdminTagToken{
		{Name: "Drama", Count: 4},
		{Name: "Dark Fantasy", Count: 2},
		{Name: "Adventure", Count: 8},
	}, "d", 2)

	if len(filtered) != 2 {
		t.Fatalf("expected 2 results after limit, got %d: %v", len(filtered), filtered)
	}
	// Prefix matches ("Dark Fantasy", "Drama") must come before non-prefix matches.
	if filtered[0].Name != "Dark Fantasy" && filtered[0].Name != "Drama" {
		t.Fatalf("expected prefix matches first, got %q", filtered[0].Name)
	}
}

// TestAdminContentRepository_DeleteSource_ClearsAnimeTagsLinks verifies that
// the delete association SQL includes an `anime_tags` clear statement in both
// the hybrid and V2 paths, analogous to the existing anime_genres cleanup.
func TestAdminContentRepository_DeleteSource_ClearsAnimeTagsLinks(t *testing.T) {
	content := readRepositorySource(t, "admin_content_anime_delete.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "delete from anime_tags where anime_id") {
		t.Fatalf(
			"expected admin_content_anime_delete.go to DELETE from anime_tags, got source:\n%s",
			content,
		)
	}
}

func repositoryFileLineCount(t *testing.T, name string) int {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}

	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}

	return strings.Count(string(content), "\n") + 1
}
