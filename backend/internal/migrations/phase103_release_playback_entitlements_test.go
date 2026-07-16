package migrations

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPhase103ReleasePlaybackEntitlementMigrationStructure(t *testing.T) {
	_, filename, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
	upPath := filepath.Join(root, "database", "migrations", "0129_release_playback_entitlements.up.sql")
	downPath := filepath.Join(root, "database", "migrations", "0129_release_playback_entitlements.down.sql")
	upBytes, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("read up migration: %v", err)
	}
	downBytes, err := os.ReadFile(downPath)
	if err != nil {
		t.Fatalf("read down migration: %v", err)
	}
	up := strings.ToLower(string(upBytes))
	down := strings.ToLower(string(downBytes))

	for _, required := range []string{
		"create table release_playback_entitlement_rules",
		"subject_type in ('app_user', 'role')",
		"effect in ('allow', 'deny')",
		"scope_type in ('global', 'group', 'project', 'release')",
		"subject_app_user_id", "subject_role_code", "fansub_group_id", "anime_id", "release_version_id",
		"scope_type = 'global'", "scope_type = 'group'", "scope_type = 'project'", "scope_type = 'release'",
	} {
		if !strings.Contains(up, required) {
			t.Errorf("up migration missing %q", required)
		}
	}
	if strings.Contains(up, "episode_id") {
		t.Error("entitlement migration must not define a neutral episode scope")
	}
	if !strings.Contains(down, "drop table if exists release_playback_entitlement_rules") {
		t.Error("down migration is not reversible")
	}
}

func TestPhase103ScopeCheckRejectsMixedScopeShape(t *testing.T) {
	_, filename, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
	content, err := os.ReadFile(filepath.Join(root, "database", "migrations", "0129_release_playback_entitlements.up.sql"))
	if err != nil {
		t.Fatal(err)
	}
	sql := strings.ToLower(string(content))
	for _, guard := range []string{
		"scope_type = 'global' and fansub_group_id is null and anime_id is null and release_version_id is null",
		"scope_type = 'group' and fansub_group_id is not null and anime_id is null and release_version_id is null",
		"scope_type = 'project' and fansub_group_id is not null and anime_id is not null and release_version_id is null",
		"scope_type = 'release' and fansub_group_id is null and anime_id is null and release_version_id is not null",
	} {
		if !strings.Contains(sql, guard) {
			t.Errorf("mixed-scope guard missing: %s", guard)
		}
	}
}
