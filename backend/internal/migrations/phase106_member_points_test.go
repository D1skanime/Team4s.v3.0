package migrations

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

const (
	phase106MigrationName  = "0131_member_point_foundation"
	phase106UpFile         = phase106MigrationName + ".up.sql"
	phase106DownFile       = phase106MigrationName + ".down.sql"
	phase106HardeningName  = "0132_member_point_foundation_review_hardening"
	phase106HardeningUp    = phase106HardeningName + ".up.sql"
	phase106HardeningDown  = phase106HardeningName + ".down.sql"
	phase106WhitespaceName = "0133_member_point_whitespace_hardening"
	phase106WhitespaceUp   = phase106WhitespaceName + ".up.sql"
	phase106WhitespaceDown = phase106WhitespaceName + ".down.sql"
)

func TestPhase106MigrationUpContract(t *testing.T) {
	up := readPhase106Migration(t, phase106UpFile)
	requireOrder(t, up, "create table point_rules", "create table point_ledger_entries")
	requireSQLContains(t, up,
		"unique (rule_code, rule_version)",
		"check (rule_version > 0)", "check (point_value > 0)",
		"check (category in ('fansub_work', 'platform_contribution'))",
		"member_id bigint not null references members(id)",
		"actor_app_user_id bigint null references app_users(id) on delete set null",
		"fansub_group_id bigint null references fansub_groups(id) on delete set null",
		"release_version_id bigint null references release_versions(id) on delete set null",
		"rule_id", "rule_code_snapshot", "rule_version_snapshot", "rule_category_snapshot", "rule_point_value_snapshot",
		"effective_at", "recorded_at", "idempotency_key", "unique (idempotency_key)",
		"entry_kind in ('award', 'reversal')", "reversal_of_entry_id", "reversal_reason",
		"create function", "before insert", "before update or delete", "pg_trigger_depth() > 1",
		"btrim(source_type) <> ''", "btrim(source_key) <> ''", "btrim(idempotency_key) <> ''",
		"btrim(reversal_reason) <> ''",
		"not exists (select 1 from app_users where id = old.actor_app_user_id)",
		"not exists (select 1 from fansub_groups where id = old.fansub_group_id)",
		"not exists (select 1 from release_versions where id = old.release_version_id)",
		"is not distinct from old", "raise exception",
		"create unique index", "where reversal_of_entry_id is not null",
	)
	for _, immutable := range []string{"member_id", "source_type", "source_key", "rule_id", "rule_code_snapshot", "rule_version_snapshot", "rule_category_snapshot", "rule_point_value_snapshot", "point_value", "entry_kind", "reversal_of_entry_id", "reversal_reason", "effective_at", "recorded_at", "idempotency_key"} {
		require.Contains(t, up, immutable+" is not distinct from old."+immutable, "UPDATE guard must preserve %s", immutable)
	}
	require.NotContains(t, up, "insert into point_rules", "migration must not seed productive point rules")
	require.NotContains(t, up, "on delete cascade", "member, rule and reversal identity must not cascade")

	// Cross-row insertion validation must bind requests to versioned rule and award snapshots.
	requireSQLContains(t, up,
		"new.entry_kind = 'award'", "new.entry_kind = 'reversal'",
		"new.rule_id", "new.rule_code_snapshot", "new.rule_version_snapshot",
		"new.rule_category_snapshot", "new.rule_point_value_snapshot", "new.point_value",
		"pr.rule_code", "pr.rule_version", "pr.category", "pr.point_value",
		"new.reversal_of_entry_id <> new.id", "original.entry_kind = 'award'",
		"new.point_value = -original.point_value",
	)
}

func TestPhase106ReviewHardeningContract(t *testing.T) {
	up := readPhase106Migration(t, phase106HardeningUp)
	requireSQLContains(t, up,
		"rule_code <> ''", "rule_code = btrim(rule_code)",
		"reversal_reason is not null", "btrim(reversal_reason) <> ''",
		"before truncate on point_rules", "before truncate on point_ledger_entries",
	)
}

func TestPhase106WhitespaceHardeningContract(t *testing.T) {
	up := readPhase106Migration(t, phase106WhitespaceUp)
	requireSQLContains(t, up,
		"create function phase106_trim_unicode_whitespace",
		`u&'\0009\000a\000b\000c\000d\0020\0085\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000'`,
		"point_rules.rule_code", "point_ledger_entries.source_type", "point_ledger_entries.source_key",
		"point_ledger_entries.idempotency_key", "point_ledger_entries.reversal_reason",
		"approved data migration", "do not silently trim or invent identifiers or reversal reasons",
		"rule_code = phase106_trim_unicode_whitespace(rule_code)",
		"source_type = phase106_trim_unicode_whitespace(source_type)",
		"source_key = phase106_trim_unicode_whitespace(source_key)",
		"idempotency_key = phase106_trim_unicode_whitespace(idempotency_key)",
		"phase106_trim_unicode_whitespace(reversal_reason) <> ''",
	)

	down := readPhase106Migration(t, phase106WhitespaceDown)
	requireSQLContains(t, down,
		"btrim(source_type) <> ''", "btrim(source_key) <> ''", "btrim(idempotency_key) <> ''",
		"btrim(reversal_reason) <> ''", "rule_code = btrim(rule_code)",
		"drop function if exists phase106_trim_unicode_whitespace(text)",
	)
}

func TestPhase106MigrationDownContract(t *testing.T) {
	down := readPhase106Migration(t, phase106DownFile)
	requireSQLContains(t, down, "drop trigger", "drop function", "drop index", "drop table if exists point_ledger_entries", "drop table if exists point_rules")
	requireOrder(t, down, "drop trigger", "drop table if exists point_ledger_entries")
	requireOrder(t, down, "drop function", "drop table if exists point_ledger_entries")
	requireOrder(t, down, "drop table if exists point_ledger_entries", "drop table if exists point_rules")
	for _, unrelated := range []string{"media_assets", "media_files", "release_version_media", "badges", "capabilities", "reviews"} {
		require.NotContains(t, down, unrelated)
	}
}

func TestPhase106MigrationLiveUpDownUp(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106DownFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
	assertPhase106TableExists(t, pool, "point_rules")
	assertPhase106TableExists(t, pool, "point_ledger_entries")
}

func TestPhase106WhitespaceHardeningLiveUpDownUp(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106HardeningUp))
	historicalDefinitions := readPhase106WhitespaceConstraintDefinitions(t, pool)
	require.Contains(t, historicalDefinitions, "point_ledger_entries_source_type_check")
	require.Contains(t, historicalDefinitions, "point_ledger_entries_source_key_check")
	require.Contains(t, historicalDefinitions, "point_ledger_entries_idempotency_key_check")

	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106WhitespaceUp))
	hardenedDefinitions := readPhase106WhitespaceConstraintDefinitions(t, pool)
	require.Contains(t, hardenedDefinitions, "chk_point_ledger_source_type_canonical")
	require.Contains(t, hardenedDefinitions, "chk_point_ledger_source_key_canonical")
	require.Contains(t, hardenedDefinitions, "chk_point_ledger_idempotency_key_canonical")
	require.NotEqual(t, historicalDefinitions, hardenedDefinitions)

	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106WhitespaceDown))
	require.Equal(t, historicalDefinitions, readPhase106WhitespaceConstraintDefinitions(t, pool), "0133 down must reproduce the exact 0132 constraint definitions")
	assertPhase106FunctionExists(t, pool, "phase106_trim_unicode_whitespace(text)", false)

	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106WhitespaceUp))
	require.Equal(t, hardenedDefinitions, readPhase106WhitespaceConstraintDefinitions(t, pool), "0133 re-up must reproduce the exact hardened definitions")
	seedPhase106Ledger(t, pool)
	_, err := pool.Exec(context.Background(), `TRUNCATE point_ledger_entries`)
	require.ErrorContains(t, err, "point ledger is append-only")
}

func TestPhase106WhitespaceHistoricalDirtyUpgradeFailsClosed(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106HardeningUp))
	historicalDefinitions := readPhase106WhitespaceConstraintDefinitions(t, pool)

	_, err := pool.Exec(context.Background(), `INSERT INTO members(id) VALUES (1)`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `INSERT INTO point_rules(id, rule_code, rule_version, category, point_value)
VALUES (101, $1, 1, 'fansub_work', 10)`, "\u00a0")
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(id, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key)
VALUES (201, 1, $1, $2, 101, $3, 1, 'fansub_work', 10, 10, 'award', NOW(), $4)`, "\u0085", "\t", "\u00a0", "\u3000")
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(id, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, reversal_of_entry_id,
 reversal_reason, effective_at, idempotency_key)
SELECT 202, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, -point_value, 'reversal', id, $1, effective_at, 'historical-reversal'
FROM point_ledger_entries WHERE id = 201`, "\u2028")
	require.NoError(t, err, "historical 0131/0132 must admit the dirty upgrade fixture")

	content, err := os.ReadFile(phase106MigrationPath(t, phase106WhitespaceUp))
	require.NoError(t, err)
	conn, err := pool.Acquire(context.Background())
	require.NoError(t, err)
	_, migrationErr := conn.Exec(context.Background(), string(content))
	require.Error(t, migrationErr)
	_, rollbackErr := conn.Exec(context.Background(), "ROLLBACK")
	require.NoError(t, rollbackErr)
	conn.Release()

	for _, field := range []string{
		"point_rules.rule_code",
		"point_ledger_entries.source_type",
		"point_ledger_entries.source_key",
		"point_ledger_entries.idempotency_key",
		"point_ledger_entries.reversal_reason",
	} {
		require.Contains(t, migrationErr.Error(), field)
	}
	require.Contains(t, migrationErr.Error(), "approved remediation is required")
	require.Contains(t, migrationErr.Error(), "do not silently trim or invent identifiers or reversal reasons")
	require.Equal(t, historicalDefinitions, readPhase106WhitespaceConstraintDefinitions(t, pool), "failed upgrade must leave the historical schema intact")
	assertPhase106FunctionExists(t, pool, "phase106_trim_unicode_whitespace(text)", false)

	var entries int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM point_ledger_entries`).Scan(&entries))
	require.Equal(t, 2, entries, "failed upgrade must not mutate historical rows")
}

func TestPhase106UnicodeWhitespaceContract(t *testing.T) {
	pool := openPhase106MigratedPool(t)
	seedPhase106Ledger(t, pool)
	spaces := []rune{
		'\t', '\n', '\v', '\f', '\r', ' ', '\u0085', '\u00a0', '\u1680',
		'\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006',
		'\u2007', '\u2008', '\u2009', '\u200a', '\u2028', '\u2029', '\u202f',
		'\u205f', '\u3000',
	}
	identifierFields := []string{"rule_code", "source_type", "source_key", "idempotency_key"}

	for index, space := range spaces {
		space := space
		index := index
		t.Run(fmt.Sprintf("U+%04X", space), func(t *testing.T) {
			whitespace := string(space)
			for variantIndex, value := range []string{whitespace, whitespace + "canonical", "canonical" + whitespace} {
				for _, field := range identifierFields {
					assertPhase106CanonicalValueRejected(t, pool, field, value, fmt.Sprintf("%04x-%d-%s", space, variantIndex, field))
				}
			}

			_, err := pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(id, member_id, actor_app_user_id, fansub_group_id, release_version_id, source_type, source_key,
 rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
 point_value, entry_kind, reversal_of_entry_id, reversal_reason, effective_at, idempotency_key)
SELECT $1, member_id, actor_app_user_id, fansub_group_id, release_version_id, source_type, source_key,
 rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
 -point_value, 'reversal', id, $2, effective_at, $3
FROM point_ledger_entries WHERE id = 201`, int64(4000+index), whitespace, fmt.Sprintf("unicode-only-reason-%04x", space))
			require.Error(t, err)
			require.Contains(t, err.Error(), "chk_point_ledger_entry_shape")

			awardID := int64(5000 + index)
			_, err = pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(id, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key)
VALUES ($1, 1, 'unicode_reason', $2, 101, 'release_work', 1, 'fansub_work', 10, 10, 'award', NOW(), $3)`,
				awardID, fmt.Sprintf("reason-%04x", space), fmt.Sprintf("unicode-reason-award-%04x", space))
			require.NoError(t, err)
			_, err = pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(id, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, reversal_of_entry_id,
 reversal_reason, effective_at, idempotency_key)
SELECT $1, member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, -point_value, 'reversal', id, $2, effective_at, $3
FROM point_ledger_entries WHERE id = $4`, int64(6000+index), whitespace+"meaningful"+whitespace,
				fmt.Sprintf("unicode-padded-reason-%04x", space), awardID)
			require.NoError(t, err, "reversal_reason requires meaningful content but is not a canonical identifier")
		})
	}
}

func TestPhase106LedgerAppendOnly(t *testing.T) {
	pool := openPhase106MigratedPool(t)
	seedPhase106Ledger(t, pool)
	assertExecRejected(t, pool, `UPDATE point_rules SET point_value = 11 WHERE id = 101`)
	assertExecRejected(t, pool, `DELETE FROM point_rules WHERE id = 101`)
	assertExecRejected(t, pool, `UPDATE point_ledger_entries SET source_key = 'changed' WHERE id = 201`)
	assertExecRejected(t, pool, `UPDATE point_ledger_entries SET fansub_group_id = NULL WHERE id = 201`)
	assertExecRejected(t, pool, `DELETE FROM point_ledger_entries WHERE id = 201`)

	t.Run("ledger_truncate", func(t *testing.T) {
		pool := openPhase106MigratedPool(t)
		_, err := pool.Exec(context.Background(), `TRUNCATE point_ledger_entries`)
		require.ErrorContains(t, err, "point ledger is append-only")
	})

	t.Run("rule_truncate", func(t *testing.T) {
		pool := openPhase106MigratedPool(t)
		_, err := pool.Exec(context.Background(), `DROP TABLE point_ledger_entries`)
		require.NoError(t, err)
		_, err = pool.Exec(context.Background(), `TRUNCATE point_rules`)
		require.ErrorContains(t, err, "point rules are append-only")
	})

	t.Run("nested_context_null_with_live_parent", func(t *testing.T) {
		const functionName = "phase106_test_nested_live_parent"
		const triggerName = "phase106_test_nested_live_parent_trigger"
		cleanup := func() {
			_, _ = pool.Exec(context.Background(), "DROP TRIGGER IF EXISTS "+triggerName+" ON members")
			_, _ = pool.Exec(context.Background(), "DROP FUNCTION IF EXISTS "+functionName+"()")
		}
		cleanup()
		t.Cleanup(cleanup)
		_, err := pool.Exec(context.Background(), fmt.Sprintf(`
CREATE FUNCTION %s() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE point_ledger_entries SET fansub_group_id = NULL WHERE id = 201;
  RETURN NEW;
END $$;
CREATE TRIGGER %s AFTER UPDATE ON members FOR EACH ROW EXECUTE FUNCTION %s();`, functionName, triggerName, functionName))
		require.NoError(t, err)
		assertExecRejected(t, pool, `UPDATE members SET id = id WHERE id = 1`)
	})

	t.Run("nested_immutable_and_mixed_changes", func(t *testing.T) {
		assertNestedLedgerMutationRejected(t, pool, "source_key = 'nested'")
		assertNestedLedgerMutationRejected(t, pool, "fansub_group_id = NULL, source_key = 'mixed'")
	})

	t.Run("real_fk_context_nulling", func(t *testing.T) {
		for _, tc := range []struct {
			parent, column string
			parentID       int
		}{
			{"app_users", "actor_app_user_id", 10},
			{"fansub_groups", "fansub_group_id", 20},
			{"release_versions", "release_version_id", 30},
		} {
			t.Run(tc.column, func(t *testing.T) {
				pool := openPhase106MigratedPool(t)
				seedPhase106Ledger(t, pool)
				before := readLedgerSnapshot(t, pool, 201)
				_, err := pool.Exec(context.Background(), fmt.Sprintf("DELETE FROM %s WHERE id = $1", tc.parent), tc.parentID)
				require.NoError(t, err)
				after := readLedgerSnapshot(t, pool, 201)
				require.Equal(t, before.withNull(tc.column), after)
			})
		}
	})
}

func TestPhase106ReversalCrossRowInvariants(t *testing.T) {
	pool := openPhase106MigratedPool(t)
	seedPhase106Ledger(t, pool)

	for name, mutation := range map[string]string{
		"wrong_rule_code":  "rule_code_snapshot = 'wrong'",
		"wrong_version":    "rule_version_snapshot = 2",
		"wrong_category":   "rule_category_snapshot = 'platform_contribution'",
		"wrong_rule_value": "rule_point_value_snapshot = 9",
		"wrong_value":      "point_value = 9",
	} {
		t.Run("award_"+name, func(t *testing.T) { assertAwardMutationRejected(t, pool, mutation) })
	}
	for name, code := range map[string]string{
		"blank_rule_code":          "",
		"space_padded_rule_code":   " release_work ",
		"tab_only_rule_code":       "\t",
		"newline_only_rule_code":   "\n",
		"tab_padded_rule_code":     "\trelease_work",
		"newline_padded_rule_code": "release_work\n",
	} {
		t.Run(name, func(t *testing.T) {
			_, err := pool.Exec(context.Background(), `INSERT INTO point_rules(rule_code, rule_version, category, point_value) VALUES ($1, 2, 'fansub_work', 10)`, code)
			require.Error(t, err)
		})
	}
	for name, tc := range map[string]struct {
		sourceType, sourceKey, idempotencyKey, constraint string
	}{
		"tab_only_source_type":       {"\t", "valid", "invalid-source-type", "chk_point_ledger_source_type_canonical"},
		"newline_padded_source_type": {"release\n", "valid", "invalid-source-type-padding", "chk_point_ledger_source_type_canonical"},
		"newline_only_source_key":    {"manual", "\n", "invalid-source-key", "chk_point_ledger_source_key_canonical"},
		"tab_padded_source_key":      {"manual", "\tvalid", "invalid-source-key-padding", "chk_point_ledger_source_key_canonical"},
		"tab_only_idempotency_key":   {"manual", "valid", "\t", "chk_point_ledger_idempotency_key_canonical"},
		"newline_padded_idempotency": {"manual", "valid", "invalid\n", "chk_point_ledger_idempotency_key_canonical"},
	} {
		t.Run(name, func(t *testing.T) {
			_, err := pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key)
VALUES (1, $1, $2, 101, 'release_work', 1, 'fansub_work', 10, 10, 'award', NOW(), $3)`, tc.sourceType, tc.sourceKey, tc.idempotencyKey)
			require.Error(t, err)
			require.Contains(t, err.Error(), tc.constraint)
		})
	}

	validReversal := `INSERT INTO point_ledger_entries
(id, member_id, actor_app_user_id, fansub_group_id, release_version_id, source_type, source_key,
 rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
 point_value, entry_kind, reversal_of_entry_id, reversal_reason, effective_at, idempotency_key)
SELECT 202, member_id, actor_app_user_id, fansub_group_id, release_version_id, source_type, source_key,
 rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
 -point_value, 'reversal', id, 'Testkorrektur', effective_at, 'phase106-reversal-202'
FROM point_ledger_entries WHERE id = 201`
	nullReasonReversal := strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "211"), "'Testkorrektur'", "NULL")
	_, err := pool.Exec(context.Background(), nullReasonReversal)
	require.Error(t, err)
	require.Contains(t, err.Error(), "chk_point_ledger_entry_shape")
	for index, reasonLiteral := range []string{`E'\t'`, `E'\n'`, `E'\r\n'`, `E' \t\n '`} {
		whitespaceReasonReversal := strings.ReplaceAll(validReversal, "202", fmt.Sprint(212+index))
		whitespaceReasonReversal = strings.ReplaceAll(whitespaceReasonReversal, "'Testkorrektur'", reasonLiteral)
		_, err := pool.Exec(context.Background(), whitespaceReasonReversal)
		require.Error(t, err)
		require.Contains(t, err.Error(), "chk_point_ledger_entry_shape")
	}

	_, err = pool.Exec(context.Background(), validReversal)
	require.NoError(t, err)

	for name, sql := range map[string]string{
		"duplicate_direct":     strings.ReplaceAll(validReversal, "202", "203"),
		"reversal_of_reversal": strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "204"), "WHERE id = 201", "WHERE id = 202"),
		"blank_reason":         strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "205"), "'Testkorrektur'", "'   '"),
		"wrong_sign":           strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "206"), "-point_value", "point_value"),
		"wrong_member":         strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "207"), "member_id, actor_app_user_id", "999, actor_app_user_id"),
		"wrong_source":         strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "208"), "source_type, source_key", "source_type, 'wrong'"),
		"wrong_rule":           strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "209"), "rule_id, rule_code_snapshot", "999, rule_code_snapshot"),
		"wrong_context":        strings.ReplaceAll(strings.ReplaceAll(validReversal, "202", "210"), "fansub_group_id, release_version_id", "NULL, release_version_id"),
	} {
		t.Run(name, func(t *testing.T) { assertExecRejected(t, pool, sql) })
	}
}

func TestPhase106MigrationBoundary(t *testing.T) {
	files := []string{
		phase106MigrationPath(t, phase106UpFile),
		phase106MigrationPath(t, phase106DownFile),
		phase106MigrationPath(t, phase106HardeningUp),
		phase106MigrationPath(t, phase106HardeningDown),
		phase106MigrationPath(t, phase106WhitespaceUp),
		phase106MigrationPath(t, phase106WhitespaceDown),
		filepath.Join(phase106RepoRoot(t), "backend", "internal", "testsupport", "phase106_postgres.go"),
		filepath.Join(phase106RepoRoot(t), "backend", "internal", "testsupport", "phase106_postgres_test.go"),
	}
	for _, path := range files {
		content, err := os.ReadFile(path)
		require.NoError(t, err, "Phase-106 artifact missing: %s", filepath.Base(path))
		lower := strings.ToLower(string(content))
		for _, forbidden := range []string{"media_asset", "upload", "crop", "thumbnail", "anime_relation", "review_queue", "capability", "badge"} {
			require.NotContains(t, lower, forbidden, "%s crosses Phase-106 boundary", filepath.Base(path))
		}
		if strings.HasSuffix(path, ".sql") {
			require.NotContains(t, lower, "cleanup", "%s crosses Phase-106 boundary", filepath.Base(path))
			require.NotContains(t, lower, "public.", "%s must use the isolated search path", filepath.Base(path))
		}
	}
}

func readPhase106Migration(t testing.TB, name string) string {
	t.Helper()
	content, err := os.ReadFile(phase106MigrationPath(t, name))
	require.NoError(t, err, "read %s", name)
	return normalizePhase106SQL(string(content))
}

func phase106MigrationPath(t testing.TB, name string) string {
	t.Helper()
	return filepath.Join(phase106RepoRoot(t), "database", "migrations", name)
}

func phase106RepoRoot(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
}

func normalizePhase106SQL(sql string) string {
	return strings.Join(strings.Fields(strings.ToLower(sql)), " ")
}

func requireSQLContains(t testing.TB, sql string, needles ...string) {
	t.Helper()
	for _, needle := range needles {
		require.Contains(t, sql, normalizePhase106SQL(needle), "migration missing contract fragment %q", needle)
	}
}

func requireOrder(t testing.TB, sql, first, second string) {
	t.Helper()
	firstAt, secondAt := strings.Index(sql, first), strings.Index(sql, second)
	require.GreaterOrEqual(t, firstAt, 0, "missing %q", first)
	require.Greater(t, secondAt, firstAt, "%q must occur before %q", first, second)
}

func openPhase106MigratedPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106HardeningUp))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106WhitespaceUp))
	return pool
}

func readPhase106WhitespaceConstraintDefinitions(t testing.TB, pool *pgxpool.Pool) map[string]string {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
SELECT conname, pg_get_constraintdef(oid, true)
FROM pg_constraint
WHERE conrelid IN ('point_rules'::regclass, 'point_ledger_entries'::regclass)
  AND conname IN (
    'chk_point_rules_rule_code_canonical',
    'point_ledger_entries_source_type_check',
    'point_ledger_entries_source_key_check',
    'point_ledger_entries_idempotency_key_check',
    'chk_point_ledger_source_type_canonical',
    'chk_point_ledger_source_key_canonical',
    'chk_point_ledger_idempotency_key_canonical',
    'chk_point_ledger_entry_shape'
  )
ORDER BY conname`)
	require.NoError(t, err)
	defer rows.Close()

	definitions := make(map[string]string)
	for rows.Next() {
		var name, definition string
		require.NoError(t, rows.Scan(&name, &definition))
		definitions[name] = definition
	}
	require.NoError(t, rows.Err())
	require.Len(t, definitions, 5)
	return definitions
}

func assertPhase106FunctionExists(t testing.TB, pool *pgxpool.Pool, signature string, expected bool) {
	t.Helper()
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regprocedure($1) IS NOT NULL`, signature).Scan(&exists))
	require.Equal(t, expected, exists, signature)
}

func assertPhase106CanonicalValueRejected(t testing.TB, pool *pgxpool.Pool, field, value, suffix string) {
	t.Helper()
	constraint := map[string]string{
		"rule_code":       "chk_point_rules_rule_code_canonical",
		"source_type":     "chk_point_ledger_source_type_canonical",
		"source_key":      "chk_point_ledger_source_key_canonical",
		"idempotency_key": "chk_point_ledger_idempotency_key_canonical",
	}[field]
	require.NotEmpty(t, constraint, field)

	if field == "rule_code" {
		_, err := pool.Exec(context.Background(), `INSERT INTO point_rules(rule_code, rule_version, category, point_value)
VALUES ($1, 99, 'fansub_work', 10)`, value)
		require.Error(t, err)
		require.Contains(t, err.Error(), constraint)
		return
	}

	sourceType, sourceKey, idempotencyKey := "canonical", "canonical", "unicode-canonical-"+suffix
	switch field {
	case "source_type":
		sourceType = value
	case "source_key":
		sourceKey = value
	case "idempotency_key":
		idempotencyKey = value
	default:
		t.Fatalf("unsupported canonical field %q", field)
	}
	_, err := pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key)
VALUES (1, $1, $2, 101, 'release_work', 1, 'fansub_work', 10, 10, 'award', NOW(), $3)`,
		sourceType, sourceKey, idempotencyKey)
	require.Error(t, err)
	require.Contains(t, err.Error(), constraint)
}

func seedPhase106Ledger(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO members(id) VALUES (1), (999);
INSERT INTO app_users(id) VALUES (10);
INSERT INTO fansub_groups(id) VALUES (20);
INSERT INTO release_versions(id) VALUES (30);
INSERT INTO point_rules(id, rule_code, rule_version, category, point_value) VALUES (101, 'release_work', 1, 'fansub_work', 10);
INSERT INTO point_ledger_entries
(id, member_id, actor_app_user_id, fansub_group_id, release_version_id, source_type, source_key,
 rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
 point_value, entry_kind, effective_at, idempotency_key)
VALUES (201, 1, 10, 20, 30, 'release_version', '30', 101, 'release_work', 1, 'fansub_work', 10, 10, 'award', NOW(), 'phase106-award-201')`)
	require.NoError(t, err)
}

func assertExecRejected(t testing.TB, pool *pgxpool.Pool, sql string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), sql)
	require.Error(t, err)
}

func assertAwardMutationRejected(t testing.TB, pool *pgxpool.Pool, mutation string) {
	t.Helper()
	ruleCode, ruleVersion, category, ruleValue, pointValue := "release_work", 1, "fansub_work", 10, 10
	switch mutation {
	case "rule_code_snapshot = 'wrong'":
		ruleCode = "wrong"
	case "rule_version_snapshot = 2":
		ruleVersion = 2
	case "rule_category_snapshot = 'platform_contribution'":
		category = "platform_contribution"
	case "rule_point_value_snapshot = 9":
		ruleValue = 9
	case "point_value = 9":
		pointValue = 9
	default:
		t.Fatalf("unsupported award mutation %q", mutation)
	}
	_, err := pool.Exec(context.Background(), `INSERT INTO point_ledger_entries
(member_id, source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
 rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key)
VALUES (1, 'manual', 'invalid', 101, $1, $2, $3, $4, $5, 'award', NOW(), $6)`,
		ruleCode, ruleVersion, category, ruleValue, pointValue, "invalid-"+strings.NewReplacer(" ", "-", "'", "", "=", "-").Replace(mutation))
	require.Error(t, err)
	require.Contains(t, err.Error(), "award snapshot does not match point rule")
}

func assertNestedLedgerMutationRejected(t testing.TB, pool *pgxpool.Pool, setClause string) {
	t.Helper()
	name := strings.NewReplacer(" ", "_", "=", "", "'", "", ",", "_").Replace(setClause)
	functionName := "phase106_nested_" + fmt.Sprint(len(name))
	triggerName := functionName + "_trigger"
	_, err := pool.Exec(context.Background(), fmt.Sprintf(`
CREATE FUNCTION %s() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 UPDATE point_ledger_entries SET %s WHERE id = 201; RETURN NEW; END $$;
CREATE TRIGGER %s AFTER UPDATE ON members FOR EACH ROW EXECUTE FUNCTION %s();`, functionName, setClause, triggerName, functionName))
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "DROP TRIGGER IF EXISTS "+triggerName+" ON members")
		_, _ = pool.Exec(context.Background(), "DROP FUNCTION IF EXISTS "+functionName+"()")
	})
	assertExecRejected(t, pool, `UPDATE members SET id = id WHERE id = 1`)
}

type phase106LedgerSnapshot struct {
	MemberID, RuleID                                                     int64
	ActorID, GroupID, ReleaseVersionID                                   *int64
	SourceType, SourceKey, RuleCode, Category, EntryKind, IdempotencyKey string
	RuleVersion, RuleValue, PointValue                                   int
}

func readLedgerSnapshot(t testing.TB, pool *pgxpool.Pool, id int64) phase106LedgerSnapshot {
	t.Helper()
	var value phase106LedgerSnapshot
	err := pool.QueryRow(context.Background(), `SELECT member_id, actor_app_user_id, fansub_group_id, release_version_id,
source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
rule_point_value_snapshot, point_value, entry_kind, idempotency_key FROM point_ledger_entries WHERE id=$1`, id).Scan(
		&value.MemberID, &value.ActorID, &value.GroupID, &value.ReleaseVersionID, &value.SourceType, &value.SourceKey,
		&value.RuleID, &value.RuleCode, &value.RuleVersion, &value.Category, &value.RuleValue, &value.PointValue,
		&value.EntryKind, &value.IdempotencyKey)
	require.NoError(t, err)
	return value
}

func (value phase106LedgerSnapshot) withNull(column string) phase106LedgerSnapshot {
	switch column {
	case "actor_app_user_id":
		value.ActorID = nil
	case "fansub_group_id":
		value.GroupID = nil
	case "release_version_id":
		value.ReleaseVersionID = nil
	}
	return value
}

func assertPhase106TableExists(t testing.TB, pool *pgxpool.Pool, table string) {
	t.Helper()
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, table).Scan(&exists))
	require.True(t, exists, table)
}
