package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnimeProjectNotesRepositoryMethodSignatures(t *testing.T) {
	var repo *FansubNotesRepository
	_ = repo.GetAnimeFansubProjectNote
	_ = repo.UpsertAnimeFansubProjectNote
	_ = repo.DeleteAnimeFansubProjectNote
}

func TestAnimeProjectNotesRepository_ContextGuardSourceInvariants(t *testing.T) {
	repoSrc, err := os.ReadFile("anime_project_notes_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "ErrInvalidAnimeFansubContext"),
		"repository must return ErrInvalidAnimeFansubContext for invalid anime/fansub pairs")
	assert.True(t, strings.Contains(content, "FROM anime_fansub_groups"),
		"repository must validate against anime_fansub_groups before upsert/get")
	assert.True(t, strings.Contains(content, "AND anime_id = $2"),
		"delete must be scoped to the anime id from the route context")
	assert.True(t, strings.Contains(content, "AND fansub_group_id = $3"),
		"delete must be scoped to the fansub group id from the route context")
}

func TestAnimeProjectNotesMigration_ContextGuardExists(t *testing.T) {
	migrationSrc, err := os.ReadFile("../../../database/migrations/0066_anime_fansub_project_notes_context_guard.up.sql")
	require.NoError(t, err)
	content := string(migrationSrc)

	assert.True(t, strings.Contains(content, "REFERENCES anime_fansub_groups (anime_id, fansub_group_id)"),
		"migration must bind project notes to anime_fansub_groups with a composite foreign key")
	assert.True(t, strings.Contains(content, "contains rows without anime_fansub_groups context"),
		"migration must fail clearly if invalid historical rows exist")
}
