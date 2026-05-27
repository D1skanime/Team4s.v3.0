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
	assert.True(t, strings.Contains(content, "DELETE FROM media_files WHERE media_id = $1"),
		"profile avatar replacement must remove previous avatar media_files after the new avatar is linked")
	assert.True(t, strings.Contains(content, "DELETE FROM media_assets WHERE id = $1"),
		"profile avatar replacement must remove the previous avatar media_asset after the new avatar is linked")
}
