package repository

import (
	"os"
	"strings"
	"testing"
)

func TestApplyEpisodeVersionVariantMetadataWritesCRC32(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_version_repository_write_helpers.go")
	if err != nil {
		t.Fatalf("read write helper source: %v", err)
	}
	source := string(content)

	if !strings.Contains(source, "crc32 = $3") {
		t.Fatal("expected variant metadata update to write crc32")
	}
}

// TestResolveImportFansubMemberGroups_RejectsUnknownGroupID prüft per Source-Scan,
// dass ErrNotFound-Validierung vor dem Gruppen-Upsert ausgewertet wird (P81-SC6).
// Nach dem Helper-Split (Plan 03) liegt lookupImportFansubGroupByID (ErrNotFound) in
// episode_import_repository_fansub_helpers.go, upsertImportFansubGroup ebenfalls dort.
func TestResolveImportFansubMemberGroups_RejectsUnknownGroupID(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_import_repository_fansub_helpers.go")
	if err != nil {
		t.Fatalf("read fansub helper source: %v", err)
	}
	source := string(content)

	errNotFoundIdx := strings.Index(source, "ErrNotFound")
	upsertIdx := strings.Index(source, "upsertImportFansubGroup(")
	if errNotFoundIdx < 0 {
		t.Fatal("expected ErrNotFound sentinel to appear in episode_import_repository_fansub_helpers.go")
	}
	if upsertIdx < 0 {
		t.Fatal("expected upsertImportFansubGroup to appear in episode_import_repository_fansub_helpers.go")
	}
	if errNotFoundIdx > upsertIdx {
		t.Fatal("expected ErrNotFound check to occur before upsertImportFansubGroup call")
	}
}

// TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup prüft per Source-Scan,
// dass buildAnimeFansubLinkGroupIDs die neue flache Gruppen-Slice-Signatur hat (keine EffectiveGroup mehr).
// Schlägt RED fehl weil der aktuelle Source noch resolvedImportFansubSelection als Parameter zeigt (Plan 03).
func TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatalf("read release helper source: %v", err)
	}
	source := string(content)

	// Die neue Signatur nimmt []resolvedImportFansubGroup — nicht resolvedImportFansubSelection.
	// Solange die alte Signatur besteht, schlägt dieser Check fehl.
	newSigIdx := strings.Index(source, "func buildAnimeFansubLinkGroupIDs(memberGroups []resolvedImportFansubGroup)")
	if newSigIdx < 0 {
		t.Fatal("expected buildAnimeFansubLinkGroupIDs to use flat []resolvedImportFansubGroup parameter (D-03) — aktuelle Signatur nutzt noch resolvedImportFansubSelection")
	}
}
