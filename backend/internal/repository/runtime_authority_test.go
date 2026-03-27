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
		"max_episodes, genre, description, cover_image, view_count",
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

func TestReleaseRuntimeAuthorityStillDependsOnEpisodeVersions(t *testing.T) {
	repositoryContent := readRepositorySource(t, "episode_version_repository.go")
	repositoryNormalized := strings.ToLower(repositoryContent)

	requiredRepo := []string{
		"func (r *episodeversionrepository) getreleasestreamsource(",
		"select id, anime_id, media_provider, media_item_id, stream_url",
		"from episode_versions",
	}
	for _, fragment := range requiredRepo {
		if !strings.Contains(repositoryNormalized, fragment) {
			t.Fatalf("expected episode version repository to contain %q", fragment)
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
