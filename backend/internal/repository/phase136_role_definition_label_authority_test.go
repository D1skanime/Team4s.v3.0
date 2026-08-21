package repository

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase136RoleDefinitionLabelAuthorityInventory(t *testing.T) {
	owned := []string{
		"group_contributors_repository.go",
		"member_profile_memberships_repository.go",
		"member_profile_recent_repository.go",
		"project_member_public_repository.go",
		"release_detail_public_repository.go",
		"release_detail_public_repository_helpers.go",
	}
	legacyProjection := regexp.MustCompile(`(?i)\bcr\.label\b`)
	for _, name := range owned {
		raw, err := os.ReadFile(name)
		require.NoError(t, err)
		source := string(raw)
		require.False(t, legacyProjection.MatchString(source), "%s must not project contributor_roles.label", name)
		require.Contains(t, strings.ToLower(source), "role_definitions", "%s must join the canonical role catalog", name)
		require.Contains(t, strings.ToLower(source), "rd.label_de", "%s must project the mutable canonical label", name)
	}
}

func TestPhase136RoleDefinitionLabelAuthorityIsExhaustive(t *testing.T) {
	entries, err := os.ReadDir(".")
	require.NoError(t, err)
	legacyProjection := regexp.MustCompile(`(?i)\bcr\.label\b`)
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".go" || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		raw, readErr := os.ReadFile(entry.Name())
		require.NoError(t, readErr)
		require.False(t, legacyProjection.Match(raw), "%s retains legacy presentation authority", entry.Name())
	}
}
