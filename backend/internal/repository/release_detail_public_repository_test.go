package repository

// Tests fuer ReleaseDetailPublicRepository (AO4-02).
//
// Das repository-Paket hat keine Live-DB-Test-Infrastruktur (siehe testmain_test.go —
// nur ein permissions.Catalog-Stub, kein Postgres-Pool). Analog zu bestehenden
// Repository-Tests ohne DB-Fixture (z. B. TestCreateCanLinkOpenHistoricalMemberByVerifiedClaim
// in fansub_group_app_members_repository_test.go, oder anime_contributions_public_versions_repository_test.go)
// wird daher per Source-Assertion geprueft:
//   1. Der NotFound-Pfad prueft explizit pgx.ErrNoRows VOR jedem Feldzugriff und
//      gibt ErrNotFound zurueck — kann also nicht auf einer leeren Row paniken.
//   2. Die drei Sichtbarkeits-Gates (Bilder/Texte/Beteiligte) sind exakt wie in
//      AO4-02 gefordert im Quelltext vorhanden.

import (
	"strings"
	"testing"
)

func TestGetPublicReleaseDetail_NotFoundPathChecksErrNoRowsBeforeUse(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))

	required := []string{
		"func (r *releasedetailpublicrepository) loadreleaseheader(",
		"errors.is(err, pgx.errnorows)",
		"return nil, errnotfound",
		"join release_version_groups rvg on rvg.release_version_id = rv.id",
		"e.anime_id = $2",
		"rvg.fansub_group_id = $3",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected release detail header lookup to guard pgx.ErrNoRows before use and scope by anime+group, missing %q", fragment)
		}
	}

	// pgx.ErrNoRows muss VOR dem generischen err!=nil-Fall geprueft werden, sonst
	// wuerde der generische Fall zuerst greifen und nie ErrNotFound zurueckgeben.
	noRowsIdx := strings.Index(content, "errors.is(err, pgx.errnorows)")
	genericErrIdx := strings.Index(content, "if err != nil {\n\t\treturn nil, fmt.errorf(\"release detail: load header")
	if noRowsIdx == -1 || genericErrIdx == -1 || noRowsIdx > genericErrIdx {
		t.Fatalf("expected pgx.ErrNoRows check to precede the generic error branch in loadReleaseHeader")
	}
}

func TestGetPublicReleaseDetail_VisibilityGatesMatchAO4_02(t *testing.T) {
	helpersContent := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))

	imageGate := []string{
		"from release_version_media rvm",
		"v.name = 'public'",
		"rs.code = 'approved'",
		"ma.status = 'ready'",
		"rvm.deleted_at is null",
	}
	for _, fragment := range imageGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected image visibility gate to contain %q", fragment)
		}
	}

	noteGate := []string{
		"from release_version_notes rvn",
		"rvn.visibility = 'public'",
		"rvn.status = 'published'",
		"rvn.deleted_at is null",
	}
	for _, fragment := range noteGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected note visibility gate to contain %q", fragment)
		}
	}

	contributorGate := []string{
		"from anime_contributions ac",
		"ac.is_public_on_anime_page = true",
		"coalesce(v.name, 'public') = 'public'",
	}
	for _, fragment := range contributorGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected contributor visibility gate to contain %q", fragment)
		}
	}
}

func TestGetPublicReleaseDetail_ResponseFieldsPresent(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))

	required := []string{
		"images_count",
		"notes_count",
		"contributors_count",
		"release_date",
		"contributors",
		"images",
		"notes",
		"category",
		"episode_title",
		"subtitle_tracks",
		"preview_image",
		"image_category_totals",
		"segments",
		"previous",
		"next",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected PublicReleaseDetail DTO to expose %q", fragment)
		}
	}
}

func TestGetPublicReleaseDetail_UsesSelectedPreviewAndExactReleaseScope(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))
	helpers := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))
	for _, fragment := range []string{"if images[i].ispreviewcandidate", "rvm.is_preview_candidate", "ac.release_version_id = $1", "rv.release_version_id=$1", "release_version_groups rvg"} {
		if !strings.Contains(content+helpers, fragment) {
			t.Fatalf("missing release projection guard %q", fragment)
		}
	}
}

func TestReleaseImageCategoriesAreIndependentAndValidated(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))
	helpers := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))
	for _, fragment := range []string{"ispublicreleaseimagecategory(category)", "rvm.category = $2", "count(*) filter(where rvm.category='screenshot')", "count(*) filter(where rvm.category='typesetting_karaoke')", "returnedcount"} {
		if !strings.Contains(content+helpers, fragment) {
			t.Fatalf("missing category cursor behavior %q", fragment)
		}
	}
}

func TestReleaseNavigationKeepsGroupAndPrefersVersion(t *testing.T) {
	helpers := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))
	for _, fragment := range []string{"rvg.fansub_group_id=$3", "case when rv.version=$4 then 0 else 1", "groupid"} {
		if !strings.Contains(helpers, fragment) {
			t.Fatalf("missing same-group navigation behavior %q", fragment)
		}
	}
}
