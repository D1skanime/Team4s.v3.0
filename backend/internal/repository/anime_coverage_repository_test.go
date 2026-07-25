package repository

import (
	"os"
	"strings"
	"testing"
)

func TestAnimeCoverageCountsOnlyConfirmedProjectCrew(t *testing.T) {
	contentBytes, err := os.ReadFile("anime_coverage_repository.go")
	if err != nil {
		t.Fatalf("read anime coverage repository: %v", err)
	}
	content := strings.ToLower(string(contentBytes))

	requiredFragments := []string{
		"and ac.release_version_id is null",
		"and ac.status = 'confirmed'",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected project coverage fragment %q", fragment)
		}
	}
}
