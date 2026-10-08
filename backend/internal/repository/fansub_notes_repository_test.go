package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

// openFansubGroupNotesRepositoryFixture provisions a real, schema-isolated Postgres fixture
// (testsupport.OpenPhase107Postgres's SKIP-not-FAIL convention) with just enough
// production-shaped schema for fansub_group_notes to exercise FansubNotesRepository's real
// UPDATE/DELETE statements against a real database.
func openFansubGroupNotesRepositoryFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE fansub_group_notes (
			id BIGINT PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			title TEXT NOT NULL DEFAULT '',
			body_markdown TEXT NOT NULL DEFAULT '',
			body_html TEXT NOT NULL DEFAULT '',
			body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			body_text TEXT NOT NULL DEFAULT '',
			editor_type TEXT NOT NULL DEFAULT 'tiptap',
			content_schema_version INT NOT NULL DEFAULT 1,
			visibility TEXT NOT NULL DEFAULT 'internal',
			status TEXT NOT NULL DEFAULT 'draft',
			sort_order INT NOT NULL DEFAULT 0,
			created_by_user_id BIGINT NULL REFERENCES users(id),
			updated_by_user_id BIGINT NULL REFERENCES users(id),
			deleted_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);
		INSERT INTO fansub_groups(id) VALUES (41), (42);
		INSERT INTO fansub_group_notes(id, fansub_group_id, title, visibility, status)
			VALUES (91, 41, 'Originaltitel', 'internal', 'draft');
	`)
	require.NoError(t, err)
	return pool
}

// TestFansubNotesRepository_ScopedMutationSourceInvariants used to be a source-grep
// assertion (os.ReadFile + strings.Contains on the repository's own .go source) proving
// nothing more than that the SQL *text* "AND fansub_group_id = $2" exists somewhere in the
// file -- it never ran UpdateFansubGroupNote/DeleteFansubGroupNote against a real database.
// IN-02 (176-REVIEW): replaced with a real-behavior test, mirroring 176-12's conversion of
// admin_content_fansub_notes_test.go/admin_content_theme_asset_locks_test.go in this same
// phase (CLAUDE.md's Teststil rule): both methods are called against a real Postgres
// fixture with a note that genuinely belongs to a DIFFERENT fansub group than the one
// passed in, proving the scoping actually rejects the cross-group call (ErrNotFound, row
// untouched) before proving the correctly-scoped call succeeds.
func TestFansubNotesRepository_ScopedMutationSourceInvariants(t *testing.T) {
	pool := openFansubGroupNotesRepositoryFixture(t)
	repo := NewFansubNotesRepository(pool)
	ctx := context.Background()

	t.Run("update is rejected for a note that belongs to a different fansub group", func(t *testing.T) {
		newTitle := "Von fremder Gruppe gesetzt"
		_, err := repo.UpdateFansubGroupNote(ctx, 91, 42, 0, UpdateFansubGroupNoteRequest{
			Title: &newTitle,
		})
		assert.ErrorIs(t, err, ErrNotFound,
			"update must reject a note id that does not belong to the given fansub group")

		var persistedTitle string
		require.NoError(t, pool.QueryRow(ctx, `SELECT title FROM fansub_group_notes WHERE id = 91`).Scan(&persistedTitle))
		assert.Equal(t, "Originaltitel", persistedTitle, "a rejected cross-group update must not change the row")
	})

	t.Run("update succeeds for a note that belongs to the given fansub group", func(t *testing.T) {
		newTitle := "Von eigener Gruppe gesetzt"
		updated, err := repo.UpdateFansubGroupNote(ctx, 91, 41, 0, UpdateFansubGroupNoteRequest{
			Title: &newTitle,
		})
		require.NoError(t, err)
		assert.Equal(t, newTitle, updated.Title)

		var persistedTitle string
		require.NoError(t, pool.QueryRow(ctx, `SELECT title FROM fansub_group_notes WHERE id = 91`).Scan(&persistedTitle))
		assert.Equal(t, newTitle, persistedTitle)
	})

	t.Run("delete is rejected for a note that belongs to a different fansub group", func(t *testing.T) {
		err := repo.DeleteFansubGroupNote(ctx, 91, 42, 0)
		assert.ErrorIs(t, err, ErrNotFound,
			"delete must reject a note id that does not belong to the given fansub group")

		var deletedAt *string
		require.NoError(t, pool.QueryRow(ctx, `SELECT deleted_at::text FROM fansub_group_notes WHERE id = 91`).Scan(&deletedAt))
		assert.Nil(t, deletedAt, "a rejected cross-group delete must not soft-delete the row")
	})

	t.Run("delete succeeds for a note that belongs to the given fansub group", func(t *testing.T) {
		err := repo.DeleteFansubGroupNote(ctx, 91, 41, 0)
		require.NoError(t, err)

		var deletedAt *string
		require.NoError(t, pool.QueryRow(ctx, `SELECT deleted_at::text FROM fansub_group_notes WHERE id = 91`).Scan(&deletedAt))
		assert.NotNil(t, deletedAt, "a correctly-scoped delete must soft-delete the row")
	})
}
