package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPublicContributionMemberSlugProjectionUsesStoredIdentity(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	start := strings.Index(content, "func (r *AnimeContributionsRepository) GetPublicAnimeContributions")
	end := len(content)
	if start < 0 || end < 0 || end <= start {
		t.Fatal("outbound contribution projection section not found")
	}

	outbound := strings.ToLower(content[start:end])
	const storedSlugProjection = "case when m.profile_visibility = 'public' then m.public_slug else null end"
	if count := strings.Count(outbound, storedSlugProjection); count != 2 {
		t.Fatalf("outbound contribution projections contain %d stored public_slug selections, want 2", count)
	}
	if strings.Contains(outbound, "fmt.sprintf(memberslugexpr") {
		t.Fatal("outbound contribution projections still use memberSlugExpr")
	}
	if strings.Contains(outbound, "regexp_replace") {
		t.Fatal("outbound contribution projections still derive member slugs from nickname")
	}
	if strings.Contains(outbound, "coalesce(m.public_slug") {
		t.Fatal("outbound contribution projections must not fall back from public_slug")
	}
	if count := strings.Count(outbound, "m.profile_visibility, m.public_slug"); count != 1 {
		t.Fatalf("outbound contribution projections contain %d visibility/slug grouping clauses, want 1", count)
	}
}

func TestMemberSlugInvariant(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve repository test path")
	}
	entries, err := os.ReadDir(filepath.Dir(file))
	if err != nil {
		t.Fatalf("read repository directory: %v", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		content := readRepositorySource(t, entry.Name())
		for _, forbidden := range []string{"memberSlugExpr", "deriveMemberSlug(", "normalizeMemberProfileSlug("} {
			if strings.Contains(content, forbidden) {
				t.Fatalf("%s contains forbidden legacy slug helper %q", entry.Name(), forbidden)
			}
		}
	}
}
