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
		"func (r *FansubRepository) listPublicFansubStories",
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
		"fgm.deleted_at IS NULL",
		"fgm.title",
		"fgm.description",
		"fgm.category",
		"ORDER BY fgm.sort_order ASC",
		"banner_resolved_url",
		"r.ListGroupLinks(ctx, group.ID)",
		"CommunityLinks",
	} {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected public profile repository to contain %q", fragment)
		}
	}

	if strings.Contains(content, "getAnimeList") {
		t.Fatalf("public fansub profile must not depend on anime list fansub_id filtering")
	}
}

// TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers pins the
// AO4-01 counting semantics for the MembersCount batch at the source level
// (no DB harness available here). The batch must sum active
// fansub_group_members (no profile_visibility row filter, so a private/
// unclaimed active member still counts, matching listProjectionMembers) plus
// publicly visible historical hist_fansub_group_members rows (matching
// listProjectionHistorical), and must never reference the legacy
// fansub_members table.
func TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	if err != nil {
		t.Fatalf("read fansub repository: %v", err)
	}
	content := string(src)

	start := strings.Index(content, "func (r *FansubRepository) attachGroupCounts(")
	if start < 0 {
		t.Fatalf("attachGroupCounts function not found")
	}
	end := strings.Index(content, "func (r *FansubRepository) attachGroupLinks(")
	if end < 0 || end < start {
		t.Fatalf("could not bound attachGroupCounts function body")
	}
	body := content[start:end]

	for _, fragment := range []string{
		"fansub_group_members",
		"status = 'active'",
		"hist_fansub_group_members",
		"visibility = 'public'",
		"GROUP BY group_id",
	} {
		if !strings.Contains(body, fragment) {
			t.Fatalf("expected MembersCount batch query to contain %q", fragment)
		}
	}

	if strings.Contains(body, "profile_visibility = 'public'") || strings.Contains(body, "profile_visibility='public'") {
		t.Fatalf("MembersCount batch must not filter active members by profile_visibility = 'public' (would exclude private/unclaimed active members, contradicting listProjectionMembers)")
	}
	if strings.Contains(body, "FROM fansub_members") {
		t.Fatalf("MembersCount batch must not reference legacy fansub_members table")
	}
}

func TestFansubRepository_DeleteGroupCleansRestrictedChildrenFirst(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	if err != nil {
		t.Fatalf("read fansub repository: %v", err)
	}
	content := string(src)

	contributionDelete := strings.Index(content, "DELETE FROM anime_contributions WHERE fansub_group_id = $1")
	histMemberDelete := strings.Index(content, "DELETE FROM hist_fansub_group_members WHERE fansub_group_id = $1")
	groupDelete := strings.Index(content, "DELETE FROM fansub_groups WHERE id = $1")

	if contributionDelete < 0 {
		t.Fatalf("DeleteGroup must delete anime_contributions before deleting the group")
	}
	if histMemberDelete < 0 {
		t.Fatalf("DeleteGroup must delete hist_fansub_group_members before deleting the group")
	}
	if groupDelete < 0 {
		t.Fatalf("DeleteGroup must delete fansub_groups")
	}
	if !(contributionDelete < histMemberDelete && histMemberDelete < groupDelete) {
		t.Fatalf("DeleteGroup must delete restricted child rows before fansub_groups")
	}
	if !strings.Contains(content, "BeginTx(ctx, pgx.TxOptions{})") {
		t.Fatalf("DeleteGroup must run cleanup and parent delete in one transaction")
	}
}

func strPtr(value string) *string {
	return &value
}
