package repository

import (
	"errors"
	"reflect"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildAnimeListWhere_IncludesQuery(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{Q: "attack"})
	if !strings.Contains(whereSQL, "status <> 'disabled'") {
		t.Fatalf("expected disabled filter in where clause, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "title_de ILIKE $1") || !strings.Contains(whereSQL, "title_en ILIKE $1") {
		t.Fatalf("expected legacy title filters in where clause, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "FROM anime_titles at") || !strings.Contains(whereSQL, "at.title ILIKE $1") {
		t.Fatalf("expected normalized title search in where clause, got %q", whereSQL)
	}
	if !reflect.DeepEqual(args, []any{"%attack%"}) {
		t.Fatalf("expected args %#v, got %#v", []any{"%attack%"}, args)
	}
}

func TestBuildAnimeListWhere_QueryPositions(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{
		ContentType: "anime",
		Status:      "done",
		HasCover:    boolPtr(true),
		Q:           "eva",
		Letter:      "E",
	})

	if !strings.Contains(whereSQL, "content_type = $1") || !strings.Contains(whereSQL, "status = $2") {
		t.Fatalf("expected content/status filters, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "(cover_image IS NOT NULL AND btrim(cover_image) <> '')") {
		t.Fatalf("expected cover filter, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "at.title ILIKE $3") {
		t.Fatalf("expected normalized title filter in where clause, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "UPPER(LEFT(") || !strings.Contains(whereSQL, ")) = $4") {
		t.Fatalf("expected computed title letter filter, got %q", whereSQL)
	}

	wantArgs := []any{"anime", "done", "%eva%", "E"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("expected args %#v, got %#v", wantArgs, args)
	}
}

func TestBuildAnimeListWhere_HasCoverFalse(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{HasCover: boolPtr(false)})
	wantWhere := " WHERE status <> 'disabled' AND (cover_image IS NULL OR btrim(cover_image) = '')"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
	}
	if len(args) != 0 {
		t.Fatalf("expected no args, got %#v", args)
	}
}

func TestBuildAnimeListWhere_FansubFilter(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{FansubGroupID: int64Ptr(42)})
	wantWhere := " WHERE status <> 'disabled' AND EXISTS (SELECT 1 FROM anime_fansub_groups afg WHERE afg.anime_id = anime.id AND afg.fansub_group_id = $1)"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
	}
	if !reflect.DeepEqual(args, []any{int64(42)}) {
		t.Fatalf("expected args %#v, got %#v", []any{int64(42)}, args)
	}
}

func TestBuildAnimeListWhere_FansubFilterArgPosition(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{
		ContentType:   "anime",
		FansubGroupID: int64Ptr(9),
		Q:             "bleach",
	})

	if !strings.Contains(whereSQL, "content_type = $1") {
		t.Fatalf("expected content type filter, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "afg.fansub_group_id = $2") {
		t.Fatalf("expected fansub filter in second arg slot, got %q", whereSQL)
	}
	if !strings.Contains(whereSQL, "at.title ILIKE $3") {
		t.Fatalf("expected normalized title filter in third arg slot, got %q", whereSQL)
	}

	wantArgs := []any{"anime", int64(9), "%bleach%"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("expected args %#v, got %#v", wantArgs, args)
	}
}

func TestBuildAnimeListWhereV2_UsesPersistedFieldsAndFilters(t *testing.T) {
	whereSQL, args := buildAnimeListWhereV2(models.AnimeFilter{
		ContentType: "movie",
		Status:      "done",
		HasCover:    boolPtr(false),
		Q:           "eva",
		Letter:      "E",
	})

	required := []string{
		"anime.content_type = $1",
		"anime.status = $2",
		"NOT",
		"btrim(ma.file_path) <> ''",
		"anime.slug",
		"at.title ILIKE $3",
		"UPPER(LEFT(",
	}
	for _, fragment := range required {
		if !strings.Contains(whereSQL, fragment) {
			t.Fatalf("expected where clause to contain %q, got %q", fragment, whereSQL)
		}
	}

	wantArgs := []any{"movie", "done", "%eva%", "E"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("expected args %#v, got %#v", wantArgs, args)
	}
}

func TestBuildAnimeListWhere_IncludeDisabledTrue(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{IncludeDisabled: true})
	if whereSQL != "" {
		t.Fatalf("expected empty where clause, got %q", whereSQL)
	}
	if len(args) != 0 {
		t.Fatalf("expected no args, got %#v", args)
	}
}

func TestMergeNormalizedAnimeMetadata_PrefersNormalizedTitlesAndGenres(t *testing.T) {
	metadata := mergeNormalizedAnimeMetadata(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "en", TitleType: "official", Title: "Attack on Titan"},
			{LanguageCode: "de", TitleType: "main", Title: "Angriff auf Titan"},
			{LanguageCode: "ja", TitleType: "main", Title: "Shingeki no Kyojin"},
		},
		[]string{"Action", "Drama", "action"},
	)
	if metadata == nil {
		t.Fatal("expected normalized metadata")
	}
	if metadata.Title != "Shingeki no Kyojin" {
		t.Fatalf("expected primary title from normalized ja/main, got %q", metadata.Title)
	}
	if metadata.TitleDE == nil || *metadata.TitleDE != "Angriff auf Titan" {
		t.Fatalf("expected normalized German title, got %#v", metadata.TitleDE)
	}
	if metadata.TitleEN == nil || *metadata.TitleEN != "Attack on Titan" {
		t.Fatalf("expected normalized English title, got %#v", metadata.TitleEN)
	}

	wantGenres := []string{"Action", "Drama"}
	if !reflect.DeepEqual(metadata.Genres, wantGenres) {
		t.Fatalf("expected genres %#v, got %#v", wantGenres, metadata.Genres)
	}
}

func TestMergeNormalizedAnimeMetadata_FallsBackToAvailableTitle(t *testing.T) {
	metadata := mergeNormalizedAnimeMetadata(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "en", TitleType: "official", Title: "Frieren"},
		},
		nil,
	)
	if metadata == nil {
		t.Fatal("expected normalized metadata")
	}
	if metadata.Title != "Frieren" {
		t.Fatalf("expected fallback primary title, got %q", metadata.Title)
	}
	if metadata.TitleEN == nil || *metadata.TitleEN != "Frieren" {
		t.Fatalf("expected English title to be preserved, got %#v", metadata.TitleEN)
	}
}

func TestMergeNormalizedAnimeMetadata_ReturnsNilWhenEmpty(t *testing.T) {
	metadata := mergeNormalizedAnimeMetadata(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "ja", TitleType: "main", Title: "   "},
		},
		[]string{" ", ""},
	)
	if metadata != nil {
		t.Fatalf("expected nil metadata, got %#v", metadata)
	}
}

func TestPickNormalizedTitle_UsesTypePriorityWithinLanguage(t *testing.T) {
	title := pickNormalizedTitle(
		[]normalizedAnimeTitleRecord{
			{LanguageCode: "en", TitleType: "short", Title: "AoT"},
			{LanguageCode: "en", TitleType: "official", Title: "Attack on Titan"},
		},
		[]string{"en"},
		[]string{"official", "short"},
	)
	if title != "Attack on Titan" {
		t.Fatalf("expected official title, got %q", title)
	}
}

func TestPrimaryNormalizedTitleSQL_UsesCoalesceFallback(t *testing.T) {
	sql := primaryNormalizedTitleSQL("anime.id", "title")
	if !strings.Contains(sql, "COALESCE") || !strings.Contains(sql, "FROM anime_titles at") {
		t.Fatalf("expected normalized title SQL, got %q", sql)
	}
	if !strings.Contains(sql, "anime.id") || !strings.Contains(sql, ", title)") {
		t.Fatalf("expected anime id reference and legacy fallback, got %q", sql)
	}
}

func TestAnimeAssetLinkSpec_SupportsPhaseSevenSingularSlots(t *testing.T) {
	tests := []struct {
		slot      string
		mediaType string
	}{
		{slot: "cover", mediaType: "poster"},
		{slot: "banner", mediaType: "banner"},
		{slot: "logo", mediaType: "logo"},
		{slot: "background_video", mediaType: "video"},
	}

	for _, tt := range tests {
		t.Run(tt.slot, func(t *testing.T) {
			spec, ok := lookupAnimeAssetLinkSpec(tt.slot)
			if !ok {
				t.Fatalf("expected slot %q to be supported", tt.slot)
			}
			if spec.MediaType != tt.mediaType {
				t.Fatalf("expected media type %q, got %q", tt.mediaType, spec.MediaType)
			}
			if !spec.Singular {
				t.Fatalf("expected slot %q to stay singular", tt.slot)
			}
		})
	}
}

func TestAnimeAssetLinkSpec_BackgroundRemainsCollection(t *testing.T) {
	spec, ok := lookupAnimeAssetLinkSpec("background")
	if !ok {
		t.Fatal("expected background slot to be supported")
	}
	if spec.MediaType != "background" {
		t.Fatalf("expected background media type, got %q", spec.MediaType)
	}
	if spec.Singular {
		t.Fatal("expected background slot to remain additive")
	}
}

func TestAnimeAssetLinkSpec_RejectsMediaTypeMismatch(t *testing.T) {
	spec, ok := lookupAnimeAssetLinkSpec("logo")
	if !ok {
		t.Fatal("expected logo slot to be supported")
	}

	err := validateAnimeAssetLinkMediaType(spec, "background")
	if !errors.Is(err, ErrAnimeAssetMediaTypeMismatch) {
		t.Fatalf("expected ErrAnimeAssetMediaTypeMismatch, got %v", err)
	}
}

func TestAnimeAssetLinkSpec_RejectsUnknownSlot(t *testing.T) {
	if _, ok := lookupAnimeAssetLinkSpec("trailer"); ok {
		t.Fatal("expected unknown slot to be rejected")
	}
}

func boolPtr(value bool) *bool {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}
