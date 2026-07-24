package services

import (
	"context"
	"path/filepath"
	"runtime"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

func TestProjectNoteCreditFirstLinkedAuthorDeleteAndRecreate(t *testing.T) {
	pool := openProjectNoteCreditPool(t)
	seedProjectNoteCreditContext(t, pool)
	linkProjectNoteActor(t, pool, 71, 51, 81)
	linkProjectNoteActor(t, pool, 72, 52, 82)
	service := NewProjectNoteCreditService(pool, repository.NewFansubNotesRepository(pool))

	note, err := service.Upsert(context.Background(), 61, 41, 71, projectNoteRequest("Erster Text"))
	require.NoError(t, err)
	require.Equal(t, int64(5), projectNotePointBalance(t, pool, 51))

	_, err = service.Upsert(context.Background(), 61, 41, 72, projectNoteRequest("Spätere Bearbeitung"))
	require.NoError(t, err)
	require.Zero(t, projectNotePointBalance(t, pool, 52))

	require.NoError(t, service.Delete(context.Background(), note.ID, 61, 41, 72))
	require.Zero(t, projectNotePointBalance(t, pool, 51))
	require.Equal(t, 2, projectNoteLedgerCount(t, pool))

	_, err = service.Upsert(context.Background(), 61, 41, 72, projectNoteRequest("Neuer Lebenszyklus"))
	require.NoError(t, err)
	require.Equal(t, int64(5), projectNotePointBalance(t, pool, 52))
	require.Equal(t, 3, projectNoteLedgerCount(t, pool))
}

func TestUnlinkedFirstAuthorConsumesSlotPermanently(t *testing.T) {
	pool := openProjectNoteCreditPool(t)
	seedProjectNoteCreditContext(t, pool)
	linkProjectNoteActor(t, pool, 72, 52, 82)
	service := NewProjectNoteCreditService(pool, repository.NewFansubNotesRepository(pool))

	note, err := service.Upsert(context.Background(), 61, 41, 71, projectNoteRequest("Unverknüpfter Erstautor"))
	require.NoError(t, err)
	require.Zero(t, projectNoteLedgerCount(t, pool))

	_, err = service.Upsert(context.Background(), 61, 41, 72, projectNoteRequest("Verknüpfter Bearbeiter"))
	require.NoError(t, err)
	linkProjectNoteActor(t, pool, 71, 51, 81)
	_, err = service.Upsert(context.Background(), 61, 41, 71, projectNoteRequest("Erstautor nun verknüpft"))
	require.NoError(t, err)
	require.Zero(t, projectNoteLedgerCount(t, pool))

	require.NoError(t, service.Delete(context.Background(), note.ID, 61, 41, 72))
	require.Zero(t, projectNoteLedgerCount(t, pool), "a skipped generation has no award to reverse")

	_, err = service.Upsert(context.Background(), 61, 41, 72, projectNoteRequest("Generation zwei"))
	require.NoError(t, err)
	require.Equal(t, int64(5), projectNotePointBalance(t, pool, 52))

	var generations, skipped int
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT COUNT(*), COUNT(*) FILTER (WHERE lifecycle_status = 'skipped_no_member')
FROM project_note_credit_lifecycles
WHERE anime_id = 61 AND fansub_group_id = 41`).Scan(&generations, &skipped))
	require.Equal(t, 2, generations)
	require.Equal(t, 1, skipped)
}

func TestProjectNoteCreditRollback(t *testing.T) {
	pool := openProjectNoteCreditPool(t)
	seedProjectNoteCreditContext(t, pool)
	linkProjectNoteActor(t, pool, 71, 51, 81)
	_, err := pool.Exec(context.Background(), `
ALTER TABLE point_rules DISABLE TRIGGER point_rules_immutable;
DELETE FROM point_rules WHERE rule_code = 'project_text_first_author';
ALTER TABLE point_rules ENABLE TRIGGER point_rules_immutable;`)
	require.NoError(t, err)

	service := NewProjectNoteCreditService(pool, repository.NewFansubNotesRepository(pool))
	_, err = service.Upsert(context.Background(), 61, 41, 71, projectNoteRequest("Muss zurückrollen"))
	require.Error(t, err)

	var notes, lifecycles int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM anime_fansub_project_notes`).Scan(&notes))
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM project_note_credit_lifecycles`).Scan(&lifecycles))
	require.Zero(t, notes)
	require.Zero(t, lifecycles)
}

func TestProjectNoteCreditConcurrentRetry(t *testing.T) {
	pool := openProjectNoteCreditPool(t)
	seedProjectNoteCreditContext(t, pool)
	linkProjectNoteActor(t, pool, 71, 51, 81)
	service := NewProjectNoteCreditService(pool, repository.NewFansubNotesRepository(pool))

	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := service.Upsert(context.Background(), 61, 41, 71, projectNoteRequest("Gleichzeitiger Text"))
			errs <- err
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		require.NoError(t, err)
	}
	require.Equal(t, 1, projectNoteLedgerCount(t, pool))
	require.Equal(t, int64(5), projectNotePointBalance(t, pool, 51))
}

func projectNoteRequest(text string) repository.UpsertAnimeFansubProjectNoteRequest {
	return repository.UpsertAnimeFansubProjectNoteRequest{
		Title: "Projekt", BodyJSON: []byte(`{"type":"doc"}`), BodyText: text,
		BodyHTML: "<p>" + text + "</p>", EditorType: "tiptap",
		ContentSchemaVersion: 1, Visibility: "internal", Status: "draft",
	}
}

func openProjectNoteCreditPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE users (id BIGINT PRIMARY KEY);
CREATE TABLE anime (id BIGINT PRIMARY KEY);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (anime_id, fansub_group_id)
);
CREATE TABLE anime_fansub_project_notes (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    title TEXT NOT NULL DEFAULT '',
    body_markdown TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_json JSONB NULL,
    body_text TEXT NOT NULL DEFAULT '',
    editor_type TEXT NOT NULL DEFAULT 'tiptap',
    content_schema_version INT NOT NULL DEFAULT 1,
    visibility TEXT NOT NULL DEFAULT 'internal',
    status TEXT NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_by_user_id BIGINT NULL REFERENCES users(id),
    updated_by_user_id BIGINT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by_user_id BIGINT NULL REFERENCES users(id)
);
CREATE UNIQUE INDEX uq_anime_fansub_project_notes_main
ON anime_fansub_project_notes(anime_id, fansub_group_id) WHERE deleted_at IS NULL;`)
	require.NoError(t, err)
	for _, migration := range []string{
		"0137_phase108_contribution_sources.up.sql",
		"0138_project_note_first_author_lifecycle.up.sql",
	} {
		testsupport.ApplySQLFile(t, pool, projectNoteMigrationPath(t, migration))
	}
	return pool
}

func seedProjectNoteCreditContext(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO anime(id) VALUES (61);
INSERT INTO fansub_groups(id) VALUES (41);
INSERT INTO anime_fansub_groups(anime_id, fansub_group_id) VALUES (61, 41);
INSERT INTO members(id) VALUES (51), (52);
INSERT INTO app_users(id, status) VALUES (71, 'active'), (72, 'active');`)
	require.NoError(t, err)
}

func linkProjectNoteActor(t testing.TB, pool *pgxpool.Pool, appUserID, memberID, claimID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
VALUES ($1, $2, $3, 'verified', NOW())`, claimID, memberID, appUserID)
	require.NoError(t, err)
}

func projectNotePointBalance(t testing.TB, pool *pgxpool.Pool, memberID int64) int64 {
	t.Helper()
	var value int64
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT COALESCE(SUM(point_value), 0) FROM point_ledger_entries WHERE member_id = $1`, memberID).Scan(&value))
	return value
}

func projectNoteLedgerCount(t testing.TB, pool *pgxpool.Pool) int {
	t.Helper()
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM point_ledger_entries`).Scan(&count))
	return count
}

func projectNoteMigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
