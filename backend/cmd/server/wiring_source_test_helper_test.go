package main

import (
	"os"
	"strings"
	"testing"
)

// readServerWiringSource concatenates every non-test .go source file in this package
// directory. Phase 191-26 split main.go's single-file wiring across multiple files
// (wiring_infra.go, wiring_catalog.go, wiring_fansub_contributions.go,
// routes_public.go, admin_routes.go, bootstrap_helpers.go); tests that previously
// grepped main.go's (or main.go+admin_routes.go's) raw source for a wiring fragment
// must now search the full wiring surface, since a fragment can live in any of these
// files depending on which domain it belongs to.
func readServerWiringSource(t *testing.T) string {
	t.Helper()

	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read cmd/server directory failed: %v", err)
	}

	var sb strings.Builder
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		content, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read source file %s failed: %v", name, err)
		}
		sb.Write(content)
		sb.WriteByte('\n')
	}
	return sb.String()
}
