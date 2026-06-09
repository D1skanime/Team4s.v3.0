package repository

import (
	"os"
	"strings"
	"testing"
)

// TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows prüft per Source-Scan,
// dass der Write-Helper N Junction-Zeilen via INSERT ON CONFLICT DO NOTHING schreibt
// anstatt einen einzelnen EffectiveGroup-Wert (P81-SC1, RED — erst Plan 03 grün).
func TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_version_repository_write_helpers.go")
	if err != nil {
		t.Fatalf("read write helper source: %v", err)
	}
	source := string(content)

	insertIdx := strings.Index(source, "INSERT INTO release_version_groups")
	onConflictDoNothingIdx := strings.Index(source, "ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING")
	if insertIdx < 0 {
		t.Fatal("expected episode_version_repository_write_helpers.go to contain INSERT INTO release_version_groups")
	}
	if onConflictDoNothingIdx < 0 {
		t.Fatal("expected INSERT to use ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING for N-fach-Idempotenz")
	}
	if onConflictDoNothingIdx < insertIdx {
		t.Fatal("expected ON CONFLICT DO NOTHING to appear after INSERT INTO release_version_groups")
	}
}

// TestResolveImportFansubMemberGroups_RejectsUnknownGroupID prüft per Source-Scan,
// dass ErrNotFound-Validierung vor dem Gruppen-Upsert ausgewertet wird (P81-SC6).
func TestResolveImportFansubMemberGroups_RejectsUnknownGroupID(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatalf("read release helper source: %v", err)
	}
	source := string(content)

	errNotFoundIdx := strings.Index(source, "ErrNotFound")
	upsertIdx := strings.Index(source, "upsertImportFansubGroup(")
	if errNotFoundIdx < 0 {
		t.Fatal("expected ErrNotFound sentinel to appear in episode_import_repository_release_helpers.go")
	}
	if upsertIdx < 0 {
		t.Fatal("expected upsertImportFansubGroup to appear in episode_import_repository_release_helpers.go")
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
