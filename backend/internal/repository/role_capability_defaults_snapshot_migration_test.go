package repository

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRoleCapabilityDefaultsSnapshotMigrationCapturesCurrentCatalog(t *testing.T) {
	path := filepath.Join("..", "..", "..", "database", "migrations", "0154_role_capability_defaults_snapshot.up.sql")
	source, err := os.ReadFile(path)
	require.NoError(t, err)

	sourceText := string(source)
	assert.Equal(t, 232, strings.Count(sourceText, "('"))
	for _, entry := range []string{
		"('fansub_lead', 'user_group_capability_override.manage')",
		"('techadmin', 'fansub_group_page.technical_links_edit')",
		"('translator', 'review.text.decide')",
		"('quality_checker', 'release_version.notes.write')",
	} {
		assert.Contains(t, sourceText, entry)
	}
}
