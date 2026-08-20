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
		"presentation_category text",
		"badge_tone text",
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
	require.NotContains(t, up, "platform_admin", "IdP platform authority must never be represented as a group override")
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
		WHERE code LIKE 'fansub_group_%' AND user_overridable = false
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
