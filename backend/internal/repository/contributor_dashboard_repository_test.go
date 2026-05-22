package repository

import (
	"os"
	"strings"
	"testing"
)

func TestContributorDashboardRepositoryUsesCanonicalReleaseVersionGroupColumn(t *testing.T) {
	source, err := os.ReadFile("contributor_dashboard_repository.go")
	if err != nil {
		t.Fatalf("read contributor dashboard repository: %v", err)
	}

	text := strings.ToLower(string(source))
	if strings.Contains(text, "fansubgroup_id") {
		t.Fatalf("contributor dashboard must not use legacy release_version_groups.fansubgroup_id")
	}
	if !strings.Contains(text, "rvg.fansub_group_id = $1") {
		t.Fatalf("expected contributor dashboard release reads to scope through release_version_groups.fansub_group_id")
	}
}

func TestContributorDashboardRepositoryKeepsHistoricalCreditsReadOnly(t *testing.T) {
	source, err := os.ReadFile("contributor_dashboard_repository.go")
	if err != nil {
		t.Fatalf("read contributor dashboard repository: %v", err)
	}

	text := strings.ToLower(string(source))
	if !strings.Contains(text, "join release_member_roles rmr") {
		t.Fatalf("expected historical contributions to read release_member_roles")
	}
	if !strings.Contains(text, "join release_version_groups rvg") {
		t.Fatalf("expected historical contributions to resolve group context through release_version_groups")
	}
	if strings.Contains(text, "release_member_roles") && strings.Contains(text, "permission") {
		t.Fatalf("historical release_member_roles must stay read-only and not drive permissions")
	}
}
