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

// TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup (Phase 81's own
// D-03, unrelated to Phase 187) was deleted (Phase 187, Plan 03, Task 1): it was a
// file-path-coupled source-grep asserting buildAnimeFansubLinkGroupIDs' flat
// []resolvedImportFansubGroup signature lived in episode_import_repository_release_helpers.go.
// Moving buildAnimeFansubLinkGroupIDs out of that file into
// episode_import_repository_release_groups.go (alongside upsertReleaseVersionGroup, to satisfy
// CLAUDE.md's 450-line limit) made this grep permanently false regardless of the signature's
// correctness. The claim itself (a flat, non-EffectiveGroup slice parameter) is already
// behavior-proven by TestBuildAnimeFansubLinkGroupIDs_IsIdempotentAcrossRepeatedApply
// (episode_import_repository_test.go), which calls buildAnimeFansubLinkGroupIDs with exactly
// that signature and would fail to compile otherwise -- a stronger guarantee than a string
// match. CLAUDE.md's Teststil rule forbids extending the source-grep pattern by relocating the
// grep target into the new file.
