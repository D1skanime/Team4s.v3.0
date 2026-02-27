package repository

import (
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildFansubGroupWhere_SearchesAliases(t *testing.T) {
	whereSQL, args := buildFansubGroupWhere(models.FansubFilter{Q: "B-SH"})

	if !strings.Contains(whereSQL, "fansub_group_aliases") {
		t.Fatalf("expected alias search condition, got %q", whereSQL)
	}
	if len(args) != 1 {
		t.Fatalf("expected 1 argument, got %d", len(args))
	}
	if got := args[0]; got != "%B-SH%" {
		t.Fatalf("unexpected search argument: %#v", got)
	}
}
