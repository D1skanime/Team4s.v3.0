package repository

import (
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

// --- Anime-Komposition ---

func TestSearchAnimeQueryVisibilityDefault(t *testing.T) {
	where, order, args := buildSearchAnimeQuery(models.SearchQuery{Q: "koe", Page: 1, PerPage: 20})

	if !strings.Contains(where, "f_unaccent(anime.title)") {
		t.Fatalf("expected f_unaccent title match, got: %s", where)
	}
	if !strings.Contains(where, "anime.search_tsv @@ plainto_tsquery") {
		t.Fatalf("expected tsvector match, got: %s", where)
	}
	if !strings.Contains(where, "status <> 'disabled'") {
		t.Fatalf("expected default disabled exclusion, got: %s", where)
	}
	if len(args) != 1 || args[0] != "koe" {
		t.Fatalf("expected q bound as $1, got args: %#v", args)
	}
	if !strings.Contains(order, "CASE") {
		t.Fatalf("expected ranking CASE, got: %s", order)
	}
}

func TestSearchAnimeQueryIncludeDisabledDropsFilter(t *testing.T) {
	where, _, _ := buildSearchAnimeQuery(models.SearchQuery{Q: "x", IncludeDisabled: true, Page: 1, PerPage: 20})
	if strings.Contains(where, "status <> 'disabled'") {
		t.Fatalf("admin identity must not filter disabled, got: %s", where)
	}
}

func TestSearchAnimeQueryExplicitStatusOverridesDefault(t *testing.T) {
	where, _, args := buildSearchAnimeQuery(models.SearchQuery{Q: "x", Status: strPtr("draft"), Page: 1, PerPage: 20})
	if strings.Contains(where, "status <> 'disabled'") {
		t.Fatalf("explicit status must override disabled default, got: %s", where)
	}
	if !strings.Contains(where, "anime.status = $") {
		t.Fatalf("expected explicit status bind, got: %s", where)
	}
	found := false
	for _, a := range args {
		if a == "draft" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected status value bound, got: %#v", args)
	}
}

func TestSearchAnimeRankingPopularityIsLastTieBreak(t *testing.T) {
	_, order, _ := buildSearchAnimeQuery(models.SearchQuery{Q: "koe", Page: 1, PerPage: 20})

	caseEnd := strings.Index(order, "END ASC")
	popularity := strings.Index(order, "view_count")
	if caseEnd < 0 || popularity < 0 {
		t.Fatalf("expected both CASE and view_count in order, got: %s", order)
	}
	// Popularität darf erst NACH den deterministischen CASE-Stufen greifen.
	if popularity < caseEnd {
		t.Fatalf("popularity must not precede deterministic CASE stages, got: %s", order)
	}
	// Exakter Haupttitel ist Stufe 0 — kein Popularitätssignal in der CASE-Stufe.
	stageZero := order[:caseEnd]
	if strings.Contains(stageZero, "view_count") {
		t.Fatalf("popularity must not appear inside ranking CASE, got: %s", stageZero)
	}
}

// --- Sicherheit: keine Interpolation ---

func TestSearchAnimeQueryBindsMaliciousInput(t *testing.T) {
	evil := "'; DROP TABLE anime; --"
	where, _, args := buildSearchAnimeQuery(models.SearchQuery{Q: evil, Page: 1, PerPage: 20})
	if strings.Contains(where, "DROP TABLE") {
		t.Fatalf("q must never be interpolated into SQL, got: %s", where)
	}
	if args[0] != evil {
		t.Fatalf("q must be passed as bind param verbatim, got: %#v", args)
	}
}

// --- Fansub-Komposition ---

func TestSearchFansubQueryComposition(t *testing.T) {
	where, order, args := buildSearchFansubQuery(models.SearchQuery{Q: "team-4s", Page: 1, PerPage: 20})

	if !strings.Contains(where, "normalized_alias = $") {
		t.Fatalf("expected exact normalized alias equality, got: %s", where)
	}
	if !strings.Contains(where, "regexp_replace(lower(f_unaccent(fansub_groups.name))") {
		t.Fatalf("expected normalized name mirror expression, got: %s", where)
	}
	if strings.Contains(where, "dissolved") {
		t.Fatalf("dissolved groups must not be filtered out (D-11), got: %s", where)
	}
	// qNorm muss als eigener Bind-Parameter vorliegen (nicht interpoliert).
	foundNorm := false
	for _, a := range args {
		if a == "team4s" {
			foundNorm = true
		}
	}
	if !foundNorm {
		t.Fatalf("expected normalized qNorm 'team4s' bound, got: %#v", args)
	}
	// Ranking-Stufe 0 (exaktes Kürzel) referenziert normalized_alias.
	stageZero := order[:strings.Index(order, "THEN 0")]
	if !strings.Contains(stageZero, "normalized_alias") {
		t.Fatalf("exact abbreviation must be ranking stage 0, got: %s", stageZero)
	}
}

func TestSearchFansubNoImplicitStatusFilter(t *testing.T) {
	where, _, _ := buildSearchFansubQuery(models.SearchQuery{Q: "x", Page: 1, PerPage: 20})
	if strings.Contains(where, "fansub_groups.status") {
		t.Fatalf("no implicit status filter expected (dissolved appears), got: %s", where)
	}
}

func TestSearchFansubExplicitStatusFilters(t *testing.T) {
	where, _, _ := buildSearchFansubQuery(models.SearchQuery{Q: "x", Status: strPtr("active"), Page: 1, PerPage: 20})
	if !strings.Contains(where, "fansub_groups.status = $") {
		t.Fatalf("explicit status must filter, got: %s", where)
	}
}

// --- D-04-Determinismus: normalizeAliasKey auf beiden Seiten identisch ---

func TestSearchNormalizeAliasKeyResolvesPunctuationVariants(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"team-4s", "team4s"},
		{"team 4s", "team4s"},
		{"Team4s", "team4s"},
		{"T4S", "t4s"},
		{"t4s", "t4s"},
		{"Naruto!", "naruto"},
	}
	for _, c := range cases {
		if got := normalizeAliasKey(c.in); got != c.want {
			t.Errorf("normalizeAliasKey(%q) = %q, want %q", c.in, got, c.want)
		}
	}
	// Determinismus-Kernaussage: alle drei Kürzel-Varianten kollabieren auf einen Schlüssel.
	if normalizeAliasKey("team-4s") != normalizeAliasKey("team 4s") {
		t.Fatalf("hyphen and space variants must normalize identically")
	}
	if normalizeAliasKey("team 4s") != normalizeAliasKey("Team4s") {
		t.Fatalf("space and plain variants must normalize identically")
	}
}
