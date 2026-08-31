package repository

import (
	"os"
	"strings"
	"testing"
)

func TestMemberProjectDetailRepositorySourceInvariants(t *testing.T) {
	content, err := os.ReadFile("anime_contributions_member_project_repository.go")
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	src := strings.ToLower(string(content))

	required := []string{
		"offset 1",
		"count(ordered_role.role_code) > 0 as has_own_contribution",
		"from release_version_notes rvn",
		"from release_version_media rvm",
		"rvm.uploaded_by_user_id = $2",
		"coalesce(ac.member_id, hfgm.member_id) = $1",
		"ac.status = 'confirmed'",
		"ac.release_version_id is null",
		"(ac.release_version_id = rv.id or ac.release_version_id is null)",
	}
	for _, fragment := range required {
		if !strings.Contains(src, fragment) {
			t.Fatalf("expected source to contain %q", fragment)
		}
	}
}

func TestMemberProjectRoleArraysShareCatalogOrder(t *testing.T) {
	content, err := os.ReadFile("anime_contributions_member_project_repository.go")
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	src := strings.ToLower(string(content))

	pairedAggregation := "array_agg(ordered_role.role_code order by ordered_role.sort_order, ordered_role.role_code)"
	pairedLabels := "array_agg(ordered_role.role_label order by ordered_role.sort_order, ordered_role.role_code)"
	for _, fragment := range []string{pairedAggregation, pairedLabels} {
		if !strings.Contains(src, fragment) {
			t.Fatalf("expected project role arrays to share catalog ordering %q", fragment)
		}
	}

	if strings.Contains(src, "order by own_roles.role_label") || strings.Contains(src, "order by coalesce(rd.label_de, acr.role_code)") {
		t.Fatal("project role labels must not be sorted independently from role codes")
	}
}
