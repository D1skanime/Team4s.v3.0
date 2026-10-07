package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFansubNotesRepository_ScopedMutationSourceInvariants(t *testing.T) {
	groupSrc, err := os.ReadFile("fansub_group_notes_repository.go")
	require.NoError(t, err)
	groupContent := string(groupSrc)

	assert.True(t, strings.Contains(groupContent, "UpdateFansubGroupNote(\n\tctx context.Context,\n\tnoteID int64,\n\tfansubGroupID int64,"),
		"group-note update signature must include the fansub parent id")
	assert.True(t, strings.Contains(groupContent, "DeleteFansubGroupNote(\n\tctx context.Context,\n\tnoteID int64,\n\tfansubGroupID int64,"),
		"group-note delete signature must include the fansub parent id")
	assert.True(t, strings.Contains(groupContent, "AND fansub_group_id = $2"),
		"group-note mutations must scope SQL writes to the fansub parent id")
}
