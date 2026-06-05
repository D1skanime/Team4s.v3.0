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

	memberBlockStart := strings.Index(normalized, "from fansub_group_members")
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
