package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReleaseVersionNotesRepositoryMethodSignatures(t *testing.T) {
	var repo *ReleaseVersionNotesRepository
	_ = repo.ListReleaseVersionNotes
	_ = repo.GetMemberRolesForVersion
	_ = repo.BulkUpsertReleaseVersionNotes
	_ = repo.DeleteReleaseVersionNote
}

func TestReleaseVersionNotesRepository_ContributorGuardSourceInvariants(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_notes_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "ErrInvalidReleaseVersionContributorContext"),
		"repository must return an explicit domain error for invalid member/role context")
	assert.True(t, strings.Contains(content, "validateExistingReleaseVersionNoteContributor"),
		"update path must validate that the stored note matches the submitted member/role pair")
	assert.True(t, strings.Contains(content, "storedMemberID != memberID || storedRoleID != roleID"),
		"repository must reject mismatched update payloads instead of silently ignoring member/role changes")
	assert.True(t, strings.Contains(content, "VALUES ($1, $2, $3, $4, $5, $6, $7, 'tiptap', $8, $9, $10, $11, $12, NOW())"),
		"insert path must provide a value for created_by_user_id before created_at")
}

// TestGetMemberRolesForVersion ist ein TDD-Test (Plan 83-03) für D-13.
//
// GetMemberRolesForVersion muss auf anime_contributions + anime_contribution_roles
// umgestellt sein (statt Legacy-Tabelle release_member_roles). Der Test prüft die
// Quelldatei auf die korrekte Implementierung:
//
//   - versions-spezifisch: WHERE ac.release_version_id = $1 (kein IS NULL)
//   - Fallback anime-weit: WHERE ac.release_version_id IS NULL (Schritt 2)
//   - MemberRoleForVersion-Struct enthält RoleCode string, nicht RoleID int64
//   - releaseVersionMemberRoleKey nutzt %d:%s (string), nicht %d:%d (int)
//   - KEIN Join mehr auf release_member_roles
func TestGetMemberRolesForVersion(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_notes_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	// Schritt 1: versions-spezifische Contributions (D-13, D-02)
	t.Run("verwendet-anime_contributions", func(t *testing.T) {
		assert.True(t, strings.Contains(content, "FROM anime_contributions ac"),
			"GetMemberRolesForVersion muss aus anime_contributions lesen, nicht aus release_member_roles")
		assert.False(t, strings.Contains(content, "FROM release_member_roles rmr"),
			"GetMemberRolesForVersion darf nicht mehr aus release_member_roles lesen (D-13)")
	})

	// Schritt 2: Fallback anime-weit (D-02)
	t.Run("fallback-anime-weit", func(t *testing.T) {
		assert.True(t, strings.Contains(content, "release_version_id IS NULL"),
			"Fallback-Query muss release_version_id IS NULL enthalten (anime-weiter Satz, D-02)")
	})

	// Struct-Prüfung: RoleCode statt RoleID (D-13)
	t.Run("struct-role-code", func(t *testing.T) {
		assert.True(t, strings.Contains(content, "RoleCode string"),
			"MemberRoleForVersion-Struct muss RoleCode string enthalten (statt RoleID int64)")
		assert.False(t, strings.Contains(content, "RoleID   int64") || strings.Contains(content, "RoleID int64"),
			"MemberRoleForVersion-Struct darf kein RoleID int64 mehr enthalten (D-13)")
	})

	// Key-Format: %d:%s statt %d:%d (D-13)
	t.Run("key-format-string", func(t *testing.T) {
		assert.True(t, strings.Contains(content, `"%d:%s"`),
			"releaseVersionMemberRoleKey muss %%d:%%s-Format nutzen (memberID:roleCode)")
		assert.False(t, strings.Contains(content, `"%d:%d"`),
			"releaseVersionMemberRoleKey darf kein %%d:%%d-Format mehr nutzen (D-13)")
	})

	// Join auf release_version_groups für Gruppen-Scope (T-83-01)
	t.Run("release_version_groups-scope", func(t *testing.T) {
		assert.True(t, strings.Contains(content, "release_version_groups"),
			"Query muss release_version_groups für Gruppen-Scope einbeziehen (T-83-01)")
	})
}
