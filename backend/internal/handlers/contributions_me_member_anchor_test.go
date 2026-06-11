package handlers

import (
	"os"
	"strings"
	"testing"
)

func TestContributionsMeOwnershipUsesMemberIDAnchorFallback(t *testing.T) {
	srcBytes, err := os.ReadFile("contributions_me_handler.go")
	if err != nil {
		t.Fatalf("read contributions me handler: %v", err)
	}
	src := strings.ToLower(string(srcBytes))

	if !strings.Contains(src, "select coalesce(ac.member_id, hfgm.member_id)") {
		t.Fatal("ownership check must authorize member_id-anchored anime_contributions")
	}
	if !strings.Contains(src, "left join hist_fansub_group_members hfgm on hfgm.id = ac.fansub_group_member_id") {
		t.Fatal("ownership check must keep member_id-only anime_contributions visible with a LEFT JOIN")
	}
}
