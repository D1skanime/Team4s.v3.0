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
	assert.True(t, strings.Contains(content, "base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID)"),
		"own profile reads must load recent contributions by authenticated member id")
	assert.True(t, strings.Contains(content, "WHERE rvm.uploaded_by_user_id = $1"),
		"recent media must be isolated by release_version_media.uploaded_by_user_id")
	assert.True(t, strings.Contains(content, "JOIN release_versions rv ON rv.id = rvm.release_version_id"),
		"recent media must resolve the concrete release version")
	assert.True(t, strings.Contains(content, "COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text))"),
		"recent media must expose a readable release version label")
	assert.True(t, strings.Contains(content, "LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb'"),
		"recent media must use the release-version-media thumbnail variant")
	assert.True(t, strings.Contains(content, "JOIN episodes e ON e.id = fr.episode_id"),
		"recent profile activity must resolve anime through fansub_releases -> episodes")
	assert.True(t, strings.Contains(content, "JOIN anime a ON a.id = e.anime_id"),
		"recent profile activity must resolve anime through the canonical episodes.anime_id column")
	assert.False(t, strings.Contains(content, "fr."+"anime_id"),
		"fansub_releases has no anime_id column; recent profile SQL must not use it")
	assert.True(t, strings.Contains(content, "ORDER BY rvm.created_at DESC"),
		"recent media must show newest uploads first")
	assert.True(t, strings.Contains(content, "ORDER BY created_at DESC"),
		"recent contributions must show newest role credits first")
	assert.True(t, strings.Contains(content, "LIMIT 3"),
		"profile recent sections must stay capped for hub display")
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
