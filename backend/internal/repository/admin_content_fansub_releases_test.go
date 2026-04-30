package repository

import (
	"strings"
	"testing"
)

// TestAdminContentFansubReleases_DTOsExistInModels verifies that the
// AdminFansubReleaseSummary and CanonicalFansubAnimeReleaseResponse types are
// defined in the models package. This test reads the source file directly so it
// fails before the types exist (RED phase).
func TestAdminContentFansubReleases_DTOsExistInModels(t *testing.T) {
	// We test via source inspection because the types live in models/, not in
	// this package. The acceptance criteria require that
	// `Select-String -Path backend/internal/models/*.go -Pattern
	//   "AdminFansubRelease|CanonicalRelease"` returns matches.

	releaseModels := readRepositorySource(t, "../models/admin_release_theme_assets.go")
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
// GetAdminReleaseByID exist in the admin themes repository file.
func TestAdminContentFansubReleases_RepositoryMethodsExist(t *testing.T) {
	content := readRepositorySource(t, "admin_content_anime_themes.go")
	normalized := strings.ToLower(content)

	requiredMethods := []string{
		"listfansubanimereleases",
		"getcanonicalfansubanimereleassummary",
		"getadminreleasebyid",
	}
	for _, method := range requiredMethods {
		if !strings.Contains(normalized, method) {
			t.Fatalf("expected repository method %q to exist in admin_content_anime_themes.go", method)
		}
	}
}

// TestAdminContentFansubReleases_ReleaseSummaryContainsRequiredFields verifies
// that the release summary DTO carries the fields the plan requires: release
// identity, anime context, fansub/group context, episode anchor, source/provider
// metadata, and version summary.
func TestAdminContentFansubReleases_ReleaseSummaryContainsRequiredFields(t *testing.T) {
	content := readRepositorySource(t, "../models/admin_release_theme_assets.go")
	normalized := strings.ToLower(content)

	// These field names must appear in the DTO definition.
	requiredFields := []string{
		"release_id",
		"anime_id",
		"fansub_group_id",
		"episode_id",
		"version_count",
		"has_theme_assets",
	}
	for _, field := range requiredFields {
		if !strings.Contains(normalized, field) {
			t.Fatalf("expected DTO field %q to exist in admin_release_theme_assets.go", field)
		}
	}
}

// TestAdminContentFansubReleases_CanonicalResponseWrapsReleaseSummary verifies
// that CanonicalFansubAnimeReleaseResponse references or embeds the release
// summary type so consumers get both canonical status and release metadata in
// one response.
func TestAdminContentFansubReleases_CanonicalResponseWrapsReleaseSummary(t *testing.T) {
	content := readRepositorySource(t, "../models/admin_release_theme_assets.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "release *adminfansubreleasesummary") {
		t.Fatalf("expected CanonicalFansubAnimeReleaseResponse to contain a *AdminFansubReleaseSummary field")
	}
}
