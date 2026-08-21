package repository

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
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

func TestPhase136RoleDefinitionLabelAuthorityCatalogMutation(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE contributor_roles (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, label TEXT NOT NULL);
		CREATE TABLE role_definitions (code TEXT PRIMARY KEY, label_de TEXT NOT NULL);
		INSERT INTO contributor_roles(name, label) VALUES ('typesetter', 'STALE LEGACY LABEL');
		INSERT INTO role_definitions(code, label_de) VALUES ('typesetter', 'Typesetting');
	`)
	require.NoError(t, err)

	project := func() string {
		var label string
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT rd.label_de FROM contributor_roles cr
			JOIN role_definitions rd ON rd.code = cr.name
			WHERE cr.name = 'typesetter'
		`).Scan(&label))
		return label
	}
	require.Equal(t, "Typesetting", project())
	_, err = pool.Exec(context.Background(), `UPDATE role_definitions SET label_de='Satz' WHERE code='typesetter'`)
	require.NoError(t, err)
	require.Equal(t, "Satz", project())

	var legacy string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT label FROM contributor_roles WHERE name='typesetter'`).Scan(&legacy))
	require.Equal(t, "STALE LEGACY LABEL", legacy)
}
