package handlers

import (
	"os"
	"strings"
	"testing"
)

func TestGetGroupReleaseImagesRequiresCanonicalCategory(t *testing.T) {
	raw, err := os.ReadFile("group_contributors_handler.go")
	if err != nil {
		t.Fatal(err)
	}
	content := strings.ToLower(string(raw))
	for _, fragment := range []string{"category := c.query(\"category\")", "repository.errvalidation", "ungültige bildkategorie", "repository.errnotfound"} {
		if !strings.Contains(content, fragment) {
			t.Fatalf("missing image cursor handler behavior %q", fragment)
		}
	}
}
