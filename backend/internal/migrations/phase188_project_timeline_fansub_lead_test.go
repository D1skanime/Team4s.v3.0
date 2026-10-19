package migrations_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// Plan 188-05, Task 4: Migration 0185 behebt den Live-Bug "Leader/Projektleiter kann
// Projektzeitraum nicht setzen" rechte-konfigurationsseitig (D-10/D-11): fansub_lead gewinnt
// anime_fansub_project.timeline.update additiv, typesetter verliert es wieder (ein Fehlklick
// ueber die Admin-Rechte-Matrix-UI, siehe 188-CONTEXT.md). project_lead (bereits seit
// Migration 0157 vorhanden) bleibt unveraendert.
const (
	phase188ProjectTimelineFansubLeadUpFile   = "0185_anime_project_timeline_fansub_lead.up.sql"
	phase188ProjectTimelineFansubLeadDownFile = "0185_anime_project_timeline_fansub_lead.down.sql"

	phase188ProjectTimelineFansubLeadAction = "anime_fansub_project.timeline.update"
)

func TestPhase188ProjectTimelineFansubLeadMigrationSourceContract(t *testing.T) {
	up := readPhase136Migration(t, phase188ProjectTimelineFansubLeadUpFile)
	requirePhase136SQLContains(t, up,
		"'fansub_lead', 'anime_fansub_project.timeline.update'",
		"on conflict",
	)
	require.NotContains(t, up, "delete from role_capabilities;",
		"the up migration must never wipe role_capabilities without a WHERE clause")

	down := readPhase136Migration(t, phase188ProjectTimelineFansubLeadDownFile)
	requirePhase136SQLContains(t, down,
		"delete from role_capabilities",
		"typesetter",
	)
	require.NotContains(t, down, "delete from role_capabilities;",
		"the down migration must never wipe role_capabilities without a WHERE clause")
}

func TestPhase188ProjectTimelineFansubLeadMigrationLiveUpDownUp(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase188ProjectTimelinePrerequisites(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase188ProjectTimelineFansubLeadUpFile))
	assertPhase188ProjectTimelineFansubLeadGranted(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase188ProjectTimelineFansubLeadDownFile))
	assertPhase188ProjectTimelineFansubLeadRolledBack(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase188ProjectTimelineFansubLeadUpFile))
	assertPhase188ProjectTimelineFansubLeadGranted(t, pool)
}

// createPhase188ProjectTimelinePrerequisites spiegelt den dokumentierten Ist-Zustand VOR
// Migration 0185 (188-CONTEXT.md): project_lead UND typesetter haben die Capability bereits
// (project_lead seit Migration 0157, typesetter ueber einen Matrix-UI-Fehlklick), fansub_lead
// hat sie noch nicht.
func createPhase188ProjectTimelinePrerequisites(t testing.TB, pool *pgxpool.Pool) {
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
			('project_lead', 'Projekt-Leitung', ARRAY['fansub_group', 'anime_contribution'], true),
			('typesetter', 'Typesetting', ARRAY['fansub_group', 'anime_contribution'], true);
		INSERT INTO action_definitions(code, label_de, category, sort_order) VALUES
			('anime_fansub_project.timeline.update', 'Projektzeitraum bearbeiten', 'veroeffentlichungen', 235);
		INSERT INTO role_capabilities(role_code, action_code) VALUES
			('project_lead', 'anime_fansub_project.timeline.update'),
			('typesetter', 'anime_fansub_project.timeline.update');
	`)
	require.NoError(t, err)
}

func assertPhase188ProjectTimelineFansubLeadGranted(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE action_code = $1
	`, phase188ProjectTimelineFansubLeadAction).Scan(&count))
	require.Equal(t, 2, count, "nach dem Up: nur fansub_lead und project_lead duerfen die Capability haben")

	for _, role := range []string{"fansub_lead", "project_lead"} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase188ProjectTimelineFansubLeadAction).Scan(&exists))
		require.True(t, exists, "%s muss die Capability nach dem Up halten", role)
	}

	var typesetterStillGranted bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT 1 FROM role_capabilities
			WHERE role_code = 'typesetter' AND action_code = $1
		)
	`, phase188ProjectTimelineFansubLeadAction).Scan(&typesetterStillGranted))
	require.False(t, typesetterStillGranted, "typesetter darf die Capability nach dem Up nicht mehr halten")
}

func assertPhase188ProjectTimelineFansubLeadRolledBack(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE action_code = $1
	`, phase188ProjectTimelineFansubLeadAction).Scan(&count))
	require.Equal(t, 2, count, "nach dem Down: nur project_lead und typesetter duerfen die Capability wieder haben")

	for _, role := range []string{"project_lead", "typesetter"} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase188ProjectTimelineFansubLeadAction).Scan(&exists))
		require.True(t, exists, "%s muss nach dem Down wieder die Capability halten", role)
	}

	var fansubLeadStillGranted bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT 1 FROM role_capabilities
			WHERE role_code = 'fansub_lead' AND action_code = $1
		)
	`, phase188ProjectTimelineFansubLeadAction).Scan(&fansubLeadStillGranted))
	require.False(t, fansubLeadStillGranted, "fansub_lead darf die Capability nach dem Down nicht mehr halten")
}
