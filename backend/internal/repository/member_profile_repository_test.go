package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMemberProfileRepositorySourceInvariants(t *testing.T) {
	repoSrc, err := os.ReadFile("member_profile_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "SELECT fgmr.role"),
		"membership roles must read the real fansub_group_member_roles.role column")
	assert.True(t, strings.Contains(content, "JOIN release_versions rv ON rv.release_id = rmr.release_id"),
		"historical credits must resolve fansub context through release_versions")
	assert.True(t, strings.Contains(content, "JOIN release_version_groups rvg ON rvg.release_version_id = rv.id"),
		"historical credits must resolve fansub groups through release_version_groups")
	assert.True(t, strings.Contains(content, "COUNT(DISTINCT rmr.release_id)::int"),
		"historical credits must avoid double-counting the same release across multiple version rows")
	assert.True(t, strings.Contains(content, "WHERE name = 'avatar'"),
		"profile avatar uploads must use the avatar media type instead of the generic image type")
	assert.True(t, strings.Contains(content, "'source_original'"),
		"profile avatar uploads must retain the uncropped source as a media_files variant")
	assert.True(t, strings.Contains(content, "mf_source.media_id = ma.id AND mf_source.variant = 'source_original'"),
		"own profile avatar reads must expose the retained source only through the own-profile aggregate for re-cropping")
	assert.True(t, strings.Contains(content, "m.member_story_json"),
		"own profile reads must expose the TipTap JSON source for profile story editing")
	assert.True(t, strings.Contains(content, "m.active_from_date"),
		"own profile reads must use the DATE-backed activity period source")
	assert.True(t, strings.Contains(content, "active_from_date = CASE"),
		"own profile updates must persist DATE-backed activity period fields")
	assert.True(t, strings.Contains(content, "active_from_year = CASE WHEN $10"),
		"legacy activity year columns may only be mirrored from the DATE update path")
	assert.True(t, strings.Contains(content, "normalizeProfileActivityDate"),
		"own profile activity dates must be validated as year-normalized date values")
	assert.False(t, strings.Contains(content, "OR m.user_id = au.legacy_user_id"),
		"own profile reads must not treat legacy app user bridges as verified member profiles")
	assert.False(t, strings.Contains(content, "INSERT INTO members ("),
		"own profile reads must not auto-create member profiles for plain accounts")
	assert.True(t, strings.Contains(content, "ErrMemberProfileRequired"),
		"own profile mutations and uploads must require a verified member profile")
	assert.True(t, strings.Contains(content, "member_story_html = CASE"),
		"own profile updates must persist server-rendered story HTML with the JSON update")
	assert.True(t, strings.Contains(content, "member_story_text = CASE"),
		"own profile updates must persist derived plain text with the JSON update")
	assert.True(t, strings.Contains(content, "member_history_description = CASE"),
		"legacy member_history_description must remain as the compatibility plain-text field")
	assert.True(t, strings.Contains(content, "DELETE FROM media_files WHERE media_id = $1"),
		"profile avatar replacement must remove previous avatar media_files after the new avatar is linked")
	assert.True(t, strings.Contains(content, "DELETE FROM media_assets WHERE id = $1"),
		"profile avatar replacement must remove the previous avatar media_asset after the new avatar is linked")
	assert.True(t, strings.Contains(content, "base.RecentMedia, err = r.loadRecentMedia(ctx, appUserID)"),
		"own profile reads must load recent media by authenticated app user id")
	membershipLoadIndex := strings.Index(content, "base.Memberships, err = r.loadMemberships(ctx, base.MemberID, appUserID, true, true)")
	accountOnlyReturnIndex := strings.Index(content, "if !base.HasMemberProfile")
	assert.True(t, membershipLoadIndex >= 0 && accountOnlyReturnIndex >= 0 && membershipLoadIndex < accountOnlyReturnIndex,
		"own profile reads must load app memberships before the account-only return so the drawer can link direct group workspaces")
	assert.True(t, strings.Contains(content, "base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID, false)"),
		"own profile reads must load recent contributions by authenticated member id")
	assert.True(t, strings.Contains(content, "WHERE rvm.uploaded_by_user_id = $1"),
		"recent media must be isolated by release_version_media.uploaded_by_user_id")
	assert.True(t, strings.Contains(content, "JOIN release_versions rv ON rv.id = rvm.release_version_id"),
		"recent media must resolve the concrete release version")
	assert.True(t, strings.Contains(content, "COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text))"),
		"recent media must expose a readable release version label")
	assert.True(t, strings.Contains(content, "COALESCE(NULLIF(BTRIM(rvm.caption), ''), '')"),
		"recent media must expose the user's release-version-media caption when present")
	assert.True(t, strings.Contains(content, "JOIN media_assets ma ON ma.id = rvm.media_asset_id"),
		"recent media must inspect the media asset status")
	assert.True(t, strings.Contains(content, "LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'"),
		"recent media must use ready release-version-media thumbnails")
	assert.True(t, strings.Contains(content, "LEFT JOIN media_files mf_orig ON mf_orig.media_id = rvm.media_asset_id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'"),
		"recent media must fall back to ready original files when no thumbnail exists")
	assert.True(t, strings.Contains(content, "AND ma.status = 'ready'"),
		"recent media must hide failed assets")
	assert.True(t, strings.Contains(content, "AND (mf_thumb.id IS NOT NULL OR mf_orig.id IS NOT NULL)"),
		"recent media must hide assets without a ready file")
	assert.True(t, strings.Contains(content, "JOIN episodes e ON e.id = fr.episode_id"),
		"recent profile activity must resolve anime through fansub_releases -> episodes")
	assert.True(t, strings.Contains(content, "JOIN anime a ON a.id = e.anime_id"),
		"recent profile activity must resolve anime through the canonical episodes.anime_id column")
	assert.False(t, strings.Contains(content, "fr."+"anime_id"),
		"fansub_releases has no anime_id column; recent profile SQL must not use it")
	assert.True(t, strings.Contains(content, "anime_id AS id"),
		"recent profile projects must use anime_id as the stable project card id")
	assert.True(t, strings.Contains(content, "GROUP BY anime_id, anime_title, fansub_group_id"),
		"recent profile projects must aggregate release credits into one anime/fansub project row")
	assert.True(t, strings.Contains(content, "ARRAY_AGG(DISTINCT role_label ORDER BY role_label)"),
		"recent profile projects must merge duplicate roles into distinct labels")
	assert.True(t, strings.Contains(content, "ARRAY_AGG(DISTINCT fansub_group_name ORDER BY fansub_group_name)"),
		"recent profile projects must retain distinct fansub group context as metadata")
	assert.True(t, strings.Contains(content, "COUNT(DISTINCT release_version_id)::int AS release_version_count"),
		"recent profile projects must expose a distinct release-version count")
	assert.True(t, strings.Contains(content, "COUNT(DISTINCT episode_id)::int AS episode_count"),
		"recent profile projects must expose a distinct episode count")
	assert.True(t, strings.Contains(content, "ORDER BY rvm.created_at DESC"),
		"recent media must show newest uploads first")
	assert.True(t, strings.Contains(content, "ORDER BY created_at DESC"),
		"recent contributions must show newest role credits first")
	assert.True(t, strings.Contains(content, "LIMIT 3"),
		"profile recent sections must stay capped for hub display")

	assert.True(t, strings.Contains(content, "func (r *MemberProfileRepository) loadRecentContributions(ctx context.Context, memberID int64, publicOnly bool)"),
		"loadRecentContributions must accept a publicOnly parameter to control anime_contributions visibility")
	assert.True(t, strings.Contains(content, "contribution_credit_rows AS ("),
		"recent contributions must also source from a contribution_credit_rows CTE built on anime_contributions")
	assert.True(t, strings.Contains(content, "FROM anime_contributions ac"),
		"recent contributions must read cast/crew credits from anime_contributions")
	assert.True(t, strings.Contains(content, "JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id"),
		"anime_contributions credits must only count when at least one role is attached")
	assert.True(t, strings.Contains(content, "JOIN contributor_roles cr ON cr.name = acr.role_code"),
		"anime_contributions role codes must resolve to contributor_roles labels")
	assert.True(t, strings.Contains(content, "ac.status = 'confirmed'"),
		"only confirmed anime_contributions may appear as recent projects")
	assert.True(t, strings.Contains(content, "(NOT $2 OR ac.is_public_on_member_profile = true)"),
		"publicOnly must gate anime_contributions visibility without affecting the release_member_roles branch")
	assert.True(t, strings.Contains(content, "UNION ALL"),
		"release_member_roles and anime_contributions credit rows must be combined via UNION ALL")
	assert.True(t, strings.Contains(content, "r.loadRecentContributions(ctx, base.MemberID, false)"),
		"own profile reads must load all confirmed contributions regardless of the public-profile flag")
	assert.True(t, strings.Contains(content, "r.loadRecentContributions(ctx, row.memberID, true)"),
		"public profile reads must only load contributions flagged as public")

	assert.True(t, strings.Contains(content, "worked_release_version_count"),
		"recent contributions must expose a worked_release_version_count column distinguishing real work from role credit")
	assert.True(t, strings.Contains(content, "total_release_version_count"),
		"recent contributions must expose a total_release_version_count column for the absolute progress metric")
	assert.True(t, strings.Contains(content, "FROM release_version_notes n"),
		"the worked-count metric must count release versions with the member's own notes")
	assert.True(t, strings.Contains(content, "n.deleted_at IS NULL"),
		"own-notes matching must exclude soft-deleted release_version_notes")
	assert.True(t, strings.Contains(content, "FROM release_version_media m"),
		"the worked-count metric must count release versions with the member's own uploaded media")
	assert.True(t, strings.Contains(content, "m.deleted_at IS NULL"),
		"own-media matching must exclude soft-deleted release_version_media")
	assert.True(t, strings.Contains(content, "FROM member_claims mc"),
		"own-media matching must resolve the member's app_user_id via member_claims since appUserID is not a parameter here")
	assert.True(t, strings.Contains(content, "mc.claim_status = 'verified'"),
		"member_claims resolution for own-media matching must only use verified claims")
	assert.True(t, strings.Contains(content, "&item.TotalReleaseVersionCount,\n\t\t\t&item.WorkedReleaseVersionCount,"),
		"loadRecentContributions scan must bind TotalReleaseVersionCount then WorkedReleaseVersionCount after EpisodeCount")
}

func TestMemberProfileRepositoryPublicURLForPathNormalizesStoragePaths(t *testing.T) {
	repo := NewMemberProfileRepository(nil, "http://localhost:8092")

	assert.Equal(
		t,
		"http://localhost:8092/media/release-version/41/thumb.jpg",
		repo.publicURLForPath("/app/media/release-version/41/thumb.jpg"),
	)
	assert.Equal(
		t,
		"http://localhost:8092/media/release-version/41/thumb.jpg",
		repo.publicURLForPath(`app\media\release-version\41\thumb.jpg`),
	)
	assert.Equal(
		t,
		"http://cdn.local/media/thumb.jpg",
		repo.publicURLForPath("http://cdn.local/media/thumb.jpg"),
	)
}

func TestPublicMemberProfileRedesignProjectionSourceInvariants(t *testing.T) {
	repoSrc, err := os.ReadFile("member_profile_repository.go")
	require.NoError(t, err)
	modelSrc, err := os.ReadFile("../models/member_profile.go")
	require.NoError(t, err)
	repo := string(repoSrc)
	models := string(modelSrc)
	latestModelStart := strings.Index(models, "type PublicMemberLatestContribution struct {")
	latestModelEnd := strings.Index(models, "type PublicMemberPreviousContribution struct {")
	require.GreaterOrEqual(t, latestModelStart, 0)
	require.Greater(t, latestModelEnd, latestModelStart)
	latestModel := models[latestModelStart:latestModelEnd]

	assert.True(t, strings.Contains(models, "CurrentProjects"),
		"public member profile DTO must expose current_projects derived from confirmed public anime_contributions")
	assert.True(t, strings.Contains(models, "LatestContributions"),
		"public member profile DTO must expose a unified latest_contributions feed instead of separate old recent arrays")
	assert.True(t, strings.Contains(latestModel, "`json:\"release_version_label\"`"),
		"public latest contribution DTO must expose release version labels as explicit contribution context")
	assert.False(t, strings.Contains(latestModel, "`json:\"category,omitempty\"`"),
		"public latest contribution DTO must not expose raw internal category metadata")
	assert.True(t, strings.Contains(latestModel, "`json:\"media_category,omitempty\"`"),
		"public latest media contribution DTO must expose the existing release-version-media category as media_category")
	assert.True(t, strings.Contains(models, "PreviousContributions"),
		"public member profile DTO must expose previous contribution history behind the collapsed UI")
	assert.True(t, strings.Contains(models, "PreviousContributionsCount"),
		"previous contribution count must exclude no-period rows so the UI never reintroduces 'ohne Jahr'")

	assert.True(t, strings.Contains(repo, "loadCurrentProjects"),
		"GetPublicMemberProfile must load current project cards from the member contribution source")
	assert.True(t, strings.Contains(repo, "loadPreviousContributions"),
		"GetPublicMemberProfile must load collapsed previous-history rows from real contribution periods")
	assert.True(t, strings.Contains(repo, "loadLatestContributions"),
		"GetPublicMemberProfile must load one normalized latest feed for public notes and media")

	assert.True(t, strings.Contains(repo, "ac.status = 'confirmed'"),
		"current projects must only use confirmed anime_contributions")
	assert.True(t, strings.Contains(repo, "ac.is_public_on_member_profile = true"),
		"current and previous project rows must be explicitly public on the member profile")
	assert.True(t, strings.Contains(repo, "ac.ended_year IS NULL"),
		"current project classification must be evidence-based and treat open-ended contributions as current")
	assert.True(t, strings.Contains(repo, "ac.ended_year IS NOT NULL"),
		"previous-history rows must require a real ended period and exclude no-period rows")
	assert.True(t, strings.Contains(repo, "LEFT JOIN hist_fansub_group_members"),
		"member contribution projections must retain the existing historical-membership compatibility seam")
	assert.True(t, strings.Contains(repo, "logo_asset.id = fg.logo_id") && strings.Contains(repo, "logo_file.path"),
		"public memberships must fall back from fansub_groups.logo_url to the canonical logo_id media asset")
	assert.True(t, strings.Contains(repo, "includeAppMembershipDetails") && strings.Contains(repo, "loadMemberships(ctx, row.memberID, appUserID, false, false)"),
		"public memberships must not expose current app permission roles as public group roles")
	assert.True(t, strings.Contains(repo, "cover_asset.id = a.cover_asset_id") && strings.Contains(repo, "FROM anime_media am"),
		"current projects must resolve anime poster images from cover_asset_id and existing anime_media when legacy cover_image is empty")
	assert.True(t, strings.Contains(repo, "JOIN media_types anime_media_type") &&
		strings.Contains(repo, "anime_media_type.name = 'poster'"),
		"current project cards must use the same anime_media poster slot as public anime pages")
}

func TestPublicMemberLatestContributionFeedSourceInvariants(t *testing.T) {
	repoSrc, err := os.ReadFile("member_profile_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "FROM release_version_notes"),
		"latest text items must come from release_version_notes")
	assert.True(t, strings.Contains(content, "release_version_notes") && strings.Contains(content, "visibility = 'public'"),
		"latest text items must require public note visibility")
	assert.True(t, strings.Contains(content, "release_version_notes") && strings.Contains(content, "status = 'published'"),
		"latest text items must require published note status")
	assert.True(t, strings.Contains(content, "NULLIF(BTRIM(body_text), '')") ||
		strings.Contains(content, "NULLIF(BTRIM(body_html), '')") ||
		strings.Contains(content, "NULLIF(BTRIM(body_markdown), '')"),
		"latest text items must exclude notes without usable text or HTML")
	assert.True(t, strings.Contains(content, "rv.id AS release_version_id") &&
		strings.Contains(content, "release_version_label"),
		"latest items must include release-version context for public contribution cards")
	assert.True(t, strings.Contains(content, "NULLIF(BTRIM(release_version_notes.title), '') AS contribution_title"),
		"latest text items must expose only the optional curated note title as public title")

	assert.True(t, strings.Contains(content, "FROM release_version_media"),
		"latest media items must come from release_version_media")
	assert.True(t, strings.Contains(content, "JOIN media_assets"),
		"latest media items must inspect media_assets for visibility/review/asset status")
	assert.True(t, strings.Contains(content, "JOIN media_files") || strings.Contains(content, "LEFT JOIN media_files"),
		"latest media items must require a ready media_files variant")
	assert.True(t, strings.Contains(content, "JOIN visibilities") && strings.Contains(content, "name = 'public'"),
		"latest media items must require public media visibility")
	assert.True(t, strings.Contains(content, "JOIN review_statuses") && strings.Contains(content, "code = 'approved'"),
		"latest media items must require approved media review status")
	assert.True(t, strings.Contains(content, "ma.status = 'ready'"),
		"latest media items must exclude processing or failed media assets")
	assert.True(t, strings.Contains(content, "mf.status = 'ready'") || strings.Contains(content, "mf_thumb.status = 'ready'"),
		"latest media items must exclude media without a ready file variant")
	assert.True(t, strings.Contains(content, "rvm.release_version_id IS NOT NULL") ||
		strings.Contains(content, "JOIN release_versions rv ON rv.id = rvm.release_version_id"),
		"latest media items must be addressed by a real release_version_id")
	assert.False(t, strings.Contains(content, "FROM release_media"),
		"latest media feed must not substitute release_media for release-version-scoped process media")
	assert.False(t, strings.Contains(content, "episode_media"),
		"latest media feed must not attach release media directly to neutral episodes")
	assert.True(t, strings.Contains(content, "member_claims") && strings.Contains(content, "claim_status = 'verified'"),
		"latest media owner mapping must include only uploader rows linked to the verified member account")
	assert.True(t, strings.Contains(content, "uploaded_by_user_id"),
		"latest media feed must use the release_version_media uploader column for owner filtering")
	assert.False(t, strings.Contains(content, "rvm.category::text AS category"),
		"public latest media feed must not expose the raw category field name")
	assert.True(t, strings.Contains(content, "rvm.category::text AS media_category"),
		"public latest media feed must expose the existing image type as media_category")
	assert.True(t, strings.Contains(content, "UNION ALL"),
		"latest contribution feed must combine public notes and approved media before applying LIMIT 3")
	assert.True(t, strings.Contains(content, "ORDER BY") && strings.Contains(content, "LIMIT 3"),
		"latest contribution feed must sort by timestamp and return exactly the newest three rows")
}
