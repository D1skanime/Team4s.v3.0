package migrations

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

const (
	phase136UpFile   = "0146_capability_policy_catalog.up.sql"
	phase136DownFile = "0146_capability_policy_catalog.down.sql"
)

func TestPhase136MigrationSourceContract(t *testing.T) {
	up := readPhase136Migration(t, phase136UpFile)
	requirePhase136SQLContains(t, up,
		"alter table action_definitions",
		"description_de text",
		"help_text_de text",
		"user_overridable boolean not null default false",
		"alter table role_definitions",
		"color_key text",
		"icon_key text",
		"karaoke_fx",
		"array['fansub_group', 'anime_contribution']",
		"fansub_group_media.upload",
		"fansub_group_media.update",
		"fansub_group_media.reorder",
		"fansub_group_page.general_edit",
		"fansub_group_page.technical_links_edit",
		"fansub_group_page.founding_history_edit",
		"fansub_group_links.update",
		"create table user_group_capability_overrides",
		"effect text not null",
		"effect in ('allow', 'deny')",
		"unique (app_user_id, fansub_group_id, action_code)",
		"create table user_group_capability_override_history",
		"before_effect",
		"after_effect",
		"reason_category",
		"tasksvertretung",
		"sicherheitsmassnahme",
		"rollenluecke",
		"sonstiges",
		"role_capabilities_action_role_idx",
		"user_group_capability_overrides_action_group_user_idx",
		"user_group_capability_override_history_subject_idx",
		"user_group_capability_override_history_action_idx",
	)

	for _, protected := range []string{
		"fansub_group.members.manage",
		"fansub_group.invitations.create",
		"fansub_group.invitations.cancel",
	} {
		require.Contains(t, up, "'"+protected+"'", "protected action %s must be asserted fail-closed", protected)
	}
	require.NotContains(t, up, "references app_user_global_roles", "IdP platform authority must never become group-owned override state")
	require.Contains(t, up, "idp-owned platform-admin authority is never stored here and remains non-deniable")
	require.NotContains(t, up, "insert into role_capabilities", "confirmed operative role defaults belong to Plan 136-09")

	down := readPhase136Migration(t, phase136DownFile)
	requirePhase136SQLContains(t, down,
		"drop table if exists user_group_capability_override_history",
		"drop table if exists user_group_capability_overrides",
		"delete from action_definitions",
		"delete from role_definitions where code = 'karaoke_fx'",
		"alter table role_definitions",
		"alter table action_definitions",
	)
	requirePhase136Order(t, down, "drop table if exists user_group_capability_override_history", "drop table if exists user_group_capability_overrides")
}

func TestPhase136MigrationLiveUpDownUp(t *testing.T) {
	if _, err := os.Stat(phase136MigrationPath(t, phase136UpFile)); err != nil {
		t.Fatalf("Phase-136 migration is required: %v", err)
	}
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase136Prerequisites(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))
	assertPhase136Catalog(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136DownFile))
	assertPhase136RolledBack(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))
	assertPhase136Catalog(t, pool)
}

func TestPhase136OverrideConstraintsAndHistory(t *testing.T) {
	if _, err := os.Stat(phase136MigrationPath(t, phase136UpFile)); err != nil {
		t.Fatalf("Phase-136 migration is required: %v", err)
	}
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase136Prerequisites(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))

	_, err := pool.Exec(context.Background(), `
		INSERT INTO app_users(id) VALUES (1), (2);
		INSERT INTO fansub_groups(id) VALUES (10);
	`)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_overrides(
			app_user_id, fansub_group_id, action_code, effect,
			created_by_app_user_id, updated_by_app_user_id
		) VALUES (1, 10, 'fansub_group.members.manage', 'allow', 2, 2)
	`)
	require.Error(t, err, "protected, non-overridable capabilities must be rejected by the catalog FK")

	_, err = pool.Exec(context.Background(), `
		UPDATE action_definitions SET user_overridable = true
		WHERE code = 'fansub_group_media.upload';
		INSERT INTO user_group_capability_overrides(
			app_user_id, fansub_group_id, action_code, effect,
			created_by_app_user_id, updated_by_app_user_id
		) VALUES (1, 10, 'fansub_group_media.upload', 'allow', 2, 2)
	`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_overrides(
			app_user_id, fansub_group_id, action_code, effect,
			created_by_app_user_id, updated_by_app_user_id
		) VALUES (1, 10, 'fansub_group_media.upload', 'deny', 2, 2)
	`)
	require.Error(t, err, "one subject/group/action may have only one current effect")

	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_override_history(
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			before_effect, after_effect
		) VALUES (1, 10, 'fansub_group_media.upload', 2, NULL, 'allow')
	`)
	require.Error(t, err, "non-platform actors must supply a reason category")
	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_override_history(
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			before_effect, after_effect, reason_category
		) VALUES (1, 10, 'fansub_group_media.upload', 2, 'allow', 'allow', 'rollenluecke')
	`)
	require.Error(t, err, "exact no-op events cannot be stored")
	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_override_history(
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			before_effect, after_effect, reason_category
		) VALUES (1, 10, 'fansub_group_media.upload', 2, NULL, 'allow', 'sonstiges')
	`)
	require.Error(t, err, "other requires explanatory text")
	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_override_history(
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			actor_is_platform_admin, before_effect, after_effect
		) VALUES (1, 10, 'fansub_group_media.upload', 2, true, NULL, 'allow')
	`)
	require.NoError(t, err, "platform administrators are exempt from reasons but remain fully attributed")
	_, err = pool.Exec(context.Background(), `UPDATE user_group_capability_override_history SET after_effect = 'deny'`)
	require.Error(t, err, "history must be append-only")

	assertPhase136ExplainUsesIndex(t, pool,
		`SELECT role_code FROM role_capabilities WHERE action_code = 'fansub_group_media.upload'`,
		"role_capabilities_action_role_idx",
	)
	assertPhase136ExplainUsesIndex(t, pool,
		`SELECT app_user_id FROM user_group_capability_overrides WHERE action_code = 'fansub_group_media.upload' AND fansub_group_id = 10`,
		"user_group_capability_overrides_action_group_user_idx",
	)
}

func createPhase136Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE role_definitions (
			code TEXT PRIMARY KEY,
			label_de TEXT NOT NULL,
			contexts TEXT[] NOT NULL DEFAULT '{}',
			sort_order INT NOT NULL DEFAULT 0,
			assignable BOOLEAN NOT NULL DEFAULT false
		);
		CREATE TABLE action_definitions (
			code TEXT PRIMARY KEY,
			label_de TEXT NOT NULL,
			category TEXT,
			sort_order INT NOT NULL DEFAULT 0
		);
		CREATE TABLE role_capabilities (
			role_code TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
			action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
			PRIMARY KEY (role_code, action_code)
		);
		INSERT INTO action_definitions(code, label_de, category, sort_order) VALUES
			('fansub_group.members.manage', 'Mitglieder verwalten', 'gruppe', 40),
			('fansub_group.invitations.create', 'Einladungen erstellen', 'gruppe', 60),
			('fansub_group.invitations.cancel', 'Einladungen abbrechen', 'gruppe', 70);
	`)
	require.NoError(t, err)
}

func assertPhase136Catalog(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM action_definitions
		WHERE code = ANY(ARRAY[
			'fansub_group_media.upload',
			'fansub_group_media.update',
			'fansub_group_media.reorder',
			'fansub_group_page.general_edit',
			'fansub_group_page.technical_links_edit',
			'fansub_group_page.founding_history_edit',
			'fansub_group_links.update'
		]) AND user_overridable = false
	`).Scan(&count))
	require.Equal(t, 7, count)

	var contexts []string
	var assignable bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT contexts, assignable FROM role_definitions WHERE code = 'karaoke_fx'
	`).Scan(&contexts, &assignable))
	require.ElementsMatch(t, []string{"fansub_group", "anime_contribution"}, contexts)
	require.True(t, assignable)
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM role_capabilities WHERE role_code = 'karaoke_fx'`).Scan(&count))
	require.Zero(t, count, "zero-right roles must remain catalog-visible without capability mappings")

	for _, index := range []string{
		"role_capabilities_action_role_idx",
		"user_group_capability_overrides_action_group_user_idx",
		"user_group_capability_override_history_subject_idx",
		"user_group_capability_override_history_action_idx",
	} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, index).Scan(&exists))
		require.True(t, exists, index)
	}
}

func assertPhase136RolledBack(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	for _, table := range []string{"user_group_capability_overrides", "user_group_capability_override_history"} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, table).Scan(&exists))
		require.False(t, exists, table)
	}
	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT EXISTS (SELECT 1 FROM role_definitions WHERE code = 'karaoke_fx')`).Scan(&exists))
	require.False(t, exists)
}

func assertPhase136ExplainUsesIndex(t testing.TB, pool *pgxpool.Pool, query, index string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `SET enable_seqscan = off`)
	require.NoError(t, err)
	rows, err := pool.Query(context.Background(), "EXPLAIN "+query)
	require.NoError(t, err)
	defer rows.Close()
	var plan strings.Builder
	for rows.Next() {
		var line string
		require.NoError(t, rows.Scan(&line))
		plan.WriteString(line)
		plan.WriteByte('\n')
	}
	require.NoError(t, rows.Err())
	require.Contains(t, plan.String(), index)
}

func readPhase136Migration(t testing.TB, name string) string {
	t.Helper()
	content, err := os.ReadFile(phase136MigrationPath(t, name))
	require.NoError(t, err, "read %s", name)
	return strings.Join(strings.Fields(strings.ToLower(string(content))), " ")
}

func phase136MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}

func requirePhase136SQLContains(t testing.TB, sql string, fragments ...string) {
	t.Helper()
	for _, fragment := range fragments {
		normalized := strings.Join(strings.Fields(strings.ToLower(fragment)), " ")
		require.Contains(t, sql, normalized, "migration missing contract fragment %q", fragment)
	}
}

func requirePhase136Order(t testing.TB, sql, first, second string) {
	t.Helper()
	firstAt := strings.Index(sql, strings.ToLower(first))
	secondAt := strings.Index(sql, strings.ToLower(second))
	require.GreaterOrEqual(t, firstAt, 0, "missing %q", first)
	require.Greater(t, secondAt, firstAt, "%q must occur before %q", first, second)
}
