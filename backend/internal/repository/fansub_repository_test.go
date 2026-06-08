package repository

import (
	"os"
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

func TestFansubRepository_PublicProfileSourceInvariants(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	if err != nil {
		t.Fatalf("read fansub repository: %v", err)
	}
	content := string(src)

	for _, fragment := range []string{
		"func (r *FansubRepository) GetPublicProfileBySlug",
		"FROM fansub_group_notes",
		"visibility = 'public'",
		"status = 'published'",
		"deleted_at IS NULL",
		"FROM anime_fansub_groups afg",
		"FROM fansub_group_history",
		"status = 'confirmed'",
		"FROM fansub_group_media fgm",
		"JOIN media_assets ma ON ma.id = fgm.media_id",
		"JOIN visibilities v ON v.id = ma.visibility_id",
		"JOIN review_statuses rs ON rs.id = ma.review_status_id",
		"ma.status = 'ready'",
		"rs.code = 'approved'",
		"publicMediaURLForPath",
		"ListCollaborationMembers(ctx, group.ID)",
	} {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected public profile repository to contain %q", fragment)
		}
	}

	if strings.Contains(content, "getAnimeList") {
		t.Fatalf("public fansub profile must not depend on anime list fansub_id filtering")
	}
}

func strPtr(value string) *string {
	return &value
}
