package migrations_test

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

const (
	phase107MigrationName = "0134_review_foundation"
	phase107UpFile        = phase107MigrationName + ".up.sql"
	phase107DownFile      = phase107MigrationName + ".down.sql"
)

var phase107FoundationTables = []string{
	"review_foundation_seed_ownership",
	"fansub_group_member_review_capabilities",
	"review_decisions",
	"review_audit_events",
	"review_reason_texts",
	"review_credit_slots",
}

func TestPhase107MigrationUpContract(t *testing.T) {
	up := readPhase107Migration(t, phase107UpFile)

	require.Equal(t, phase107FoundationTables, phase107CreatedTables(up))
	requireSQLContains(t, up,
		"create table review_foundation_seed_ownership",
		"create table fansub_group_member_review_capabilities",
		"create table review_decisions",
		"create table review_audit_events",
		"create table review_reason_texts",
		"create table review_credit_slots",
		"review.text.decide",
		"review.image.decide",
		"review.contribution.decide",
		"('fansub_lead', 'review.text.decide')",
		"('fansub_lead', 'review.image.decide')",
		"('fansub_lead', 'review.contribution.decide')",
		"unique (source_type, source_key, source_revision)",
		"unique (source_type, source_key, credit_slot)",
		"credit_slot in ('reject', 'confirm')",
		"reason_kind in ('reject', 'override')",
		"decision in ('confirm', 'reject')",
		"phase106_trim_unicode_whitespace(rejection_category) <> ''",
		"reviewer_member_id",
		"review_decision_id bigint not null",
		"point_ledger_entry_id",
		"references point_ledger_entries(id)",
		"create constraint trigger review_credit_slots_validate_contract",
		"validate_review_credit_slot_contract",
		"create constraint trigger review_audit_events_validate_contract",
		"create constraint trigger review_reason_texts_validate_contract",
		"validate_review_audit_event_contract",
		"validate_review_reason_contract",
		"review.decision",
		"platform_contribution",
	)
	requireSQLContains(t, up,
		"created_by_migration",
		"review_foundation_seed_ownership_guard_mutation",
		"review_foundation_seed_ownership_reject_truncate",
	)
	require.Contains(t, up, "raise exception", "conflicting review.decision seed must fail closed")
	require.Contains(t, up, "point_value", "review.decision v1 must pin its value")
	require.Regexp(t, regexp.MustCompile(`(?s)review\.decision.+(?:rule_version|,\s*1).+platform_contribution.+(?:point_value|,\s*1)`), up)

	for _, table := range []string{"review_decisions", "review_audit_events", "review_credit_slots"} {
		requireSQLContains(t, up,
			"before update or delete on "+table,
			"before truncate on "+table,
		)
	}
	requireSQLContains(t, up,
		"before update on review_reason_texts",
		"before truncate on review_reason_texts",
	)
	require.NotContains(t, phase107CreateTableStatement(up, "review_decisions"), "reason_text")
	require.NotContains(t, phase107CreateTableStatement(up, "review_decisions"), "reason_body")
	require.NotContains(t, phase107CreateTableStatement(up, "review_audit_events"), "reason_text")
	require.NotContains(t, phase107CreateTableStatement(up, "review_audit_events"), "reason_body")

	reviewRoleSeeds := regexp.MustCompile(`\('([^']+)',\s*'(review\.(?:text|image|contribution)\.decide)'\)`).FindAllStringSubmatch(up, -1)
	require.Len(t, reviewRoleSeeds, 3)
	for _, seed := range reviewRoleSeeds {
		require.Equal(t, "fansub_lead", seed[1], "only fansub_lead receives seeded review capabilities")
	}
}

func TestPhase107MigrationDownContract(t *testing.T) {
	down := readPhase107Migration(t, phase107DownFile)

	requireSQLContains(t, down,
		"raise exception",
		"fansub_group_member_review_capabilities",
		"review_decisions",
		"review_audit_events",
		"review_reason_texts",
		"review_credit_slots",
		"point_ledger_entries",
		"review.decision",
		"drop trigger",
		"drop function",
		"drop table if exists review_reason_texts",
		"drop table if exists review_audit_events",
		"drop table if exists review_decisions",
		"drop table if exists review_credit_slots",
		"drop table if exists fansub_group_member_review_capabilities",
		"drop table if exists review_foundation_seed_ownership",
		"delete from role_capabilities",
		"delete from action_definitions",
		"delete from point_rules",
	)
	requireOrder(t, down, "raise exception", "drop trigger")
	requireOrder(t, down, "drop trigger", "drop table if exists review_credit_slots")
	requireOrder(t, down, "drop trigger", "drop table if exists review_decisions")
	requireOrder(t, down, "drop table if exists review_reason_texts", "drop table if exists review_audit_events")
	requireOrder(t, down, "drop table if exists review_audit_events", "drop table if exists review_decisions")
	require.NotContains(t, down, "drop table point_ledger_entries")
	require.NotContains(t, down, "drop table point_rules")
	require.NotContains(t, down, "cascade")
}

func TestPhase107MigrationLiveUpDownUp(t *testing.T) {
	t.Run("populated-down-fails-before-drop", func(t *testing.T) {
		pool := openPhase107MigratedPool(t)
		seedPhase107ReviewFoundation(t, pool)

		content, err := os.ReadFile(phase106MigrationPath(t, phase107DownFile))
		require.NoError(t, err)
		_, err = pool.Exec(context.Background(), string(content))
		require.Error(t, err)
		for _, table := range phase107FoundationTables {
			assertPhase106TableExists(t, pool, table)
		}
		var actionCount int
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*) FROM action_definitions WHERE code LIKE 'review.%.decide'`).Scan(&actionCount))
		require.Equal(t, 3, actionCount)
	})

	t.Run("empty-up-down-up", func(t *testing.T) {
		pool := openPhase107MigratedPool(t)
		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107DownFile))
		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107UpFile))
		for _, table := range phase107FoundationTables {
			assertPhase106TableExists(t, pool, table)
		}
	})

	t.Run("compatible-preexisting-seeds-survive-up-down", func(t *testing.T) {
		pool := testsupport.OpenPhase107Postgres(t)
		_, err := pool.Exec(context.Background(), `
INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('review.text.decide', 'Texte prüfen', 'review', 90),
    ('review.image.decide', 'Bilder prüfen', 'review', 91),
    ('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92);
INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'review.text.decide'),
    ('fansub_lead', 'review.image.decide'),
    ('fansub_lead', 'review.contribution.decide');
INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES ('review.decision', 1, 'platform_contribution', 1);`)
		require.NoError(t, err)

		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107UpFile))

		var externalSeeds int
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM review_foundation_seed_ownership
WHERE NOT created_by_migration`).Scan(&externalSeeds))
		require.Equal(t, 7, externalSeeds)

		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107DownFile))

		var actions, capabilities, rules int
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM action_definitions
WHERE (code, label_de, category, sort_order) IN (
    ('review.text.decide', 'Texte prüfen', 'review', 90),
    ('review.image.decide', 'Bilder prüfen', 'review', 91),
    ('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92)
)`).Scan(&actions))
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM role_capabilities
WHERE role_code = 'fansub_lead'
  AND action_code IN (
      'review.text.decide',
      'review.image.decide',
      'review.contribution.decide'
  )`).Scan(&capabilities))
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM point_rules
WHERE rule_code = 'review.decision'
  AND rule_version = 1
  AND category = 'platform_contribution'
  AND point_value = 1`).Scan(&rules))
		require.Equal(t, 3, actions)
		require.Equal(t, 3, capabilities)
		require.Equal(t, 1, rules)
	})

	t.Run("externally-owned-rule-history-survives-down", func(t *testing.T) {
		pool := testsupport.OpenPhase107Postgres(t)
		_, err := pool.Exec(context.Background(), `
INSERT INTO members (id) VALUES (7001);
INSERT INTO point_rules (
    id, rule_code, rule_version, category, point_value
) VALUES (
    7002, 'review.decision', 1, 'platform_contribution', 1
);
INSERT INTO point_ledger_entries (
    id, member_id, source_type, source_key, rule_id,
    rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
    rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key
) VALUES (
    7003, 7001, 'external_review', 'external-history', 7002,
    'review.decision', 1, 'platform_contribution',
    1, 1, 'award', NOW(), 'external-review-history'
);`)
		require.NoError(t, err)

		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107UpFile))

		var externallyOwned bool
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT NOT created_by_migration
FROM review_foundation_seed_ownership
WHERE seed_kind = 'point_rule'
  AND seed_key = 'review.decision|1'`).Scan(&externallyOwned))
		require.True(t, externallyOwned)

		testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107DownFile))

		for _, table := range phase107FoundationTables {
			var exists bool
			require.NoError(t, pool.QueryRow(context.Background(), `
SELECT to_regclass($1) IS NOT NULL`, table).Scan(&exists))
			require.False(t, exists, "%s must be removed by a safe rollback", table)
		}

		var rules, ledgerEntries int
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM point_rules
WHERE id = 7002
  AND rule_code = 'review.decision'
  AND rule_version = 1
  AND category = 'platform_contribution'
  AND point_value = 1`).Scan(&rules))
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM point_ledger_entries
WHERE id = 7003
  AND member_id = 7001
  AND rule_id = 7002
  AND idempotency_key = 'external-review-history'`).Scan(&ledgerEntries))
		require.Equal(t, 1, rules)
		require.Equal(t, 1, ledgerEntries)
	})

	t.Run("migration-owned-rule-history-blocks-down", func(t *testing.T) {
		pool := openPhase107MigratedPool(t)
		_, err := pool.Exec(context.Background(), `
INSERT INTO members (id) VALUES (7101);
INSERT INTO point_ledger_entries (
    id, member_id, source_type, source_key, rule_id,
    rule_code_snapshot, rule_version_snapshot, rule_category_snapshot,
    rule_point_value_snapshot, point_value, entry_kind, effective_at, idempotency_key
)
SELECT
    7103, 7101, 'review_decision', 'owned-history', id,
    rule_code, rule_version, category,
    point_value, point_value, 'award', NOW(), 'owned-review-history'
FROM point_rules
WHERE rule_code = 'review.decision'
  AND rule_version = 1;`)
		require.NoError(t, err)

		content, err := os.ReadFile(phase106MigrationPath(t, phase107DownFile))
		require.NoError(t, err)
		_, err = pool.Exec(context.Background(), string(content))
		require.Error(t, err)
		require.Contains(t, err.Error(), "contains history and cannot be removed")

		for _, table := range phase107FoundationTables {
			assertPhase106TableExists(t, pool, table)
		}

		var ownedRules, ledgerEntries int
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM point_rules pr
JOIN review_foundation_seed_ownership owned
  ON owned.seed_kind = 'point_rule'
 AND owned.seed_key = 'review.decision|1'
 AND owned.created_by_migration
WHERE pr.rule_code = 'review.decision'
  AND pr.rule_version = 1`).Scan(&ownedRules))
		require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*)
FROM point_ledger_entries
WHERE id = 7103
  AND member_id = 7101
  AND idempotency_key = 'owned-review-history'`).Scan(&ledgerEntries))
		require.Equal(t, 1, ownedRules)
		require.Equal(t, 1, ledgerEntries)
	})
}

func TestPhase107ImmutableDecisionAuditCreditSlot(t *testing.T) {
	pool := openPhase107MigratedPool(t)
	fixture := seedPhase107ReviewFoundation(t, pool)

	for _, target := range []struct {
		name   string
		update string
		delete string
		clear  string
	}{
		{
			name:   "decision",
			update: `UPDATE review_decisions SET source_key = 'changed' WHERE id = 1001`,
			delete: `DELETE FROM review_decisions WHERE id = 1001`,
			clear:  `TRUNCATE review_decisions CASCADE`,
		},
		{
			name:   "audit",
			update: `UPDATE review_audit_events SET event_code = 'changed' WHERE id = 1002`,
			delete: `DELETE FROM review_audit_events WHERE id = 1002`,
			clear:  `TRUNCATE review_audit_events CASCADE`,
		},
		{
			name:   "credit-slot",
			update: `UPDATE review_credit_slots SET credit_slot = 'confirm' WHERE point_ledger_entry_id = 1003`,
			delete: `DELETE FROM review_credit_slots WHERE point_ledger_entry_id = 1003`,
			clear:  `TRUNCATE review_credit_slots`,
		},
	} {
		t.Run(target.name, func(t *testing.T) {
			assertExecRejected(t, pool, target.update)
			assertExecRejected(t, pool, target.delete)
			assertExecRejected(t, pool, target.clear)
		})
	}

	_, err := pool.Exec(context.Background(), `
INSERT INTO review_decisions (
    source_type, source_key, source_revision, review_kind, decision, rejection_category,
    fansub_group_id, reviewer_app_user_id, reviewer_member_id, is_platform_override
) VALUES ('fixture', 'blank-category', 1, 'text', 'reject', $1, 20, 10, 1, false)`, "\u00a0")
	require.Error(t, err, "Reject requires a Unicode-nonblank rejection category")

	_, err = pool.Exec(context.Background(), `
INSERT INTO review_decisions (
    source_type, source_key, source_revision, review_kind, decision, rejection_category,
    fansub_group_id, reviewer_app_user_id, reviewer_member_id, is_platform_override
) VALUES ('fixture', 'confirm-with-category', 1, 'text', 'confirm', 'wrong', 20, 10, 1, false)`)
	require.Error(t, err, "Confirm forbids a rejection category")

	var decisionCount, auditCount int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM review_decisions WHERE id = $1`, fixture.decisionID).Scan(&decisionCount))
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM review_audit_events WHERE id = $1`, fixture.auditID).Scan(&auditCount))
	require.Equal(t, 1, decisionCount)
	require.Equal(t, 1, auditCount)
}

func TestPhase107ReasonScrubBoundary(t *testing.T) {
	pool := openPhase107MigratedPool(t)
	fixture := seedPhase107ReviewFoundation(t, pool)

	assertExecRejected(t, pool, `UPDATE review_reason_texts SET reason_text = 'changed' WHERE audit_event_id = 1002 AND reason_kind = 'reject'`)
	assertExecRejected(t, pool, `TRUNCATE review_reason_texts`)

	_, err := pool.Exec(context.Background(), `
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1002, 'reject', $1)`, "\u2028")
	require.Error(t, err, "Reject reason must contain non-whitespace Unicode text")
	_, err = pool.Exec(context.Background(), `
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1002, 'other', 'nicht erlaubt')`)
	require.Error(t, err)

	_, err = pool.Exec(context.Background(), `
DELETE FROM review_reason_texts WHERE audit_event_id = 1002 AND reason_kind = 'reject'`)
	require.NoError(t, err)

	var reasons, decisions, audits int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM review_reason_texts WHERE audit_event_id = $1`, fixture.auditID).Scan(&reasons))
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM review_decisions WHERE id = $1`, fixture.decisionID).Scan(&decisions))
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM review_audit_events WHERE id = $1`, fixture.auditID).Scan(&audits))
	require.Zero(t, reasons)
	require.Equal(t, 1, decisions)
	require.Equal(t, 1, audits)
}

func TestPhase107AuditEventContract(t *testing.T) {
	pool := openPhase107MigratedPool(t)
	seedPhase107ReviewFoundation(t, pool)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
INSERT INTO review_audit_events (
    event_code, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    'review.rejected', 'app_user', 10, 1,
    20, 'fixture', 'source-missing-decision', 1,
    'reject', false, false
)`)
	require.Error(t, err, "rejected audit requires a decision and reject reason")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    'review.confirmed', 1001, 'app_user', 10, 1,
    20, 'fixture', 'source-a', 1,
    'confirm', false, false
)`)
	require.Error(t, err, "confirmed audit cannot link a reject decision")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    'review.confirmed', 1005, 'app_user', 11, 2,
    20, 'fixture', 'source-a', 2,
    NULL, false, false
)`)
	require.Error(t, err, "confirmed audit requires its structured decision value")

	_, err = pool.Exec(ctx, `
INSERT INTO review_decisions (
    id, source_type, source_key, source_revision, review_kind, decision,
    rejection_category, fansub_group_id, reviewer_app_user_id,
    reviewer_member_id, is_platform_override
) VALUES (
    1006, 'fixture', 'source-override', 1, 'text', 'confirm',
    NULL, 20, 10, 1, true
)`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    1007, 'review.override', 1006, 'app_user', 10, 1,
    20, 'fixture', 'source-override', 1,
    'confirm', true, true
)`)
	require.Error(t, err, "override audit requires its override reason in the same transaction")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    1008, 'review.override', 1006, 'app_user', 10, 1,
    20, 'fixture', 'source-override', 1,
    'confirm', true, true
);
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1008, 'reject', 'Falscher Zweck');`)
	require.Error(t, err, "override audit cannot carry a reject reason")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    1009, 'review.override', 1006, 'app_user', 10, 1,
    20, 'fixture', 'source-override', 1,
    'confirm', true, true
);
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1009, 'override', 'Dokumentierte Ausnahme');`)
	require.NoError(t, err, "matching override event and reason must commit")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    1010, 'review_credit.reversed', 1005, 'system',
    20, 'fixture', 'source-a', 2,
    'confirm', false, false
)`)
	require.NoError(t, err, "system credit-reversal audit remains supported")

	_, err = pool.Exec(ctx, `
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision,
    decision, is_platform_override, has_reason
) VALUES (
    1011, 'review.confirmed', 1005, 'app_user', 11, 2,
    20, 'fixture', 'source-a', 2,
    'confirm', false, false
)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1011, 'override', 'Nicht erlaubt')`)
	require.Error(t, err, "reason text cannot be attached to a no-reason event")

	var invalidRows int
	require.NoError(t, pool.QueryRow(ctx, `
SELECT count(*)
FROM review_audit_events
WHERE id IN (1007, 1008)`).Scan(&invalidRows))
	require.Zero(t, invalidRows, "rejected immutable event shapes must not become permanent")
}

func TestPhase107SourceGlobalCreditSlot(t *testing.T) {
	pool := openPhase107MigratedPool(t)
	seedPhase107ReviewFoundation(t, pool)
	seedPhase107LedgerAward(t, pool, 1004, 2, 11, "fixture", "source-a", "confirm")

	_, err := pool.Exec(context.Background(), `
INSERT INTO review_credit_slots (
    source_type, source_key, credit_slot, reviewer_member_id,
    review_decision_id, point_ledger_entry_id
) VALUES ('fixture', 'source-a', 'reject', 2, 1005, 1004)`)
	require.Error(t, err, "same source and slot must be globally unique across reviewers")

	_, err = pool.Exec(context.Background(), `
INSERT INTO review_credit_slots (
    source_type, source_key, credit_slot, reviewer_member_id,
    review_decision_id, point_ledger_entry_id
) VALUES ('fixture', 'source-a', 'confirm', 2, 1005, 1004)`)
	require.NoError(t, err, "reject and confirm are independent source-global slots")

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT count(*) FROM review_credit_slots WHERE source_type = 'fixture' AND source_key = 'source-a'`).Scan(&count))
	require.Equal(t, 2, count)
}

func TestPhase107FoundationBoundary(t *testing.T) {
	for _, name := range []string{phase107UpFile, phase107DownFile} {
		path := phase106MigrationPath(t, name)
		content, err := os.ReadFile(path)
		require.NoError(t, err, "Phase-107 artifact missing: %s", filepath.Base(path))
		lower := strings.ToLower(string(content))

		for _, forbidden := range []string{
			"review_assignment", "assignment", "reservation", "takeover", "claim",
			"handler", "frontend", "release_version_media", "anime_contribution",
			"upload", "cleanup",
		} {
			require.NotContains(t, lower, forbidden, "%s crosses the Phase-107 foundation boundary", filepath.Base(path))
		}
		for _, ledger := range regexp.MustCompile(`\b[a-z0-9_]*ledger[a-z0-9_]*\b`).FindAllString(lower, -1) {
			if ledger == "ledger" {
				continue
			}
			require.Contains(
				t,
				[]string{"point_ledger_entries", "point_ledger_entry_id"},
				ledger,
				"%s invents a parallel ledger",
				filepath.Base(path),
			)
		}
		require.NotContains(t, lower, "public.", "%s must rely on the isolated search path", filepath.Base(path))
	}
}

type phase107Fixture struct {
	decisionID int64
	auditID    int64
}

func openPhase107MigratedPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase107UpFile))
	return pool
}

func seedPhase107ReviewFoundation(t testing.TB, pool *pgxpool.Pool) phase107Fixture {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO members(id) VALUES (1), (2);
INSERT INTO app_users(id, status) VALUES (10, 'active'), (11, 'active');
INSERT INTO fansub_groups(id) VALUES (20);
INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
VALUES (30, 20, 10, 1, 'active');
INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
VALUES (40, 1, 10, 'verified', NOW());
INSERT INTO review_decisions (
    id, source_type, source_key, source_revision, review_kind, decision, rejection_category,
    fansub_group_id, reviewer_app_user_id, reviewer_member_id, is_platform_override
) VALUES (1001, 'fixture', 'source-a', 1, 'text', 'reject', 'inhalt', 20, 10, 1, false);
INSERT INTO review_decisions (
    id, source_type, source_key, source_revision, review_kind, decision, rejection_category,
    fansub_group_id, reviewer_app_user_id, reviewer_member_id, is_platform_override
) VALUES (1005, 'fixture', 'source-a', 2, 'text', 'confirm', NULL, 20, 11, 2, false);
INSERT INTO review_audit_events (
    id, event_code, review_decision_id, actor_kind, actor_app_user_id, actor_member_id,
    fansub_group_id, source_type, source_key, source_revision, decision,
    is_platform_override, has_reason
) VALUES (
    1002, 'review.rejected', 1001, 'app_user', 10, 1,
    20, 'fixture', 'source-a', 1, 'reject', false, true
);
INSERT INTO review_reason_texts (audit_event_id, reason_kind, reason_text)
VALUES (1002, 'reject', 'Inhaltlich nicht ausreichend');`)
	require.NoError(t, err)
	seedPhase107LedgerAward(t, pool, 1003, 1, 10, "fixture", "source-a", "reject")
	_, err = pool.Exec(context.Background(), `
INSERT INTO review_credit_slots (
    source_type, source_key, credit_slot, reviewer_member_id,
    review_decision_id, point_ledger_entry_id
) VALUES ('fixture', 'source-a', 'reject', 1, 1001, 1003)`)
	require.NoError(t, err)
	return phase107Fixture{decisionID: 1001, auditID: 1002}
}

func seedPhase107LedgerAward(
	t testing.TB,
	pool *pgxpool.Pool,
	id, memberID, actorAppUserID int64,
	sourceType, stableKey, slot string,
) {
	t.Helper()
	pointSourceKey := "source:" + fmt.Sprint(len([]byte(sourceType))) + ":" +
		hex.EncodeToString([]byte(sourceType)) + ":key:" +
		fmt.Sprint(len([]byte(stableKey))) + ":" + hex.EncodeToString([]byte(stableKey))
	idempotencyKey := "v1|review|review_decision|" + pointSourceKey +
		"|beneficiary:" + fmt.Sprint(memberID) + "|slot:" + slot
	_, err := pool.Exec(context.Background(), `
INSERT INTO point_ledger_entries (
    id, member_id, actor_app_user_id, fansub_group_id,
    source_type, source_key, rule_id, rule_code_snapshot,
    rule_version_snapshot, rule_category_snapshot, rule_point_value_snapshot,
    point_value, entry_kind, effective_at, idempotency_key
)
SELECT $1, $2, $3, 20, 'review_decision', $4, id, rule_code,
       rule_version, category, point_value, point_value, 'award', NOW(), $5
FROM point_rules
WHERE rule_code = 'review.decision' AND rule_version = 1`,
		id, memberID, actorAppUserID, pointSourceKey, idempotencyKey)
	require.NoError(t, err)
}

func readPhase107Migration(t testing.TB, name string) string {
	t.Helper()
	path := phase106MigrationPath(t, name)
	content, err := os.ReadFile(path)
	require.NoError(t, err, "Phase-107 artifact missing: %s", filepath.Base(path))
	return normalizePhase106SQL(string(content))
}

func phase107CreatedTables(sql string) []string {
	matches := regexp.MustCompile(`\bcreate table (?:if not exists )?([a-z0-9_]+)`).FindAllStringSubmatch(sql, -1)
	tables := make([]string, 0, len(matches))
	for _, match := range matches {
		tables = append(tables, match[1])
	}
	return tables
}

func phase107CreateTableStatement(sql, table string) string {
	start := strings.Index(sql, "create table "+table)
	if start < 0 {
		return ""
	}
	remaining := sql[start+len("create table "+table):]
	end := len(remaining)
	for _, marker := range []string{" create table ", " create function ", " insert into "} {
		if candidate := strings.Index(remaining, marker); candidate >= 0 && candidate < end {
			end = candidate
		}
	}
	return remaining[:end]
}
