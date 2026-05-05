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

func TestApplyLegacyLinkProjection_UsesCanonicalLinks(t *testing.T) {
	group := models.FansubGroup{
		WebsiteURL: strPtr("https://legacy.example"),
		DiscordURL: strPtr("https://legacy.example/discord"),
		Links: []models.FansubGroupLink{
			{LinkType: models.FansubGroupLinkTypeWebsite, URL: "https://canonical.example"},
			{LinkType: models.FansubGroupLinkTypeDiscord, URL: "https://canonical.example/discord"},
		},
	}

	applyLegacyLinkProjection(&group)

	if group.WebsiteURL == nil || *group.WebsiteURL != "https://canonical.example" {
		t.Fatalf("expected projected website url, got %#v", group.WebsiteURL)
	}
	if group.DiscordURL == nil || *group.DiscordURL != "https://canonical.example/discord" {
		t.Fatalf("expected projected discord url, got %#v", group.DiscordURL)
	}
}

func strPtr(value string) *string {
	return &value
}
