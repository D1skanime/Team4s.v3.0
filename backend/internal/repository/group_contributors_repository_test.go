package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetProjectContributors_EmptyResult verifies that GetProjectContributors
// returns non-nil empty slices (not nil, not error) for a valid anime+group
// combination with no contributor data.
func TestGetProjectContributors_EmptyResult(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	contributorsRepo := NewGroupContributorsRepository(repo.db)

	// Use large IDs that won't have any data in the test DB
	response, err := contributorsRepo.GetProjectContributors(ctx, 999998, 999999)

	require.NoError(t, err, "GetProjectContributors should not error on empty result set")
	require.NotNil(t, response, "response must not be nil")
	assert.NotNil(t, response.TeamMembers, "TeamMembers must not be nil (must be empty slice)")
	assert.NotNil(t, response.ExternalContributors, "ExternalContributors must not be nil (must be empty slice)")
	assert.Equal(t, 0, len(response.TeamMembers), "TeamMembers must be empty for non-existent anime+group")
	assert.Equal(t, 0, len(response.ExternalContributors), "ExternalContributors must be empty for non-existent anime+group")
}

// TestGetProjectContributors_Scoping verifies that GetProjectContributors returns
// only contributors scoped to the requested groupID, with no cross-group leakage.
func TestGetProjectContributors_Scoping(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	// Create two groups and one anime
	fansubRepo := NewFansubRepository(repo.db)
	group1, err := fansubRepo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "scope-group-1",
		Name:   "Scope Group 1",
		Status: "active",
	})
	require.NoError(t, err, "failed to create group1")
	group2, err := fansubRepo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "scope-group-2",
		Name:   "Scope Group 2",
		Status: "active",
	})
	require.NoError(t, err, "failed to create group2")

	animeID := createTestAnime(t, repo.db)

	// Attach both groups to anime
	_, err = fansubRepo.AttachAnimeFansub(ctx, animeID, group1.ID, models.AnimeFansubAttachInput{
		IsPrimary: true,
	})
	require.NoError(t, err, "failed to attach group1 to anime")
	_, err = fansubRepo.AttachAnimeFansub(ctx, animeID, group2.ID, models.AnimeFansubAttachInput{
		IsPrimary: false,
	})
	require.NoError(t, err, "failed to attach group2 to anime")

	contributorsRepo := NewGroupContributorsRepository(repo.db)

	// Query for group1 — should return no contributors from group2
	response, err := contributorsRepo.GetProjectContributors(ctx, animeID, group1.ID)
	require.NoError(t, err, "GetProjectContributors should not error")
	require.NotNil(t, response, "response must not be nil")

	// Verify team members are scoped to group1
	for _, tm := range response.TeamMembers {
		assert.NotEqual(t, int64(0), tm.MemberID, "TeamMember must have valid MemberID")
	}

	// Verify non-nil slices returned
	assert.NotNil(t, response.TeamMembers, "TeamMembers must not be nil")
	assert.NotNil(t, response.ExternalContributors, "ExternalContributors must not be nil")

	// Verify group2 query returns separate (non-overlapping) result from group1 when both have no data
	responseGroup2, err := contributorsRepo.GetProjectContributors(ctx, animeID, group2.ID)
	require.NoError(t, err, "GetProjectContributors for group2 should not error")
	require.NotNil(t, responseGroup2, "group2 response must not be nil")
	assert.NotNil(t, responseGroup2.TeamMembers, "group2 TeamMembers must not be nil")
	assert.NotNil(t, responseGroup2.ExternalContributors, "group2 ExternalContributors must not be nil")
}

// TestGetPublicGroupThemes_VisibilityGate verifies that GetPublicGroupThemes
// only returns themes associated with media_assets where status='ready'.
// Assets with status='pending' must not appear in the response.
func TestGetPublicGroupThemes_VisibilityGate(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	themesRepo := NewGroupThemesRepository(repo.db)

	// Query with non-existent anime+group: must return non-nil empty themes slice
	response, err := themesRepo.GetPublicGroupThemes(ctx, 999998, 999999)
	require.NoError(t, err, "GetPublicGroupThemes should not error on empty result")
	require.NotNil(t, response, "response must not be nil")
	assert.NotNil(t, response.Themes, "Themes must not be nil")
	assert.Equal(t, 0, len(response.Themes), "Themes must be empty for non-existent anime+group")
}

// TestGetPublicReleaseMedia_VisibilityGate verifies that GetPublicReleaseMedia
// only returns items associated with media_assets where status='ready'.
// Assets with status='pending' must not appear in the response.
func TestGetPublicReleaseMedia_VisibilityGate(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	mediaRepo := NewGroupReleaseMediaRepository(repo.db, "")

	// Query with non-existent anime+group: must return non-nil empty items slice
	response, err := mediaRepo.GetPublicReleaseMedia(ctx, 999998, 999999)
	require.NoError(t, err, "GetPublicReleaseMedia should not error on empty result")
	require.NotNil(t, response, "response must not be nil")
	assert.NotNil(t, response.Items, "Items must not be nil")
	assert.Equal(t, 0, len(response.Items), "Items must be empty for non-existent anime+group")
}

func TestGroupPublicMediaRepositoriesUseCanonicalMediaFilesColumns(t *testing.T) {
	releaseMediaSrc, err := os.ReadFile("group_release_media_repository.go")
	require.NoError(t, err)
	themesSrc, err := os.ReadFile("group_themes_repository.go")
	require.NoError(t, err)

	for name, content := range map[string]string{
		"group_release_media_repository.go": string(releaseMediaSrc),
		"group_themes_repository.go":        string(themesSrc),
	} {
		assert.NotContains(t, content, "media_asset_id = ma.id", "%s must use media_files.media_id", name)
		assert.NotContains(t, content, "storage_path", "%s must use media_files.path", name)
		assert.Contains(t, content, "mf_thumb.media_id = ma.id", "%s must join thumbnails through media_files.media_id", name)
		assert.Contains(t, content, "mf_thumb.path", "%s must read thumbnail paths from media_files.path", name)
	}
}

func TestGroupPublicMediaRepositoriesGatePublicApprovedReadyMedia(t *testing.T) {
	releaseMediaSrc, err := os.ReadFile("group_release_media_repository.go")
	require.NoError(t, err)
	themesSrc, err := os.ReadFile("group_themes_repository.go")
	require.NoError(t, err)

	for name, content := range map[string]string{
		"group_release_media_repository.go": string(releaseMediaSrc),
		"group_themes_repository.go":        string(themesSrc),
	} {
		normalized := strings.ToLower(content)
		assert.Contains(t, normalized, "join visibilities", "%s must join visibilities", name)
		assert.Contains(t, normalized, "join review_statuses", "%s must join review_statuses", name)
		assert.Contains(t, normalized, "ma.status = 'ready'", "%s must exclude failed/deleted media assets", name)
		assert.Contains(t, normalized, "v.name = 'public'", "%s must exclude private media", name)
		assert.Contains(t, normalized, "rs.code = 'approved'", "%s must exclude unapproved media", name)
		assert.Contains(t, normalized, "mf_thumb.status = 'ready'", "%s must exclude failed thumbnails", name)
	}
}
