package repository

import (
	"reflect"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildAnimeListWhere_IncludesQuery(t *testing.T) {
	whereSQL, args := buildAnimeListWhere(models.AnimeFilter{Q: "attack"})
	wantWhere := " WHERE status <> 'disabled' AND (title ILIKE $1 OR title_de ILIKE $1 OR title_en ILIKE $1)"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
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

	wantWhere := " WHERE content_type = $1 AND status = $2 AND (cover_image IS NOT NULL AND btrim(cover_image) <> '') AND (title ILIKE $3 OR title_de ILIKE $3 OR title_en ILIKE $3) AND UPPER(LEFT(title, 1)) = $4"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
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

	wantWhere := " WHERE content_type = $1 AND status <> 'disabled' AND EXISTS (SELECT 1 FROM anime_fansub_groups afg WHERE afg.anime_id = anime.id AND afg.fansub_group_id = $2) AND (title ILIKE $3 OR title_de ILIKE $3 OR title_en ILIKE $3)"
	if whereSQL != wantWhere {
		t.Fatalf("expected where %q, got %q", wantWhere, whereSQL)
	}

	wantArgs := []any{"anime", int64(9), "%bleach%"}
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

func boolPtr(value bool) *bool {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}
