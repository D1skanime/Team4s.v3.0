package migrations

import (
	"strings"
	"testing"
)

func TestPhase117FansubGroupMemberHistoricalLinkBackfill(t *testing.T) {
	up := strings.ToLower(readMigrationFile(t, "0117_backfill_fansub_group_member_historical_links.up.sql"))
	down := strings.ToLower(readMigrationFile(t, "0117_backfill_fansub_group_member_historical_links.down.sql"))

	assertContainsAll(t, up, []string{
		"with linked_members as",
		"select distinct on (fgm.id)",
		"update fansub_group_members fgm",
		"set",
		"member_id = linked.member_id",
		"join member_claims mc",
		"join hist_fansub_group_members hfgm",
		"hfgm.member_id = mc.member_id",
		"hfgm.fansub_group_id = fgm.fansub_group_id",
		"mc.app_user_id = fgm.app_user_id",
		"mc.claim_status = 'verified'",
		"where fgm.member_id is null",
		"from linked_members linked",
		"fgm.id = linked.fansub_group_member_id",
	})

	assertContainsAll(t, down, []string{
		"no-op",
		"kanonischer identitaetsanker",
	})
}
