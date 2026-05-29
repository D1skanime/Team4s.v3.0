package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAnimeFansubJoinMigration_FansubDeleteCascadesDetach(t *testing.T) {
	content := readMigrationFile(t, "0011_anime_fansub_groups.up.sql")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "fansub_group_id bigint not null references fansub_groups (id) on delete cascade") {
		t.Fatalf("expected anime_fansub_groups.fansub_group_id foreign key with ON DELETE CASCADE")
	}
}

func TestReleaseVersionGroupsLegacyFansubgroupIDMigrationDropsOnlyAfterSafetyCheck(t *testing.T) {
	content := readMigrationFile(t, "0057_drop_release_version_groups_fansubgroup_id.up.sql")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"mismatched_rows",
		"fansubgroup_id <> fansub_group_id",
		"drop column if exists fansubgroup_id",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("expected migration 0057 to include %q", pattern)
		}
	}
}

func TestMemberProfileActivityDateMigrationKeepsYearLimitedDates(t *testing.T) {
	upContent := strings.ToLower(readMigrationFile(t, "0079_member_profile_activity_dates.up.sql"))
	downContent := strings.ToLower(readMigrationFile(t, "0079_member_profile_activity_dates.down.sql"))

	requiredUpPatterns := []string{
		"add column if not exists active_from_date date",
		"add column if not exists active_until_date date",
		"active_from_date = make_date(active_from_year, 1, 1)",
		"chk_members_active_dates_year_limited",
		"extract(month from active_from_date) = 1",
		"extract(day from active_until_date) = 1",
		"extract(year from active_from_date)::int between 1970 and 2100",
		"chk_members_active_date_range",
		"active_until_date >= active_from_date",
	}
	for _, pattern := range requiredUpPatterns {
		if !strings.Contains(upContent, pattern) {
			t.Fatalf("expected migration 0079 up to include %q", pattern)
		}
	}

	requiredDownPatterns := []string{
		"drop constraint if exists chk_members_active_date_range",
		"drop constraint if exists chk_members_active_dates_year_limited",
		"drop column if exists active_from_date",
		"drop column if exists active_until_date",
	}
	for _, pattern := range requiredDownPatterns {
		if !strings.Contains(downContent, pattern) {
			t.Fatalf("expected migration 0079 down to include %q", pattern)
		}
	}
}

func readMigrationFile(t *testing.T, filename string) string {
	t.Helper()

	path := filepath.Join("..", "..", "..", "database", "migrations", filename)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file %s failed: %v", filename, err)
	}

	return string(content)
}
