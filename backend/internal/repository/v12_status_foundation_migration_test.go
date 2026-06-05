package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestV12StatusFoundationUpStatements(t *testing.T) {
	content := readMigrationSource(t, "0097_v12_status_foundation.up.sql")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"add column if not exists profile_status",
		"add column if not exists dispute_state",
		"dispute_state in ('none','open','resolved')",
		"create table",
		"review_statuses",
		"'in_review'",
		"'approved'",
		"'rejected'",
		"'archived'",
		"'removed'",
		"add column if not exists visibility_id",
		"references visibilities(id)",
		"add column if not exists review_status_id",
		"references review_statuses(id)",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected migration up SQL to contain %q", fragment)
		}
	}

	memberStatusFragments := []string{"members", "check", "'active'", "'historical'", "'memorial'"}
	for _, fragment := range memberStatusFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected members profile_status definition to contain %q", fragment)
		}
	}
}

func TestV12StatusFoundationDownMirrors(t *testing.T) {
	content := readMigrationSource(t, "0097_v12_status_foundation.down.sql")
	normalized := strings.ToLower(content)

	requiredFragments := []string{
		"drop column if exists profile_status",
		"drop column if exists dispute_state",
		"drop column if exists visibility_id",
		"drop column if exists review_status_id",
		"drop table",
		"review_statuses",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected migration down SQL to contain %q", fragment)
		}
	}
}

func TestV12StatusFoundationLeavesContentStatusUntouched(t *testing.T) {
	upSQL := strings.ToLower(readMigrationSource(t, "0097_v12_status_foundation.up.sql"))
	downSQL := strings.ToLower(readMigrationSource(t, "0097_v12_status_foundation.down.sql"))

	for _, sql := range []string{upSQL, downSQL} {
		assertColumnNotAltered(t, sql, "anime_contributions", "status")
		assertColumnNotAltered(t, sql, "media_assets", "status")
		assertNoUniqueDisputeState(t, sql)
	}
}

func readMigrationSource(t *testing.T, name string) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("resolve current file path failed")
	}

	backendRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))
	targetPath := filepath.Join(backendRoot, "..", "database", "migrations", name)

	content, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("read migration source file %s failed: %v", targetPath, err)
	}

	return string(content)
}

func assertColumnNotAltered(t *testing.T, sql string, tableName string, columnName string) {
	t.Helper()

	normalized := strings.ReplaceAll(sql, "\r\n", "\n")
	statements := strings.Split(normalized, ";")
	for _, statement := range statements {
		compact := strings.Join(strings.Fields(statement), " ")
		if !strings.Contains(compact, "alter table "+tableName) {
			continue
		}
		if strings.Contains(compact, "add column if not exists "+columnName) ||
			strings.Contains(compact, "drop column if exists "+columnName) ||
			strings.Contains(compact, "alter column "+columnName) {
			t.Fatalf("expected migration not to alter %s.%s, got statement %q", tableName, columnName, compact)
		}
	}
}

func assertNoUniqueDisputeState(t *testing.T, sql string) {
	t.Helper()

	statements := strings.Split(strings.ReplaceAll(sql, "\r\n", "\n"), ";")
	for _, statement := range statements {
		compact := strings.Join(strings.Fields(statement), " ")
		if strings.Contains(compact, "unique") && strings.Contains(compact, "dispute_state") {
			t.Fatalf("expected dispute_state not to appear in UNIQUE statements, got %q", compact)
		}
	}
}
