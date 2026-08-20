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
		"review.text.decide",
		"review.image.decide",
		"review.contribution.decide",
		"effect text not null",
		"effect in ('allow', 'deny')",
		"unique (app_user_id, fansub_group_id, action_code)",
		"create table user_group_capability_override_history",
		"before_effect",
		"after_effect",
		"reason_category",
		"task_delegation",
		"security_measure",
		"role_gap",
		"other",
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
	require.Contains(t, up, "insert into role_capabilities", "confirmed operative role defaults must be seeded")

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
		) VALUES (1, 10, 'fansub_group_media.upload', 2, 'allow', 'allow', 'role_gap')
	`)
	require.Error(t, err, "exact no-op events cannot be stored")
	_, err = pool.Exec(context.Background(), `
		INSERT INTO user_group_capability_override_history(
			app_user_id, fansub_group_id, action_code, actor_app_user_id,
			before_effect, after_effect, reason_category
		) VALUES (1, 10, 'fansub_group_media.upload', 2, NULL, 'allow', 'other')
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
		INSERT INTO role_definitions(code, label_de, contexts, assignable) VALUES
			('gfxler', 'GFX', ARRAY['fansub_group'], true),
			('techadmin', 'Technik-Admin', ARRAY['fansub_group'], true),
			('founder', 'Gründer', ARRAY['fansub_group'], true),
			('co_leader', 'Co-Leitung', ARRAY['fansub_group'], true);
		INSERT INTO action_definitions(code, label_de, category, sort_order) VALUES
			('fansub_group.members.manage', 'Mitglieder verwalten', 'gruppe', 40),
			('fansub_group.invitations.create', 'Einladungen erstellen', 'gruppe', 60),
			('fansub_group.invitations.cancel', 'Einladungen abbrechen', 'gruppe', 70),
			('review.text.decide', 'Texte prüfen', 'review', 90),
			('review.image.decide', 'Bilder prüfen', 'review', 91),
			('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92);
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
	var colorKey, iconKey string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT contexts, assignable, color_key, icon_key
		FROM role_definitions WHERE code = 'karaoke_fx'
	`).Scan(&contexts, &assignable, &colorKey, &iconKey))
	require.ElementsMatch(t, []string{"fansub_group", "anime_contribution"}, contexts)
	require.True(t, assignable)
	require.Equal(t, "creative", colorKey)
	require.Equal(t, "image", iconKey)
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*)
		FROM role_definitions
		WHERE code = ANY(ARRAY[
			'translator', 'editor', 'timer', 'typesetter', 'encoder',
			'raw_provider', 'quality_checker', 'project_lead', 'designer',
			'admin', 'other'
		]) AND icon_key = 'user'
	`).Scan(&count))
	require.Equal(t, 11, count, "every established contribution role with shipped artwork must select the user artwork semantic")
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT count(*) FROM role_capabilities WHERE role_code = 'karaoke_fx'`).Scan(&count))
	require.Zero(t, count, "zero-right roles must remain catalog-visible without capability mappings")

	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM action_definitions
		WHERE NULLIF(BTRIM(category), '') IS NULL
		   OR sort_order <= 0
		   OR NULLIF(BTRIM(label_de), '') IS NULL
		   OR NULLIF(BTRIM(description_de), '') IS NULL
		   OR NULLIF(BTRIM(help_text_de), '') IS NULL
	`).Scan(&count))
	require.Zero(t, count, "every capability must have complete canonical German metadata")
	for _, code := range []string{"review.text.decide", "review.image.decide", "review.contribution.decide"} {
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT count(*) FROM action_definitions
			WHERE code = $1 AND category = 'review' AND sort_order > 0
			  AND NULLIF(BTRIM(description_de), '') IS NOT NULL
			  AND NULLIF(BTRIM(help_text_de), '') IS NOT NULL
		`, code).Scan(&count))
		require.Equal(t, 1, count, code)
	}

	var defaults [][2]string
	rows, err := pool.Query(context.Background(), `
		SELECT role_code, action_code FROM role_capabilities
		WHERE role_code = ANY(ARRAY['gfxler','techadmin','founder','co_leader'])
		ORDER BY role_code, action_code
	`)
	require.NoError(t, err)
	defer rows.Close()
	for rows.Next() {
		var pair [2]string
		require.NoError(t, rows.Scan(&pair[0], &pair[1]))
		defaults = append(defaults, pair)
	}
	require.NoError(t, rows.Err())
	require.Len(t, defaults, 16)
	for _, forbidden := range []string{"fansub_group.edit", "fansub_group_media.delete", "fansub_group.members.manage", "fansub_group.links.manage"} {
		for _, pair := range defaults {
			require.NotEqual(t, forbidden, pair[1], "confirmed defaults must stay narrow")
		}
	}

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
	assertPhase136ExplainUsesIndex(t, pool,
		`SELECT role_code FROM role_capabilities WHERE action_code = 'fansub_group_media.upload'`,
		"role_capabilities_action_role_idx",
	)
	assertPhase136ExplainUsesIndex(t, pool,
		`SELECT app_user_id FROM user_group_capability_overrides WHERE action_code = 'fansub_group_media.upload' AND fansub_group_id = 10`,
		"user_group_capability_overrides_action_group_user_idx",
	)
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
	for _, column := range []string{"description_de", "help_text_de", "user_overridable"} {
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = 'action_definitions'
				  AND column_name = $1
			)
		`, column).Scan(&exists))
		require.False(t, exists, column)
	}
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT to_regclass('role_capabilities_action_role_idx') IS NOT NULL`).Scan(&exists))
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
