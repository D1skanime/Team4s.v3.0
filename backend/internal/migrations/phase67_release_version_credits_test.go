package migrations

import (
	"strings"
	"testing"
)

// TestPhase67ReleaseVersionCreditsMigrationContract sichert die Form von
// Migration 0091 ab: nullable FK release_version_id (ON DELETE SET NULL),
// partieller Index sowie der vierspaltige UNIQUE NULLS NOT DISTINCT-Constraint,
// der den 3-Spalten-Constraint aus 0088 ersetzt (P67-SC1, Pitfall 1).
func TestPhase67ReleaseVersionCreditsMigrationContract(t *testing.T) {
	up := strings.ToLower(readMigrationFile(t, "0091_anime_contributions_release_version.up.sql"))
	down := strings.ToLower(readMigrationFile(t, "0091_anime_contributions_release_version.down.sql"))

	assertContainsAll(t, up, []string{
		"add column if not exists release_version_id bigint null",
		"references release_versions(id) on delete set null",
		"drop constraint if exists uq_anime_contribution_member",
		"unique nulls not distinct (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)",
		"idx_anime_contributions_release_version",
	})

	assertContainsAll(t, down, []string{
		"drop constraint if exists uq_anime_contribution_member",
		"drop column if exists release_version_id",
	})
}
