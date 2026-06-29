package migrations

import (
	"strings"
	"testing"
)

func TestPhase93RoleScopedProposalMigrationDropsRowUnique(t *testing.T) {
	up := strings.ToLower(readMigrationFile(t, "0111_anime_contributions_role_scoped_proposals.up.sql"))
	down := strings.ToLower(readMigrationFile(t, "0111_anime_contributions_role_scoped_proposals.down.sql"))

	assertContainsAll(t, up, []string{
		"drop constraint if exists uq_anime_contribution_member",
		"idx_anime_contributions_member_context",
		"fansub_group_id, anime_id, fansub_group_member_id, release_version_id",
	})
	assertContainsAll(t, down, []string{
		"having count(*) > 1",
		"cannot restore uq_anime_contribution_member",
		"unique nulls not distinct (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)",
	})
}
