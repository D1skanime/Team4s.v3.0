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
}
