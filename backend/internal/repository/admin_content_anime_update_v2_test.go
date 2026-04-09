package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestUpdateAnimeV2SourcePatchIncludesSourceAndFolderNameAssignments(t *testing.T) {
	t.Parallel()

	content := readUpdateV2Source(t)
	normalized := strings.ToLower(content)

	required := []string{
		`"source = $%d"`,
		`"folder_name = $%d"`,
		"if input.source.set",
		"if input.foldername.set",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected update v2 source persistence fragment %q, got %s", fragment, content)
		}
	}
}

func readUpdateV2Source(t *testing.T) string {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}

	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "admin_content_anime_update_v2.go"))
	if err != nil {
		t.Fatalf("read update v2 source: %v", err)
	}

	return string(content)
}
