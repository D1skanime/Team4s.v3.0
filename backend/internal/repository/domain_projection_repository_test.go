package repository

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestProjectionSeparatesThreeSets(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	required := []string{
		"from fansub_group_members",
		"from hist_fansub_group_members",
		"from anime_contributions",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected domain projection repository to contain %q", fragment)
		}
	}
	if strings.Contains(normalized, "union") {
		t.Fatalf("expected domain projection repository to keep sets separate without UNION")
	}
}

func TestProjectionDisputeStateIsolated(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	required := []string{
		"ac.dispute_state",
		"ac.status",
		"left join review_statuses",
		"left join visibilities",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected domain projection repository to contain %q", fragment)
		}
	}
}

func TestProjectionClaimedDerivedFromClaims(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	required := []string{
		"member_claims",
		"'verified'",
		"claim_status",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected domain projection repository to contain %q", fragment)
		}
	}

	memberBlockStart := strings.Index(normalized, "func (r *domainprojectionrepository) listprojectionmembers")
	historicalBlockStart := strings.Index(normalized, "from hist_fansub_group_members")
	if memberBlockStart < 0 || historicalBlockStart < 0 || historicalBlockStart <= memberBlockStart {
		t.Fatalf("expected member SELECT block before historical SELECT block")
	}
	memberBlock := normalized[:historicalBlockStart]
	if !strings.Contains(memberBlock, "member_claims") || !strings.Contains(memberBlock, "claim_status") {
		t.Fatalf("expected claimed field in member SELECT block to be derived from member_claims.claim_status")
	}
	if strings.Contains(memberBlock, "anime_contributions") {
		t.Fatalf("expected member SELECT block not to derive claimed from anime_contributions")
	}
}

func TestProjectionPublicMemberRowsAvoidInternalIdentity(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	forbidden := []string{
		"`json:\"app_user_id\"`",
		"au.email",
	}
	for _, fragment := range forbidden {
		if strings.Contains(normalized, fragment) {
			t.Fatalf("expected public domain projection not to expose internal identity fragment %q", fragment)
		}
	}

	memberBlockStart := strings.Index(normalized, "func (r *domainprojectionrepository) listprojectionmembers")
	historicalBlockStart := strings.Index(normalized, "from hist_fansub_group_members")
	if memberBlockStart < 0 || historicalBlockStart < 0 || historicalBlockStart <= memberBlockStart {
		t.Fatalf("expected member SELECT block before historical SELECT block")
	}
	memberBlock := normalized[memberBlockStart:historicalBlockStart]
	memberBlockCompact := strings.Join(strings.Fields(memberBlock), " ")
	if strings.Contains(memberBlockCompact, "and fgm.status = 'active' and m.id is not null") {
		t.Fatalf("expected public domain projection to include active group members without requiring a linked member profile")
	}
	if strings.Contains(memberBlockCompact, "and fgm.status = 'active' and m.profile_visibility = 'public'") {
		t.Fatalf("expected public domain projection not to hide active group membership behind member profile visibility")
	}

	requiredMemberFragments := []string{
		"nullif(trim(au.display_name), '')",
		"when m.id is not null and m.profile_visibility = 'public'",
		"else null",
	}
	for _, fragment := range requiredMemberFragments {
		if !strings.Contains(memberBlockCompact, fragment) {
			t.Fatalf("expected public domain projection member query to contain %q", fragment)
		}
	}
}

func TestProjectionHistoricalRowsUseMembershipVisibilityForListing(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	historicalBlockStart := strings.Index(normalized, "func (r *domainprojectionrepository) listprojectionhistorical")
	contributorBlockStart := strings.Index(normalized, "from anime_contributions")
	if historicalBlockStart < 0 || contributorBlockStart < 0 || contributorBlockStart <= historicalBlockStart {
		t.Fatalf("expected historical SELECT block before contributor SELECT block")
	}
	historicalBlock := normalized[historicalBlockStart:contributorBlockStart]
	historicalBlockCompact := strings.Join(strings.Fields(historicalBlock), " ")
	if !strings.Contains(historicalBlock, "hfgm.visibility = 'public'") {
		t.Fatalf("expected historical group membership listing to be guarded by membership visibility")
	}
	if strings.Contains(historicalBlock, "and m.profile_visibility = 'public'") {
		t.Fatalf("expected historical group membership not to be hidden behind member profile visibility")
	}
	if !strings.Contains(historicalBlockCompact, "and not exists ( select 1 from fansub_group_members active_member") {
		t.Fatalf("expected historical projection to exclude members that are currently active in the same fansub group")
	}

	requiredSlugFragments := []string{
		"when m.profile_visibility = 'public'",
		"else null",
	}
	for _, fragment := range requiredSlugFragments {
		if !strings.Contains(historicalBlockCompact, fragment) {
			t.Fatalf("expected historical member slug query to contain %q", fragment)
		}
	}
}

func TestProjectionUsesFansubNameBeforeProfileDisplayName(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	normalized := strings.ToLower(content)

	expected := "coalesce(nullif(trim(%s.nickname), ''), nullif(trim(%s.display_name), ''), 'mitglied')"
	if !strings.Contains(normalized, expected) {
		t.Fatalf("expected domain projection display name to prefer members.nickname before members.display_name")
	}
}

func TestProjectionHandlerHasNoEnvelope(t *testing.T) {
	content := readBackendSource(t, filepath.Join("internal", "handlers", "domain_projection_handler.go"))
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "c.json(http.statusok, response)") {
		t.Fatalf("expected domain projection handler to return the response DTO directly")
	}
	if strings.Contains(normalized, "\"data\"") {
		t.Fatalf("expected domain projection handler not to wrap response in a data envelope")
	}
}

func TestProjectionRouteIsGetOnly(t *testing.T) {
	content := readBackendSource(t, filepath.Join("cmd", "server", "main.go"))
	normalized := strings.ToLower(content)

	route := "\"/fansubs/:id/domain-projection\""
	if !strings.Contains(normalized, "v1.get("+route) {
		t.Fatalf("expected domain projection route to be registered as GET")
	}

	for _, method := range []string{"post", "patch", "put", "delete"} {
		if strings.Contains(normalized, "v1."+method+"("+route) {
			t.Fatalf("expected domain projection route not to be registered as %s", method)
		}
	}
}

func TestProjectionUsesCanonicalPublicMemberSlugs(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "domain_projection_repository.go"))
	memberStart := strings.Index(content, "func (r *domainprojectionrepository) listprojectionmembers")
	historicalStart := strings.Index(content, "func (r *domainprojectionrepository) listprojectionhistorical")
	contributorStart := strings.Index(content, "func (r *domainprojectionrepository) listprojectioncontributors")
	if memberStart < 0 || historicalStart <= memberStart || contributorStart <= historicalStart {
		t.Fatalf("expected ordered member, historical, and contributor query blocks")
	}

	blocks := []struct {
		name     string
		content  string
		required string
	}{
		{
			name:     "members",
			content:  content[memberStart:historicalStart],
			required: "when m.id is not null and m.profile_visibility = 'public' then m.public_slug",
		},
		{
			name:     "historical",
			content:  content[historicalStart:contributorStart],
			required: "when m.profile_visibility = 'public' then m.public_slug",
		},
		{
			name:     "contributors",
			content:  content[contributorStart:],
			required: "case when m.profile_visibility = 'public' then m.public_slug else null end as member_slug",
		},
	}

	for _, block := range blocks {
		compact := strings.Join(strings.Fields(block.content), " ")
		if !strings.Contains(compact, block.required) {
			t.Errorf("expected %s projection to contain %q", block.name, block.required)
		}
	}
	if got := strings.Count(content, "m.public_slug"); got != 3 {
		t.Errorf("expected exactly three stored public-slug selections, got %d", got)
	}
	for _, forbidden := range []string{"memberslugexpr", "regexp_replace", "coalesce(m.public_slug"} {
		if strings.Contains(content, forbidden) {
			t.Errorf("expected domain projections not to contain derived/fallback slug fragment %q", forbidden)
		}
	}
}
