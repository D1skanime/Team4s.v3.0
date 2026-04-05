package repository

import (
	"strings"
	"testing"
)

func TestAdminContentAnimeUpdateV2SourceKeepsLegacyFallbackWhenSourceColumnMissing(t *testing.T) {
	t.Parallel()

	content := readRepositorySource(t, "admin_content_anime_update_v2.go")
	normalized := strings.ToLower(content)

	required := []string{
		"if schema.hassource {",
		"removeanimeposterlinks",
		"bumpanimepostersortorders",
		"attachanimepostermediav2",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected update v2 source to contain %q", fragment)
		}
	}
}

func TestAdminContentAnimeUpdateV2ReadbackUsesPosterFilePath(t *testing.T) {
	t.Parallel()

	content := readRepositorySource(t, "admin_content_anime_update_v2.go")
	normalized := strings.ToLower(content)

	required := []string{
		"select ma.file_path",
		"join media_types mt on mt.id = ma.media_type_id",
		"mt.name = 'poster'",
		"order by am.sort_order asc, ma.id asc",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected update v2 readback to contain %q", fragment)
		}
	}
}

func TestAdminContentAnimeUpdateV2DisplayTitleFallsBackWhenSlugMissing(t *testing.T) {
	t.Parallel()

	content := readRepositorySource(t, "admin_content_anime_update_v2.go")
	normalized := strings.ToLower(content)

	required := []string{
		"func v2animetitlefallbacksql(schema animev2schemainfo) string",
		"if schema.hasslug {",
		"return \"anime.slug\"",
		"return \"''\"",
		"loadv2animedisplaytitle(ctx, tx, id, schema)",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected update v2 title fallback to contain %q", fragment)
		}
	}
}
