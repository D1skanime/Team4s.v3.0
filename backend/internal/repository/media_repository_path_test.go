package repository

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMediaRepositoryResolveReadableStoragePathUsesConfiguredStorageDirForDockerPath(t *testing.T) {
	dir := t.TempDir()
	filename := "banner_legacy.jpg"
	localPath := filepath.Join(dir, filename)
	if err := os.WriteFile(localPath, []byte("image"), 0o644); err != nil {
		t.Fatalf("testdatei konnte nicht geschrieben werden: %v", err)
	}

	repo := NewMediaRepository(nil, "", dir)

	got := repo.resolveReadableStoragePath("/app/media/" + filename)
	if got != localPath {
		t.Fatalf("expected %q, got %q", localPath, got)
	}
}

func TestMediaFilenameHandlesDockerAndWindowsPaths(t *testing.T) {
	cases := map[string]string{
		"/app/media/banner.jpg":                          "banner.jpg",
		`C:\Users\admin\Documents\Team4s\media\logo.png`: "logo.png",
	}
	for input, expected := range cases {
		if got := mediaFilename(input); got != expected {
			t.Fatalf("mediaFilename(%q) = %q, expected %q", input, got, expected)
		}
	}
}

func TestListFansubGroupMediaForReviewExcludesBrandingSlots(t *testing.T) {
	content, err := os.ReadFile("media_repository.go")
	if err != nil {
		t.Fatalf("media_repository.go konnte nicht gelesen werden: %v", err)
	}
	source := string(content)

	if !strings.Contains(source, "JOIN fansub_groups fg ON fg.id = fgm.group_id") {
		t.Fatal("Review-Query muss fansub_groups joinen, um Logo/Banner-Slots auszuschließen")
	}
	if !strings.Contains(source, "fg.logo_id IS NULL OR ma.id <> fg.logo_id") {
		t.Fatal("Review-Query muss das aktuelle Gruppenlogo aus Kontextmedien ausschließen")
	}
	if !strings.Contains(source, "fg.banner_id IS NULL OR ma.id <> fg.banner_id") {
		t.Fatal("Review-Query muss das aktuelle Gruppenbanner aus Kontextmedien ausschließen")
	}
}
