package repository

import (
	"strings"
	"testing"
)

// Plan 167-02 (D-08/D-03): unit-level proof, no DB required, that the batch exact-match
// query binds candidates exclusively via unnest($1::text[]) (never string-concatenated)
// and mirrors the production functional-index expression byte-for-byte for both
// fansub_groups.name and fansub_groups.slug (Pitfall 3).
func TestBuildFansubGroupBatchMatchQuery(t *testing.T) {
	sql := buildFansubGroupBatchMatchQuery()

	if !strings.Contains(sql, "unnest($1::text[])") {
		t.Fatalf("expected batch match query to bind candidates via unnest($1::text[]), got:\n%s", sql)
	}
	if !strings.Contains(sql, "regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g')") {
		t.Fatalf("expected batch match query to mirror the production functional index expression for fansub_groups.name, got:\n%s", sql)
	}
	if !strings.Contains(sql, "regexp_replace(lower(f_unaccent(fansub_groups.slug)), '[^a-z0-9]+', '', 'g')") {
		t.Fatalf("expected batch match query to mirror the production functional index expression for fansub_groups.slug, got:\n%s", sql)
	}
	for _, forbidden := range []string{"+ candidate", "+ raw_group", "fmt.Sprintf"} {
		if strings.Contains(sql, forbidden) {
			t.Fatalf("batch match query must never string-concatenate candidate values into SQL text, found %q", forbidden)
		}
	}
}

// TestBuildFansubGroupSuggestionQuery proves the fuzzy "did you mean" suggestion query
// (D-03) is a separate, smaller query using trigram similarity, not folded into the
// exact-match path (RESEARCH.md Section 4.1).
func TestBuildFansubGroupSuggestionQuery(t *testing.T) {
	batchSQL := buildFansubGroupBatchMatchQuery()
	suggestionSQL := buildFansubGroupSuggestionQuery()

	if !strings.Contains(suggestionSQL, "f_unaccent(fansub_groups.name) % f_unaccent($1)") {
		t.Fatalf("expected suggestion query to use trigram similarity operator against f_unaccent(name), got:\n%s", suggestionSQL)
	}
	if !strings.Contains(suggestionSQL, "ORDER BY similarity(") || !strings.Contains(suggestionSQL, "DESC") || !strings.Contains(suggestionSQL, "LIMIT") {
		t.Fatalf("expected suggestion query to rank by similarity() DESC with a LIMIT clause, got:\n%s", suggestionSQL)
	}
	if suggestionSQL == batchSQL {
		t.Fatalf("suggestion query must be a textually separate query from the exact-match batch query")
	}
	if strings.Contains(suggestionSQL, "unnest($1::text[])") {
		t.Fatalf("suggestion query must not be folded into the batch exact-match query")
	}
}
