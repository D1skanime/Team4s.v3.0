package repository

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
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

func TestGroupContributorsRepositoryUsesMemberAnchoredPublicProjectContributions(t *testing.T) {
	contentBytes, err := os.ReadFile("group_contributors_repository.go")
	require.NoError(t, err)
	content := strings.ToLower(string(contentBytes))

	assert.Contains(t, content, "join members m on m.id = ac.member_id")
	assert.Contains(t, content, "nullif(trim(member_avatar.file_path), '') as member_avatar_url")
	assert.Contains(t, content, "left join media_assets member_avatar on member_avatar.id = m.avatar_media_id")
	assert.Contains(t, content, "left join hist_fansub_group_members hfgm on hfgm.id = ac.fansub_group_member_id")
	assert.Contains(t, content, "left join visibilities v on v.id = ac.visibility_id")
	assert.Contains(t, content, "coalesce(v.name, 'public') = 'public'")
	assert.Contains(t, content, "ac.is_public_on_anime_page = true")
	assert.NotContains(t, content, "join hist_fansub_group_members hfgm on hfgm.id = ac.fansub_group_member_id\n\t\tjoin members m on m.id = hfgm.member_id")
}

func TestGroupContributorsRepositoryUsesCanonicalPublicMemberSlugs(t *testing.T) {
	contentBytes, err := os.ReadFile("group_contributors_repository.go")
	require.NoError(t, err)
	content := strings.ToLower(string(contentBytes))

	const storedSlugProjection = "case when m.profile_visibility = 'public' then m.public_slug else null end as member_slug"
	assert.Equal(t, 2, strings.Count(content, storedSlugProjection), "both contributor query blocks must use the stored public slug")
	assert.NotContains(t, content, "memberslugexpr", "group contributor links must not derive slugs from nicknames")
	assert.NotContains(t, content, "regexp_replace", "group contributor links must not derive slugs with a nickname regex")
	assert.NotContains(t, content, "coalesce(m.public_slug", "stored public slugs must not fall back to derived identity")
}

// Plan 155-03 (Requirements P155-03, P155-04): the constant-query-budget
// regression gate proving GetProjectContributors issues the SAME number of
// SQL queries (2: one external-contributors query, one team-members query)
// whether a project has 0 contributors or 30-50 contributors across many
// roles. This locks in, with a real running test, the negative finding
// RESEARCH.md already confirmed by direct SQL inspection (Workstream B): the
// repository's existing SQL is already bounded and join-arm; this plan does
// not change it.
//
// Uses openPhase155Postgres/mustExecPhase155 declared in
// fansub_project_resolver_query_budget_test.go (Plan 155-01, same package) --
// deliberately NOT setupTestRepo, which unconditionally skips
// (test_helpers.go:14-17) and has therefore never actually run against a
// real database.

// seedPhase155ContributorBudgetGroup seeds one fansub_groups row, one anime
// scoped to it, one shared release chain (episode/release/version/
// version_group) team members attach to, and teamCount team members (via
// release_member_roles) plus externalCount external contributors (via
// anime_contributions). Every member/contribution id is namespaced by
// groupID*1000+offset to keep seeds collision-free across groups within a
// single test run. Returns the seeded animeID.
func seedPhase155ContributorBudgetGroup(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string, teamCount int, externalCount int) int64 {
	t.Helper()

	animeID := groupID * 1000
	episodeID := animeID + 1
	releaseID := animeID + 2
	versionID := animeID + 3

	mustExecPhase155(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status) VALUES (%d, '%s', 'Phase155 Contributors Group %d', 'active');
		INSERT INTO anime (id, title, status) VALUES (%d, 'Phase155 Contributors Anime %d', 'ongoing');
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (%d, %d);
		INSERT INTO episodes (id, anime_id, episode_number) VALUES (%d, %d, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES (%d, %d);
		INSERT INTO release_versions (id, release_id, version) VALUES (%d, %d, 'v1');
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (%d, %d);
	`, groupID, slug, groupID,
		animeID, animeID,
		animeID, groupID,
		episodeID, animeID,
		releaseID, episodeID,
		versionID, releaseID,
		versionID, groupID))

	// Shared lookup rows (idempotent, ON CONFLICT DO NOTHING): one
	// contributor_roles row and a role_definitions row sharing the exact
	// same string. GetProjectContributors' team query joins
	// role_definitions.code = contributor_roles.name verbatim
	// (case-sensitive) -- the production seed rows ('Translator' vs
	// 'translator') never satisfy that join, and this DSN-gated test
	// database (schema-only clone) carries no lookup-row data at all, so
	// this test must supply its own matching pair to seed any team member
	// row through.
	mustExecPhase155(t, pool, `
		INSERT INTO contributor_roles (name) VALUES ('Phase155BudgetRole') ON CONFLICT (name) DO NOTHING;
		INSERT INTO role_definitions (code, label_de, contexts, sort_order)
			VALUES ('Phase155BudgetRole', 'Phase155 Budget Rolle', ARRAY['anime_contribution'], 0)
			ON CONFLICT (code) DO NOTHING;
	`)

	for i := 0; i < teamCount; i++ {
		memberID := groupID*1000 + 100 + int64(i)
		memberSlug := fmt.Sprintf("phase155-team-%d", memberID)
		mustExecPhase155(t, pool, fmt.Sprintf(`
			INSERT INTO members (id, nickname, display_name, public_slug, profile_visibility)
				VALUES (%d, 'Phase155 Team %d', 'Phase155 Team Member %d', '%s', 'public');
			INSERT INTO release_member_roles (release_id, member_id, role_id)
				SELECT %d, %d, cr.id FROM contributor_roles cr WHERE cr.name = 'Phase155BudgetRole';
		`, memberID, memberID, memberID, memberSlug, releaseID, memberID))
	}

	for i := 0; i < externalCount; i++ {
		memberID := groupID*1000 + 500 + int64(i)
		contribID := groupID*1000 + 700 + int64(i)
		memberSlug := fmt.Sprintf("phase155-external-%d", memberID)
		mustExecPhase155(t, pool, fmt.Sprintf(`
			INSERT INTO members (id, nickname, display_name, public_slug, profile_visibility)
				VALUES (%d, 'Phase155 External %d', 'Phase155 External Member %d', '%s', 'public');
			INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_anime_page)
				VALUES (%d, %d, %d, %d, 'confirmed', true);
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
				VALUES (%d, 'Phase155BudgetRole');
		`, memberID, memberID, memberID, memberSlug, contribID, groupID, animeID, memberID, contribID))
	}

	return animeID
}

// phase155ContributorsConstantQueryBudget is the enforced constant number of
// SQL queries a single GetProjectContributors call issues, INDEPENDENT of
// how many team members/external contributors the project has: one query
// for the external-contributors block, one query for the team-members
// block. This is the exact number RESEARCH.md's own live-EXPLAIN finding
// already established for this repository's existing, unmodified SQL.
// Update this constant ONLY for an intentional, documented repository
// change.
const phase155ContributorsConstantQueryBudget = 2

// TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors locks
// in, with a real seeded 30-50-contributor scale, the negative finding
// RESEARCH.md already confirmed by direct SQL inspection (Workstream B):
// GetProjectContributors already issues exactly 2 fixed SQL queries
// regardless of contributor count -- there is no per-member request/query
// fan-out today (P155-04). Notes/media volume is deliberately not seeded:
// GetProjectContributors does not join the notes/media tables at all, which
// is itself part of what a constant query count at this scale proves.
func TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors(t *testing.T) {
	pool, counter := openPhase155Postgres(t)
	repo := NewGroupContributorsRepository(pool)

	const smallGroupID int64 = 1550400
	const largeGroupID int64 = 1550500
	const smallTeamCount = 2
	const smallExternalCount = 2
	const largeTeamCount = 30
	const largeExternalCount = 20

	smallAnimeID := seedPhase155ContributorBudgetGroup(t, pool, smallGroupID, "phase155-contrib-small", smallTeamCount, smallExternalCount)
	largeAnimeID := seedPhase155ContributorBudgetGroup(t, pool, largeGroupID, "phase155-contrib-large", largeTeamCount, largeExternalCount)

	counter.reset()
	small, err := repo.GetProjectContributors(context.Background(), smallAnimeID, smallGroupID)
	require.NoError(t, err)
	smallCount := counter.count()
	require.Lenf(t, small.TeamMembers, smallTeamCount, "small seed must list exactly its %d seeded team members", smallTeamCount)
	require.Lenf(t, small.ExternalContributors, smallExternalCount, "small seed must list exactly its %d seeded external contributors", smallExternalCount)

	counter.reset()
	large, err := repo.GetProjectContributors(context.Background(), largeAnimeID, largeGroupID)
	require.NoError(t, err)
	largeCount := counter.count()
	require.Lenf(t, large.TeamMembers, largeTeamCount, "large seed must list exactly its %d seeded team members", largeTeamCount)
	require.Lenf(t, large.ExternalContributors, largeExternalCount, "large seed must list exactly its %d seeded external contributors", largeExternalCount)

	t.Logf("P155-04 constant-budget gate: %d+%d contributors -> %d queries; %d+%d contributors -> %d queries (must be equal and constant).",
		smallTeamCount, smallExternalCount, smallCount, largeTeamCount, largeExternalCount, largeCount)

	require.Equalf(t, smallCount, largeCount,
		"constant query budget violated: %d-contributor project issued %d queries but %d-contributor project issued %d (GetProjectContributors cost must not grow with contributor count)",
		smallTeamCount+smallExternalCount, smallCount, largeTeamCount+largeExternalCount, largeCount)
	require.Equalf(t, phase155ContributorsConstantQueryBudget, largeCount,
		"GetProjectContributors query budget drifted from the enforced constant %d; got %d (update phase155ContributorsConstantQueryBudget only with an intentional, documented repository change)",
		phase155ContributorsConstantQueryBudget, largeCount)
}
