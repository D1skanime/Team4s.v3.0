package migrations_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// GAP-07 / UAT-137-01 closure: migration 0109 seeded fansub_group_media.view
// only for fansub_lead and project_lead. Migration 0146 (Phase 136) later
// gave co_leader, founder, gfxler, and techadmin fansub_group_media.upload/
// .update/.reorder without the matching .view grant, hiding the media tab
// for those four roles even though they already have write access. Migration
// 0151 closes that gap additively; these tests prove its literal SQL text
// scope and its live behavior.
const (
	phase137FansubGroupMediaViewUpFile   = "0151_fansub_group_media_view_role_defaults.up.sql"
	phase137FansubGroupMediaViewDownFile = "0151_fansub_group_media_view_role_defaults.down.sql"

	phase137FansubGroupMediaViewAction = "fansub_group_media.view"
)

var phase137FansubGroupMediaViewTargetRoles = []string{"co_leader", "founder", "gfxler", "techadmin"}

func TestPhase137FansubGroupMediaViewMigrationSourceContract(t *testing.T) {
	up := readPhase136Migration(t, phase137FansubGroupMediaViewUpFile)
	requirePhase136SQLContains(t, up,
		"insert into role_capabilities",
		"'co_leader', 'fansub_group_media.view'",
		"'founder', 'fansub_group_media.view'",
		"'gfxler', 'fansub_group_media.view'",
		"'techadmin', 'fansub_group_media.view'",
		"on conflict (role_code, action_code) do nothing",
	)
	require.NotContains(t, up, "'fansub_lead', 'fansub_group_media.view'",
		"the new migration must not re-touch migration 0109's fansub_lead seed")
	require.NotContains(t, up, "'project_lead', 'fansub_group_media.view'",
		"the new migration must not re-touch migration 0109's project_lead seed")
	require.NotContains(t, up, "fansub_group_media.delete",
		"the new migration must not seed fansub_group_media.delete for any role")

	down := readPhase136Migration(t, phase137FansubGroupMediaViewDownFile)
	requirePhase136SQLContains(t, down,
		"delete from role_capabilities",
		"fansub_group_media.view",
	)
	require.NotContains(t, down, "'fansub_lead', 'fansub_group_media.view'",
		"the down migration must not mention migration 0109's fansub_lead seed")
	require.NotContains(t, down, "'project_lead', 'fansub_group_media.view'",
		"the down migration must not mention migration 0109's project_lead seed")
	require.NotContains(t, down, "fansub_group_media.delete",
		"the down migration must not touch fansub_group_media.delete")
}

func TestPhase137FansubGroupMediaViewMigrationLiveUpDownUp(t *testing.T) {
	if _, err := os.Stat(phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile)); err != nil {
		t.Fatalf("migration 0151 is required: %v", err)
	}
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137FansubGroupMediaViewPrerequisites(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile))
	assertPhase137FansubGroupMediaViewGrantedRoles(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewDownFile))
	assertPhase137FansubGroupMediaViewRolledBack(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile))
	assertPhase137FansubGroupMediaViewGrantedRoles(t, pool)
}

func TestPhase137FansubGroupMediaViewGrantedOnlyToTargetRoles(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137FansubGroupMediaViewPrerequisites(t, pool)

	_, err := pool.Exec(context.Background(), `
		INSERT INTO role_definitions(code, label_de, contexts, assignable) VALUES
			('translator', 'Übersetzung', ARRAY['fansub_group'], true)
	`)
	require.NoError(t, err)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137FansubGroupMediaViewUpFile))

	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT 1 FROM role_capabilities
			WHERE role_code = 'translator' AND action_code = $1
		)
	`, phase137FansubGroupMediaViewAction).Scan(&exists))
	require.False(t, exists, "a role with no prior media capabilities must not gain fansub_group_media.view")
}

func createPhase137FansubGroupMediaViewPrerequisites(t testing.TB, pool *pgxpool.Pool) {
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
			('fansub_lead', 'Fansub-Leitung', ARRAY['fansub_group'], true),
			('project_lead', 'Projekt-Leitung', ARRAY['fansub_group'], true),
			('co_leader', 'Co-Leitung', ARRAY['fansub_group'], true),
			('founder', 'Gründer', ARRAY['fansub_group'], true),
			('gfxler', 'GFX', ARRAY['fansub_group'], true),
			('techadmin', 'Technik-Admin', ARRAY['fansub_group'], true);
		INSERT INTO action_definitions(code, label_de, category, sort_order) VALUES
			('fansub_group_media.view', 'Gruppenmedien anzeigen', 'gruppe', 100);
		INSERT INTO role_capabilities(role_code, action_code) VALUES
			('fansub_lead', 'fansub_group_media.view'),
			('project_lead', 'fansub_group_media.view');
	`)
	require.NoError(t, err)
}

func assertPhase137FansubGroupMediaViewGrantedRoles(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE action_code = $1
	`, phase137FansubGroupMediaViewAction).Scan(&count))
	require.Equal(t, 6, count, "the two pre-existing roles plus the four new target roles must hold the grant")

	for _, role := range append([]string{"fansub_lead", "project_lead"}, phase137FansubGroupMediaViewTargetRoles...) {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase137FansubGroupMediaViewAction).Scan(&exists))
		require.True(t, exists, "%s must hold fansub_group_media.view", role)
	}
}

func assertPhase137FansubGroupMediaViewRolledBack(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE action_code = $1
	`, phase137FansubGroupMediaViewAction).Scan(&count))
	require.Equal(t, 2, count, "only the two pre-existing roles must remain after the down migration")

	for _, role := range []string{"fansub_lead", "project_lead"} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase137FansubGroupMediaViewAction).Scan(&exists))
		require.True(t, exists, "%s's pre-existing 0109 grant must survive the down migration", role)
	}

	for _, role := range phase137FansubGroupMediaViewTargetRoles {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase137FansubGroupMediaViewAction).Scan(&exists))
		require.False(t, exists, "%s's grant must be removed by the down migration", role)
	}
}
