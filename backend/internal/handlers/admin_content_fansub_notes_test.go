package handlers

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdminContentFansubNotes_ProjectNoteSourceInvariants(t *testing.T) {
	handlerSrc, err := os.ReadFile("admin_content_anime_project_notes.go")
	require.NoError(t, err)
	content := string(handlerSrc)

	assert.True(t, strings.Contains(content, "ErrInvalidAnimeFansubContext"),
		"handler must map invalid anime/fansub context errors explicitly")
	assert.True(t, strings.Contains(content, "Anime-Fansub-Zuordnung nicht gefunden"),
		"handler must return a clear German 4xx message for invalid anime/fansub context")
	assert.True(t, strings.Contains(content, "DeleteAnimeFansubProjectNote(c.Request.Context(), noteID, animeID, fansubID, identity.UserID)"),
		"delete handler must pass note id plus route context into the repository")
	assert.True(t, strings.Contains(content, "parseFansubRouteID(c)"),
		"project note handlers must evaluate the fansub route context")
	assert.True(t, strings.Contains(content, `strconv.ParseInt(c.Param("animeId"), 10, 64)`),
		"project note handlers must evaluate the anime route context")
}

func TestAdminContentFansubNotes_ScopedWriteSourceInvariants(t *testing.T) {
	groupSrc, err := os.ReadFile("admin_content_fansub_group_notes.go")
	require.NoError(t, err)
	groupContent := string(groupSrc)

	assert.True(t, strings.Contains(groupContent, "UpdateFansubGroupNote(c.Request.Context(), noteID, fansubID, identity.UserID, repoReq)"),
		"group-note updates must pass the fansub route context into the repository")
	assert.True(t, strings.Contains(groupContent, "DeleteFansubGroupNote(c.Request.Context(), noteID, fansubID, identity.UserID)"),
		"group-note deletes must pass the fansub route context into the repository")

	storySrc, err := os.ReadFile("admin_content_member_stories.go")
	require.NoError(t, err)
	storyContent := string(storySrc)

	assert.True(t, strings.Contains(storyContent, "UpdateMemberGroupStory(c.Request.Context(), storyID, fansubID, identity.UserID, repoReq)"),
		"member-story updates must pass the fansub route context into the repository")
	assert.True(t, strings.Contains(storyContent, "DeleteMemberGroupStory(c.Request.Context(), storyID, fansubID, identity.UserID)"),
		"member-story deletes must pass the fansub route context into the repository")
}
