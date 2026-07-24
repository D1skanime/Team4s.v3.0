package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func readReleaseCrewSnapshotSource(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "release_crew_snapshot_repository.go"))
	if err != nil {
		t.Fatalf("read snapshot repository: %v", err)
	}
	return strings.ToLower(string(content))
}

func TestReleaseCrewSnapshot_NormalizesMemberRoleUnits(t *testing.T) {
	rows := normalizeReleaseCrewRows([]ReleaseCrewRow{
		{MemberID: 2, RoleCodes: []string{"quality_checker", "editor", "quality_checker"}},
		{MemberID: 1, RoleCodes: []string{"translator"}},
		{MemberID: 2, RoleCodes: []string{"editor"}},
	})
	if len(rows) != 2 {
		t.Fatalf("expected two members, got %#v", rows)
	}
	if rows[0].MemberID != 1 || strings.Join(rows[0].RoleCodes, ",") != "translator" {
		t.Fatalf("unexpected first row: %#v", rows[0])
	}
	if rows[1].MemberID != 2 || strings.Join(rows[1].RoleCodes, ",") != "editor,quality_checker" {
		t.Fatalf("unexpected second row: %#v", rows[1])
	}
}

func TestEveryReleaseReadsCompleteStoredSnapshot(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"func (r *releasecrewsnapshotrepository) loadcomplete(",
		"from release_crew_snapshots",
		"ac.status = 'confirmed'",
		"snapshotmodeindependent",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing complete stored snapshot contract %q", fragment)
		}
	}
	if strings.Contains(source, "anime_default") {
		t.Fatal("snapshot repository must not contain project-default read fallback")
	}
}

func TestProjectCrewChangeSyncsInheritedSnapshotsOnly(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"func (r *releasecrewsnapshotrepository) syncinheritedforprojectintx(",
		"rcs.snapshot_mode = 'inherited'",
		"ac.release_version_id is null",
		"ac.status = 'confirmed'",
		"pg_advisory_xact_lock",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing inherited-only synchronization contract %q", fragment)
		}
	}
}

func TestReleaseCrewSnapshot_ConfirmedOnlyReplacementPreservesReviewRows(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"delete from anime_contributions",
		"status = 'confirmed'",
		"insert into anime_contributions",
		"'confirmed'",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing confirmed-only replacement contract %q", fragment)
		}
	}
	for _, status := range []string{"proposed", "draft", "disputed", "hidden"} {
		if strings.Contains(source, "status = '"+status+"'") {
			t.Fatalf("snapshot mutation must not target %s rows", status)
		}
	}
}
