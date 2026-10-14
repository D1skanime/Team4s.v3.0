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
		"select anime.id, title, title_de, title_en, type, content_type, status, year,",
		"max_episodes, genre, description, cover_image,",
		"as banner_url",
		"source, folder_name, anisearch_id, view_count",
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
		"if schema.hasanisearchid {",
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
		"mt.name = 'banner'",
		"as banner_url",
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

func TestAnimeAssetRepositoryNoLongerHasLegacyV2SchemaDetection(t *testing.T) {
	// 182-01: hasV2AssetSchema/hasAnimeMediaTable/ensureAnimeMediaAsset and their
	// gated "if useV2Schema { ... } else { legacy SQL }" branches were removed from
	// every anime_assets*.go write/read-dispatch function -- anime_media always
	// exists in production, so the false branch was dead. This supersedes
	// TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone, which
	// asserted on exact source fragments of the now-removed dual-path code and is
	// itself a source-grep test (CLAUDE.md Teststil "Verboten"). This check is kept
	// as an absence check (CLAUDE.md Teststil exception 1: "ein Bezeichner darf
	// NIRGENDS in der Datei vorkommen"), not a behavior assertion -- the real V2
	// behavior is proven by TestGetResolvedAssetsV2_*/TestGetByIDV2_* (Postgres
	// integration tests in anime_display_variant_test.go) and the httptest-backed
	// asset handler suites.
	forbiddenSymbols := []string{"hasv2assetschema", "hasanimemediatable(", "ensureanimemediaasset"}
	for _, filename := range []string{
		"anime_assets.go",
		"anime_assets_cover.go",
		"anime_assets_banner_logo.go",
		"anime_assets_background.go",
		"anime_assets_background_video.go",
	} {
		normalized := strings.ToLower(readRepositorySource(t, filename))
		for _, symbol := range forbiddenSymbols {
			if strings.Contains(normalized, symbol) {
				t.Fatalf("expected %s to no longer reference removed legacy symbol %q", filename, symbol)
			}
		}
	}
}

func TestReleaseRuntimeAuthorityUsesReleaseNativeTables(t *testing.T) {
	repositoryContent := readRepositorySource(t, "episode_version_repository.go")
	repositoryNormalized := strings.ToLower(repositoryContent)

	requiredRepo := []string{
		"func (r *episodeversionrepository) getreleasestreamsource(",
		"from release_versions rev",
		"join fansub_releases fr on fr.id=rev.release_id",
		"join episodes e on e.id=fr.episode_id",
		"join lateral (`+selectedreleasevariantsourcesql+`) selected on true",
		"where rev.id=$1 and selected.provider_type is not null",
	}
	for _, fragment := range requiredRepo {
		if !strings.Contains(repositoryNormalized, fragment) {
			t.Fatalf("expected release repository compatibility path to contain %q", fragment)
		}
	}

	sharedSourceQuery := strings.ToLower(strings.Join(strings.Fields(selectedReleaseVariantSourceSQL), " "))
	for _, fragment := range []string{
		"from release_variants rv",
		"from release_streams rs join stream_sources ss on ss.id=rs.stream_source_id",
		"where rs.variant_id=rv.id",
		"where rv.release_version_id=$1 and ($2::bigint=0 or rv.id=$2)",
	} {
		if !strings.Contains(sharedSourceQuery, fragment) {
			t.Fatalf("expected shared release source selector to preserve canonical ownership %q", fragment)
		}
	}

	handlerContent := readBackendSource(t, filepath.Join("internal", "handlers", "episode_version_stream.go"))
	handlerNormalized := strings.ToLower(handlerContent)
	if !strings.Contains(handlerNormalized, "episodeversionrepo.getreleasestreamsource") {
		t.Fatalf("expected release stream handler to resolve streams via episodeVersionRepo.GetReleaseStreamSource")
	}

	assetsHandlerContent := readBackendSource(t, filepath.Join("internal", "handlers", "release_assets_handler.go"))
	assetsNormalized := strings.ToLower(assetsHandlerContent)
	// ListReleaseAssets lives in episode_version_repository_read_helpers.go after the split.
	readHelpersContent := strings.ToLower(readRepositorySource(t, "episode_version_repository_read_helpers.go"))
	if !strings.Contains(readHelpersContent, "func (r *episodeversionrepository) listreleaseassets(") ||
		!strings.Contains(readHelpersContent, "from release_media rm") ||
		!strings.Contains(readHelpersContent, "join media_assets ma on ma.id = rm.media_id") {
		t.Fatalf("expected release assets repository path to read release_media joined to media_assets")
	}
	if !strings.Contains(assetsNormalized, "episodeversionrepo.listreleaseassets") {
		t.Fatalf("expected release assets handler to load assets via episodeVersionRepo.ListReleaseAssets")
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
