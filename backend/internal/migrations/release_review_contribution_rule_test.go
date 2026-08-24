package migrations_test

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

func TestReleaseReviewContributionRuleMigrationUpDown(t *testing.T) {
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(
		filepath.Dir(file),
		"..",
		"..",
		"..",
		"database",
		"migrations",
	)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(migrations, "0136_release_review_contribution_rule.up.sql"),
	)

	var category string
	var value int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT category, point_value
		FROM point_rules
		WHERE rule_code = 'release.contribution' AND rule_version = 1
	`).Scan(&category, &value))
	require.Equal(t, "platform_contribution", category)
	require.Equal(t, 1, value)

	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(migrations, "0136_release_review_contribution_rule.down.sql"),
	)
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT COUNT(*)
		FROM point_rules
		WHERE rule_code = 'release.contribution' AND rule_version = 1
	`).Scan(&count))
	require.Zero(t, count)
}

func TestReleaseReviewContributionRuleDownRefusesLedgerHistory(t *testing.T) {
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(
		filepath.Dir(file),
		"..",
		"..",
		"..",
		"database",
		"migrations",
	)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(migrations, "0136_release_review_contribution_rule.up.sql"),
	)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (901);
		INSERT INTO point_ledger_entries (
			member_id, source_type, source_key, rule_id,
			rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
			rule_point_value_snapshot, point_value, entry_kind,
			effective_at, idempotency_key
		)
		SELECT
			901, 'release_version_note', '501', id,
			rule_code, rule_version, category,
			point_value, point_value, 'award',
			NOW(), 'release-review-contribution-down-refusal'
		FROM point_rules
		WHERE rule_code = 'release.contribution' AND rule_version = 1
	`)
	require.NoError(t, err)

	content, err := os.ReadFile(
		filepath.Join(migrations, "0136_release_review_contribution_rule.down.sql"),
	)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), string(content))
	require.ErrorContains(t, err, "contains ledger history")

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM point_rules
		WHERE rule_code = 'release.contribution' AND rule_version = 1
	`).Scan(&count))
	require.Equal(t, 1, count)
}
