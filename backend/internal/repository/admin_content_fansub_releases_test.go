package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readFansubReleasesSource laedt eine Quelldatei relativ zur Test-Datei.
func readFansubReleasesSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

// TestAdminContentFansubReleases_DTOsExistInModels verifies that the
// AdminFansubReleaseSummary and CanonicalFansubAnimeReleaseResponse types are
// defined in the models package. This test reads the source file directly so it
// fails before the types exist (RED phase).
func TestAdminContentFansubReleases_DTOsExistInModels(t *testing.T) {
	// The acceptance criteria require that
	// `Select-String -Path backend/internal/models/*.go -Pattern
	//   "AdminFansubRelease|CanonicalRelease"` returns matches.

	releaseModels := readFansubReleasesSource(t, "../models/admin_release_theme_assets.go")
	normalized := strings.ToLower(releaseModels)

	requiredTypes := []string{
		"adminfansubreleasesummary",
		"canonicalfansubanimereleaseresponse",
	}
	for _, typeName := range requiredTypes {
		if !strings.Contains(normalized, typeName) {
			t.Fatalf("expected model type %q to exist in admin_release_theme_assets.go", typeName)
		}
	}
}

// TestAdminContentFansubReleases_RepositoryMethodsExist verifies that
// ListFansubAnimeReleases, GetCanonicalFansubAnimeReleaseSummary, and
// GetAdminReleaseByID exist in the repository package.
func TestAdminContentFansubReleases_RepositoryMethodsExist(t *testing.T) {
	// Methods land in admin_content_fansub_releases.go which is the dedicated
	// Phase-30 release file, consistent with the plan's file_modified list.
	content := readFansubReleasesSource(t, "admin_content_fansub_releases.go")
	normalized := strings.ToLower(content)

	requiredMethods := []string{
		"listfansubanimereleases",
		"getcanonicalfansubanimereleasesum",
		"getadminreleasebyid",
	}
	for _, method := range requiredMethods {
		if !strings.Contains(normalized, method) {
			t.Fatalf("expected repository method %q to exist in admin_content_fansub_releases.go", method)
		}
	}
}

// TestAdminContentFansubReleases_ReleaseSummaryContainsRequiredFields verifies
// that the release summary DTO carries the fields the plan requires.
func TestAdminContentFansubReleases_ReleaseSummaryContainsRequiredFields(t *testing.T) {
	content := readFansubReleasesSource(t, "../models/admin_release_theme_assets.go")
	normalized := strings.ToLower(content)

	// These json tag names must appear in the DTO definition.
	requiredFields := []string{
		"release_id",
		"release_version_id",
		"anime_id",
		"fansub_group_id",
		"episode_id",
		"version_count",
		"has_theme_assets",
		"duration_seconds",
	}
	for _, field := range requiredFields {
		if !strings.Contains(normalized, field) {
			t.Fatalf("expected DTO json field %q to exist in admin_release_theme_assets.go", field)
		}
	}
}

func TestAdminContentFansubReleases_ReleaseSummarySelectsCanonicalReleaseVersionID(t *testing.T) {
	content := readFansubReleasesSource(t, "admin_content_fansub_releases.go")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"as release_version_id",
		"count(distinct rv2.id)",
		"min(rv2.id)",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("expected repository query to include %q", pattern)
		}
	}
}

func TestAdminContentFansubReleases_UsesCanonicalFansubGroupColumn(t *testing.T) {
	content := readFansubReleasesSource(t, "admin_content_fansub_releases.go")
	normalized := strings.ToLower(content)

	if strings.Contains(normalized, "fansubgroup_id") {
		t.Fatalf("repository must not use legacy release_version_groups.fansubgroup_id")
	}
	if !strings.Contains(normalized, "rvg.fansub_group_id = $1") {
		t.Fatalf("expected fansub release queries to scope through release_version_groups.fansub_group_id")
	}
}

func TestAdminContentFansubReleases_ReleaseSummarySelectsVariantDuration(t *testing.T) {
	content := readFansubReleasesSource(t, "admin_content_fansub_releases.go")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"as duration_seconds",
		"release_variants",
		"rv.duration_seconds",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("expected repository query to include %q", pattern)
		}
	}
}

// TestAdminContentFansubReleases_CanonicalResponseWrapsReleaseSummary verifies
// that CanonicalFansubAnimeReleaseResponse references the release summary type.
func TestAdminContentFansubReleases_CanonicalResponseWrapsReleaseSummary(t *testing.T) {
	content := readFansubReleasesSource(t, "../models/admin_release_theme_assets.go")
	normalized := strings.ToLower(content)

	// The field name can be any pointer to AdminFansubReleaseSummary.
	if !strings.Contains(normalized, "*adminfansubreleasesummary") {
		t.Fatalf("expected CanonicalFansubAnimeReleaseResponse to contain a *AdminFansubReleaseSummary pointer field")
	}
}
