package repository

import (
	"os"
	"path/filepath"
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
