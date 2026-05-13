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

	storySrc, err := os.ReadFile("member_group_stories_repository.go")
	require.NoError(t, err)
	storyContent := string(storySrc)

	assert.True(t, strings.Contains(storyContent, "UpdateMemberGroupStory(\n\tctx context.Context,\n\tstoryID int64,\n\tfansubGroupID int64,"),
		"member-story update signature must include the fansub parent id")
	assert.True(t, strings.Contains(storyContent, "DeleteMemberGroupStory(\n\tctx context.Context,\n\tstoryID int64,\n\tfansubGroupID int64,"),
		"member-story delete signature must include the fansub parent id")
	assert.True(t, strings.Contains(storyContent, "AND fansub_group_id = $2"),
		"member-story mutations must scope SQL writes to the fansub parent id")
}
