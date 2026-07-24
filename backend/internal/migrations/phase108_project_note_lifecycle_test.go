package migrations

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

const (
	phase108ProjectNoteLifecycleUp   = "0138_project_note_first_author_lifecycle.up.sql"
	phase108ProjectNoteLifecycleDown = "0138_project_note_first_author_lifecycle.down.sql"
)

func TestPhase108ProjectNoteLifecycleMigrationUpDown(t *testing.T) {
	pool := openPhase108Pool(t)

	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108ProjectNoteLifecycleUp))
	assertPhase108ProjectNoteLifecycleColumns(t, pool, true)

	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108ProjectNoteLifecycleDown))
	assertPhase108ProjectNoteLifecycleColumns(t, pool, false)
}

func TestPhase108ProjectNoteLifecycleRepresentsUnlinkedFirstAuthor(t *testing.T) {
	pool := openPhase108Pool(t)
	seedPhase108Owners(t, pool)
	_, err := pool.Exec(context.Background(), `INSERT INTO app_users (id, status) VALUES (71, 'active')`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, phase108MigrationPath(t, phase108ProjectNoteLifecycleUp))

	_, err = pool.Exec(context.Background(), `
INSERT INTO project_note_credit_lifecycles (
    anime_id, fansub_group_id, first_author_app_user_id,
    first_author_member_id, generation, lifecycle_status
) VALUES (61, 41, 71, NULL, 1, 'skipped_no_member')`)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
INSERT INTO project_note_credit_lifecycles (
    anime_id, fansub_group_id, first_author_app_user_id,
    first_author_member_id, generation, lifecycle_status
) VALUES (61, 41, 71, NULL, 2, 'awarded')`)
	require.Error(t, err, "an awarded lifecycle must identify a member beneficiary")

	_, err = pool.Exec(context.Background(), `
INSERT INTO project_note_credit_lifecycles (
    anime_id, fansub_group_id, first_author_app_user_id,
    first_author_member_id, generation, lifecycle_status
) VALUES (61, 41, 71, 51, 2, 'skipped_no_member')`)
	require.Error(t, err, "a skipped lifecycle must not identify a member beneficiary")
}

func TestPhase108ProjectNoteLifecycleMigrationContainsNoContentCarryForward(t *testing.T) {
	for _, name := range []string{phase108ProjectNoteLifecycleUp, phase108ProjectNoteLifecycleDown} {
		sql := executablePhase108SQL(t, name)
		require.NotContains(t, sql, "anime_fansub_project_notes")
		require.NotContains(t, sql, "INSERT INTO project_note_credit_lifecycles")
		require.NotContains(t, sql, "UPDATE project_note_credit_lifecycles")
	}
}

func assertPhase108ProjectNoteLifecycleColumns(t testing.TB, pool *pgxpool.Pool, upgraded bool) {
	t.Helper()
	var actorExists, memberNullable bool
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_note_credit_lifecycles'
          AND column_name = 'first_author_app_user_id'
    ),
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_note_credit_lifecycles'
          AND column_name = 'first_author_member_id'
          AND is_nullable = 'YES'
    )`).Scan(&actorExists, &memberNullable))
	require.Equal(t, upgraded, actorExists)
	require.Equal(t, upgraded, memberNullable)
}
