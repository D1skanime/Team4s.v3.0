package migrations_test

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

const (
	phase108Up   = "0137_phase108_contribution_sources.up.sql"
	phase108Down = "0137_phase108_contribution_sources.down.sql"
)

func TestPhase108MigrationUpDown(t *testing.T) {
	pool := openPhase108Pool(t)

	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108Down))
	for _, table := range phase108Tables() {
		assertPhase108TableExists(t, pool, table, false)
	}

	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108Up))
	for _, table := range phase108Tables() {
		assertPhase108TableExists(t, pool, table, true)
	}
}

func TestPhase108PointRules(t *testing.T) {
	pool := openPhase108Pool(t)

	rows, err := pool.Query(context.Background(), `
SELECT rule_code, category, point_value
FROM point_rules
WHERE (rule_code, rule_version) IN (
    ('release_role_work', 1),
    ('project_text_first_author', 1)
)
ORDER BY rule_code`)
	require.NoError(t, err)
	defer rows.Close()

	type rule struct {
		code, category string
		value          int
	}
	var got []rule
	for rows.Next() {
		var item rule
		require.NoError(t, rows.Scan(&item.code, &item.category, &item.value))
		got = append(got, item)
	}
	require.NoError(t, rows.Err())
	require.Equal(t, []rule{
		{code: "project_text_first_author", category: "platform_contribution", value: 5},
		{code: "release_role_work", category: "fansub_work", value: 1},
	}, got)

	_, err = pool.Exec(context.Background(), `
UPDATE point_rules SET point_value = 99
WHERE rule_code = 'release_role_work' AND rule_version = 1`)
	require.Error(t, err, "point rules remain immutable")
}

func TestPhase108SnapshotAndLifecycleConstraints(t *testing.T) {
	pool := openPhase108Pool(t)
	seedPhase108Owners(t, pool)

	_, err := pool.Exec(context.Background(), `
INSERT INTO release_crew_snapshots (release_version_id, fansub_group_id, snapshot_mode)
VALUES (31, 41, 'independent')`)
	require.NoError(t, err, "an empty independent snapshot is represented by its context row")

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_crew_snapshots (release_version_id, fansub_group_id, snapshot_mode)
VALUES (32, 41, 'fallback')`)
	require.Error(t, err, "only inherited and independent are valid")

	var awardID int64
	require.NoError(t, pool.QueryRow(context.Background(), `
INSERT INTO point_ledger_entries (
    member_id, fansub_group_id, release_version_id,
    source_type, source_key, rule_id,
    rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
    rule_point_value_snapshot, point_value, entry_kind,
    effective_at, idempotency_key
)
SELECT 51, 41, 31, 'release_role', '31:41:51:timing:1', id,
       rule_code, rule_version, category, point_value, point_value, 'award',
       NOW(), 'phase108-award-1'
FROM point_rules
WHERE rule_code = 'release_role_work' AND rule_version = 1
RETURNING id`).Scan(&awardID))

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_role_credit_lifecycles (
    release_version_id, fansub_group_id, member_id, role_code,
    generation, award_entry_id, lifecycle_status
) VALUES (31, 41, 51, 'timing', 1, $1, 'awarded')`, awardID)
	require.NoError(t, err)

	var reversalID int64
	require.NoError(t, pool.QueryRow(context.Background(), `
INSERT INTO point_ledger_entries (
    member_id, fansub_group_id, release_version_id,
    source_type, source_key, rule_id,
    rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
    rule_point_value_snapshot, point_value, entry_kind,
    reversal_of_entry_id, reversal_reason, effective_at, idempotency_key
)
SELECT member_id, fansub_group_id, release_version_id,
       source_type, source_key, rule_id,
       rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
       rule_point_value_snapshot, -rule_point_value_snapshot, 'reversal',
       id, 'crew unit removed', NOW(), 'phase108-reversal-1'
FROM point_ledger_entries WHERE id = $1
RETURNING id`, awardID).Scan(&reversalID))

	_, err = pool.Exec(context.Background(), `
UPDATE release_role_credit_lifecycles
SET lifecycle_status = 'reversed', reversal_entry_id = $2
WHERE award_entry_id = $1`, awardID, reversalID)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_role_credit_lifecycles (
    release_version_id, fansub_group_id, member_id, role_code,
    generation, lifecycle_status
) VALUES (31, 41, 51, 'timing', 2, 'pending')`)
	require.NoError(t, err, "a reversed unit can receive a new append-only generation")

	_, err = pool.Exec(context.Background(), `
INSERT INTO release_role_credit_lifecycles (
    release_version_id, fansub_group_id, member_id, role_code,
    generation, lifecycle_status
) VALUES (31, 41, 51, 'timing', 2, 'pending')`)
	require.Error(t, err, "the same restoration generation cannot be duplicated")

	var ledgerCount int
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM point_ledger_entries WHERE id IN ($1, $2)`,
		awardID, reversalID).Scan(&ledgerCount))
	require.Equal(t, 2, ledgerCount, "award and reversal history remain append-only")
}

func TestPhase108MigrationContainsNoBackfillOrCompatibilityCopy(t *testing.T) {
	for _, name := range []string{phase108Up, phase108Down} {
		sql := executablePhase108SQL(t, name)
		for _, forbidden := range []*regexp.Regexp{
			regexp.MustCompile(`(?is)\binsert\s+into\b[\s\S]*?\bselect\b`),
			regexp.MustCompile(`(?i)\bupdate\s+(anime_contributions|release_version_groups|anime_fansub_project_notes)\b`),
			regexp.MustCompile(`(?i)\b(backfill|reconcil\w*|compatib\w*)\b`),
			regexp.MustCompile(`(?i)\bcreate\s+(or\s+replace\s+)?view\b`),
		} {
			require.False(t, forbidden.MatchString(sql), "%s contains forbidden executable SQL: %s", name, forbidden)
		}
	}
}

func openPhase108Pool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (id BIGINT PRIMARY KEY);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, fansub_group_id)
);`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108Up))
	return pool
}

func seedPhase108Owners(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO release_versions (id) VALUES (31), (32);
INSERT INTO fansub_groups (id) VALUES (41);
INSERT INTO members (id) VALUES (51);
INSERT INTO anime (id) VALUES (61);
INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (31, 41);
INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (61, 41);`)
	require.NoError(t, err)
}

func phase108Tables() []string {
	return []string{
		"release_crew_snapshots",
		"release_role_credit_lifecycles",
		"project_note_credit_lifecycles",
	}
}

func assertPhase108TableExists(t testing.TB, pool *pgxpool.Pool, table string, expected bool) {
	t.Helper()
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, table).Scan(&exists))
	require.Equal(t, expected, exists, table)
}

func executablePhase108SQL(t testing.TB, name string) string {
	t.Helper()
	content, err := os.ReadFile(phase108MigrationPath(t, name))
	require.NoError(t, err)
	withoutBlocks := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAll(content, nil)
	lines := strings.Split(string(withoutBlocks), "\n")
	for index := range lines {
		if comment := strings.Index(lines[index], "--"); comment >= 0 {
			lines[index] = lines[index][:comment]
		}
	}
	return strings.Join(lines, "\n")
}

func phase108MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
