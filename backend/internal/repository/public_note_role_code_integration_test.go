package repository

// TestPublicNoteRoleCode beweist gegen eine echte, isolierte Postgres-Instanz
// (Phase 147 / HC-01), dass role_code an allen drei oeffentlichen
// Notiz-Abfragestellen aus role_definitions.code stammt und unabhaengig von
// role_definitions.label_de bleibt:
//   - ListReleaseVersionNotesCursor (release_detail_public_repository.go)
//   - loadNotes (release_detail_public_repository_helpers.go, 2. Query-Site
//     fuer PublicReleaseNote, genutzt von GetPublicReleaseDetail)
//   - ProjectMemberPublicRepository.ListNotes (project_member_public_repository.go)
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset (testsupport.OpenPhase117Postgres).

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestPublicNoteRoleCode(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID           = int64(1)
		episodeID         = int64(1)
		fansubGroupID     = int64(1)
		fansubReleaseID   = int64(1)
		releaseVersionID  = int64(10)
		memberID          = int64(1)
		contributorRoleID = int64(1)
		noteID            = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, episode_number) VALUES ($1, $2, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, name) VALUES ($1, 'Test-Gruppe')`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)
	`, releaseVersionID, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id, nickname) VALUES ($1, 'Testmitglied')`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO contributor_roles (id, name) VALUES ($1, 'phase147_test_role')`, contributorRoleID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de) VALUES ('phase147_test_role', 'Testrolle Eins')
	`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_notes (id, release_version_id, member_id, role_id, visibility, status)
		VALUES ($1, $2, $3, $4, 'public', 'published')
	`, noteID, releaseVersionID, memberID, contributorRoleID)
	require.NoError(t, err)

	repo := NewReleaseDetailPublicRepository(pool, "")
	pmRepo := NewProjectMemberPublicRepository(pool)

	type result struct {
		cursorRoleCode, cursorRoleLabel string
		loadRoleCode, loadRoleLabel     string
		pmRoleCode, pmRoleLabel         string
	}

	callAll := func(t *testing.T) result {
		t.Helper()
		var out result

		cursorPage, err := repo.ListReleaseVersionNotesCursor(ctx, animeID, fansubGroupID, releaseVersionID, "", 10)
		require.NoError(t, err)
		require.Len(t, cursorPage.Items, 1)
		out.cursorRoleCode = cursorPage.Items[0].RoleCode
		out.cursorRoleLabel = cursorPage.Items[0].RoleLabel

		loadedNotes, err := repo.loadNotes(ctx, releaseVersionID)
		require.NoError(t, err)
		require.Len(t, loadedNotes, 1)
		out.loadRoleCode = loadedNotes[0].RoleCode
		out.loadRoleLabel = loadedNotes[0].RoleLabel

		pmNotes, _, _, err := pmRepo.ListNotes(ctx, animeID, fansubGroupID, memberID, "", 10)
		require.NoError(t, err)
		require.Len(t, pmNotes, 1)
		out.pmRoleCode = pmNotes[0].RoleCode
		out.pmRoleLabel = pmNotes[0].RoleLabel

		return out
	}

	t.Run("role_code stammt an allen drei Abfragestellen aus role_definitions.code", func(t *testing.T) {
		out := callAll(t)
		require.Equal(t, "phase147_test_role", out.cursorRoleCode)
		require.Equal(t, "Testrolle Eins", out.cursorRoleLabel)
		require.Equal(t, "phase147_test_role", out.loadRoleCode)
		require.Equal(t, "Testrolle Eins", out.loadRoleLabel)
		require.Equal(t, "phase147_test_role", out.pmRoleCode)
		require.Equal(t, "Testrolle Eins", out.pmRoleLabel)
	})

	t.Run("Aenderung von label_de aendert role_code an keiner der drei Stellen", func(t *testing.T) {
		_, err := pool.Exec(ctx, `UPDATE role_definitions SET label_de = 'Testrolle Zwei' WHERE code = 'phase147_test_role'`)
		require.NoError(t, err)

		out := callAll(t)
		require.Equal(t, "Testrolle Zwei", out.cursorRoleLabel)
		require.Equal(t, "phase147_test_role", out.cursorRoleCode, "role_code darf sich durch eine label_de-Aenderung nicht aendern")
		require.Equal(t, "Testrolle Zwei", out.loadRoleLabel)
		require.Equal(t, "phase147_test_role", out.loadRoleCode, "role_code darf sich durch eine label_de-Aenderung nicht aendern")
		require.Equal(t, "Testrolle Zwei", out.pmRoleLabel)
		require.Equal(t, "phase147_test_role", out.pmRoleCode, "role_code darf sich durch eine label_de-Aenderung nicht aendern")
	})
}
