package services

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPointServicePhase106Boundary(t *testing.T) {
	files := []string{"point_service.go", filepath.Join("..", "repository", "point_rules_repository.go"), filepath.Join("..", "repository", "point_ledger_repository.go"), filepath.Join("..", "..", "..", "database", "migrations", "0131_member_point_foundation.up.sql"), filepath.Join("..", "..", "..", "database", "migrations", "0131_member_point_foundation.down.sql")}
	for _, file := range files {
		raw, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		source := strings.ToLower(string(raw))
		for _, forbidden := range []string{"net/http", "internal/handlers", "capability", "badge", "profile", "retention", "thumbnail", "upload", "crop", "sha256", "ranking", "getlatest", "latest rule"} {
			if strings.Contains(source, forbidden) {
				t.Errorf("%s contains forbidden Phase-106 coupling %q", file, forbidden)
			}
		}
	}
}
