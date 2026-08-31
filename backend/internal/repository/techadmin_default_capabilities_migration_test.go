package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTechadminDefaultCapabilitiesMigrationContainsApprovedDefaults(t *testing.T) {
	path := filepath.Join("..", "..", "..", "database", "migrations", "0153_techadmin_default_capabilities.up.sql")
	source, err := os.ReadFile(path)
	require.NoError(t, err)
	sourceText := string(source)

	for _, action := range []string{
		"fansub_group_media.upload",
		"fansub_group.links.manage",
		"fansub_group_media.update",
		"fansub_group_page.technical_links_edit",
		"fansub_group.members.view",
		"fansub_group_links.update",
		"fansub_group.invitations.view",
		"fansub_group.invitations.create",
		"fansub_group.invitations.cancel",
		"review.image.decide",
		"review.contribution.decide",
		"fansub_group_media.view",
	} {
		assert.Contains(t, sourceText, action)
	}
}
