package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestAnimeRepository_ReadPathUsesFlatColumnsWithNormalizedOverlay(t *testing.T) {
	content := readRepositorySource(t, "anime.go")
	normalized := strings.ToLower(content)

	required := []string{
		"from anime",
		"select id, title, title_de, title_en, type, content_type, status, year,",
		"max_episodes, genre, description, cover_image, source, folder_name, view_count",
		"select id, %s as display_title, type, status, year, cover_image, max_episodes",
		"from anime_titles at",
		"join languages l on l.id = at.language_id",
		"join title_types tt on tt.id = at.title_type_id",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected anime repository to contain %q", fragment)
		}
	}
}

func TestAdminAnimeWritesTargetNormalizedMetadataTables(t *testing.T) {
	content := readRepositorySource(t, "admin_content.go")
	normalized := strings.ToLower(content)

	required := []string{
		"insert into anime_titles (anime_id, language_id, title, title_type_id)",
		"insert into anime_genres (anime_id, genre_id)",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected admin content repository to contain %q", fragment)
		}
	}
}

func TestAnimeV2CreateAndReadPathsPersistRuntimeFields(t *testing.T) {
	createContent := readRepositorySource(t, "admin_content_anime_create_v2.go")
	createNormalized := strings.ToLower(createContent)

	createRequired := []string{
		"loadanimev2schemainfo(ctx, tx)",
		"buildcreateanimev2insertquery(",
		"if schema.hascontenttype {",
		"if schema.hasstatus {",
		"if schema.hasmaxepisodes {",
		"if schema.hassource {",
		"folder_name",
		"loadadminanimeitemv2(ctx, tx, animeid, schema)",
	}
	for _, fragment := range createRequired {
		if !strings.Contains(createNormalized, fragment) {
			t.Fatalf("expected v2 create path to contain %q, got %s", fragment, createContent)
		}
	}

	v2Content := readRepositorySource(t, "anime_v2.go")
	v2Normalized := strings.ToLower(v2Content)

	readRequired := []string{
		"anime.content_type",
		"anime.status",
		"anime.max_episodes",
		"anime.source",
		"anime.folder_name",
	}
	for _, fragment := range readRequired {
		if !strings.Contains(v2Normalized, fragment) {
			t.Fatalf("expected v2 read path to contain %q, got %s", fragment, v2Content)
		}
	}
}

func TestAnimeV2UpdatePathRoutesThroughSchemaAwareWriter(t *testing.T) {
	updateContent := readRepositorySource(t, "admin_content_anime_metadata.go")
	updateNormalized := strings.ToLower(updateContent)

	updateRequired := []string{
		"schema, err := loadanimev2schemainfo(ctx, tx)",
		"if schema.hasslug {",
		"r.updateanimev2(ctx, tx, id, input, actoruserid, schema)",
		"return item, nil",
	}
	for _, fragment := range updateRequired {
		if !strings.Contains(updateNormalized, fragment) {
			t.Fatalf("expected v2 update path to contain %q, got %s", fragment, updateContent)
		}
	}
}

func TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone(t *testing.T) {
	assetContent := readRepositorySource(t, "anime_assets.go")
	assetNormalized := strings.ToLower(assetContent)

	required := []string{
		"usev2schema, err := r.hasv2assetschema(ctx)",
		"return r.assignmanualcoverv2(ctx, animeid, mediaid)",
		"_, err := r.clearcoverwithresult(ctx, animeid)",
		"return r.assignmanualbannerv2(ctx, animeid, mediaid)",
		"return r.clearbannerv2(ctx, animeid)",
		"return r.addmanualbackgroundv2(ctx, animeid, mediaid, providerkey)",
		"return r.removebackgroundv2(ctx, animeid, backgroundid)",
		"return r.applyproviderbannerv2(ctx, animeid, input)",
		"return r.applyproviderbackgroundsv2(ctx, animeid, incoming)",
		"removeanimeposterassetsv2(ctx, tx, animeid, schema)",
		"synclegacyanimecoverimagev2(ctx, tx, animeid, mediaid, schema)",
		"loadv2animemediaidbyref(ctx, tx, trimmedmediaref, \"poster\")",
		"removeanimemedialinksbytype(ctx, tx, animeid, \"poster\")",
		"upsertanimemedialink(ctx, tx, animeid, mediaid, 0)",
	}
	for _, fragment := range required {
		if !strings.Contains(assetNormalized, fragment) {
			t.Fatalf("expected anime asset repository to contain %q, got %s", fragment, assetContent)
		}
	}
}

func TestReleaseRuntimeAuthorityUsesReleaseNativeTables(t *testing.T) {
	repositoryContent := readRepositorySource(t, "episode_version_repository.go")
	repositoryNormalized := strings.ToLower(repositoryContent)

	requiredRepo := []string{
		"func (r *episodeversionrepository) getreleasestreamsource(",
		"from release_versions rev",
		"join release_variants rv on rv.release_version_id = rev.id",
		"join release_streams rs on rs.variant_id = rv.id",
		"join stream_sources ss on ss.id = rs.stream_source_id",
	}
	for _, fragment := range requiredRepo {
		if !strings.Contains(repositoryNormalized, fragment) {
			t.Fatalf("expected release repository compatibility path to contain %q", fragment)
		}
	}

	handlerContent := readBackendSource(t, filepath.Join("internal", "handlers", "episode_version_stream.go"))
	handlerNormalized := strings.ToLower(handlerContent)
	if !strings.Contains(handlerNormalized, "episodeversionrepo.getreleasestreamsource") {
		t.Fatalf("expected release stream handler to resolve streams via episodeVersionRepo.GetReleaseStreamSource")
	}

	assetsHandlerContent := readBackendSource(t, filepath.Join("internal", "handlers", "release_assets_handler.go"))
	assetsNormalized := strings.ToLower(assetsHandlerContent)
	if !strings.Contains(assetsNormalized, "episodeversionrepo.getreleasestreamsource") {
		t.Fatalf("expected release assets handler to validate releases via episodeVersionRepo.GetReleaseStreamSource")
	}
}

func readRepositorySource(t *testing.T, filename string) string {
	t.Helper()
	return readBackendSource(t, filepath.Join("internal", "repository", filename))
}

func readBackendSource(t *testing.T, relativePath string) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("resolve current file path failed")
	}

	backendRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))
	targetPath := filepath.Join(backendRoot, relativePath)

	content, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("read source file %s failed: %v", targetPath, err)
	}

	return string(content)
}
