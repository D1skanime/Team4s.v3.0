package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestEffectiveContributionsRepositoryReadsStoredConfirmedSnapshot(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "admin_content_fansub_releases_contributions_repository.go"))
	if err != nil {
		t.Fatal(err)
	}
	source := strings.ToLower(string(content))
	for _, fragment := range []string{
		"newreleasecrewsnapshotrepository",
		".loadcomplete(",
		"snapshotmode",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing stored-snapshot read path %q", fragment)
		}
	}
	for _, forbidden := range []string{"anime_default", "isoverride", "fallbackrows", "step=2"} {
		if strings.Contains(source, forbidden) {
			t.Fatalf("legacy fallback fragment remains: %q", forbidden)
		}
	}
}
