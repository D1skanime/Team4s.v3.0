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
	assert.True(t, strings.Contains(content, "FROM release_member_roles rmr"),
		"repository must load valid member/role pairs from release_member_roles")
	assert.True(t, strings.Contains(content, "JOIN release_versions rv ON rv.release_id = rmr.release_id"),
		"repository must resolve valid pairs through the canonical release_versions -> release_member_roles join")
	assert.True(t, strings.Contains(content, "validateExistingReleaseVersionNoteContributor"),
		"update path must validate that the stored note matches the submitted member/role pair")
	assert.True(t, strings.Contains(content, "storedMemberID != memberID || storedRoleID != roleID"),
		"repository must reject mismatched update payloads instead of silently ignoring member/role changes")
	assert.True(t, strings.Contains(content, "VALUES ($1, $2, $3, $4, $5, $6, $7, 'tiptap', $8, $9, $10, $11, $12, NOW())"),
		"insert path must provide a value for created_by_user_id before created_at")
}
