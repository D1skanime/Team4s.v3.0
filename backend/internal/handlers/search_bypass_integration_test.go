package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// openSearchBypassFixture builds an isolated-schema Postgres fixture proving the
// D-08 q-required bypass (Task 1), the D-10 multi-language tag/genre match, and
// the Pitfall 1 fansub-empty-WHERE fix (Task 2) end-to-end against real generated
// SQL and a real database — not just the pure builder-string assertions in
// search_repository_test.go.
func openSearchBypassFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	ctx := context.Background()

	// pg_trgm backs the SET LOCAL pg_trgm.similarity_threshold Search() always
	// issues, regardless of whether q is present. f_unaccent mirrors migration
	// 0152 verbatim (schema-qualified so it resolves under the isolated schema's
	// restricted search_path, which deliberately excludes public).
	if _, err := pool.Exec(ctx, `
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

CREATE OR REPLACE FUNCTION f_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
AS $$
    SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

CREATE TABLE languages (id BIGINT PRIMARY KEY, code TEXT);
CREATE TABLE title_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime (
	id BIGINT PRIMARY KEY, slug TEXT, title TEXT NOT NULL,
	type TEXT NOT NULL DEFAULT 'tv', status TEXT NOT NULL DEFAULT 'ongoing',
	year SMALLINT, cover_image TEXT, view_count INT NOT NULL DEFAULT 0
);
CREATE TABLE anime_titles (anime_id BIGINT, language_id BIGINT, title_type_id BIGINT, title TEXT);
CREATE TABLE genres (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE genre_names (id BIGINT PRIMARY KEY, genre_id BIGINT, language_id BIGINT, name TEXT);
CREATE TABLE anime_genres (anime_id BIGINT, genre_id BIGINT);
CREATE TABLE tags (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE tag_names (id BIGINT PRIMARY KEY, tag_id BIGINT, language_id BIGINT, name TEXT);
CREATE TABLE anime_tags (anime_id BIGINT, tag_id BIGINT);

-- fansub_groups already exists (testsupport.createPhase106Prerequisites, id-only)
-- — widen it with the columns searchFansub's SELECT list needs.
ALTER TABLE fansub_groups ADD COLUMN slug TEXT;
ALTER TABLE fansub_groups ADD COLUMN name TEXT;
ALTER TABLE fansub_groups ADD COLUMN status TEXT;
ALTER TABLE fansub_groups ADD COLUMN group_type TEXT;
ALTER TABLE fansub_groups ADD COLUMN founded_year SMALLINT;

CREATE TABLE fansub_group_aliases (fansub_group_id BIGINT, normalized_alias TEXT);

INSERT INTO languages (id, code) VALUES (1, 'ja'), (2, 'de');
INSERT INTO title_types (id, name) VALUES (1, 'main');

-- Seeded anime: the base tag name is deliberately different from the German
-- translation ("Demon" base / "Dämon" German-only) — proves D-10 matches via
-- tag_names, not merely a base-name coincidence.
INSERT INTO anime (id, slug, title, type, status, year) VALUES (1, 'demon-anime', 'Demon Anime', 'tv', 'ongoing', 2024);
INSERT INTO anime_titles (anime_id, language_id, title_type_id, title) VALUES (1, 1, 1, 'Demon Anime');
INSERT INTO tags (id, name) VALUES (1, 'Demon');
INSERT INTO tag_names (id, tag_id, language_id, name) VALUES (1, 1, 2, 'Dämon');
INSERT INTO anime_tags (anime_id, tag_id) VALUES (1, 1);

-- Seeded fansub group: exists in the DB but MUST NOT appear in a tag/genre-only
-- (no q) search response — the Pitfall 1 regression guard.
INSERT INTO fansub_groups (id, slug, name, status, group_type, founded_year) VALUES (1, 'test-gruppe', 'Test Gruppe', 'active', 'fansub', 2020);
`); err != nil {
		t.Fatal(err)
	}

	return pool
}

func searchBypassRouter(pool *pgxpool.Pool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewSearchHandler(repository.NewSearchRepository(pool))
	router.GET("/api/v1/search", handler.Search)
	return router
}

type searchBypassEnvelope struct {
	Data struct {
		Anime struct {
			Items []map[string]any `json:"items"`
			Total int64            `json:"total"`
		} `json:"anime"`
		Fansub struct {
			Items []map[string]any `json:"items"`
			Total int64            `json:"total"`
		} `json:"fansub"`
	} `json:"data"`
}

// TestSearchBypassTagOnlyFindsGermanTagTranslation proves D-08 (no q required
// when tag is set) AND D-10 (tag filter matches ANY language name, not just the
// base name) end-to-end via a real Postgres query.
func TestSearchBypassTagOnlyFindsGermanTagTranslation(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search?type=anime&tag=D%C3%A4mon", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}

	var body searchBypassEnvelope
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.Anime.Total != 1 || len(body.Data.Anime.Items) != 1 {
		t.Fatalf("expected exactly one anime matched via the German tag_names translation, got: %#v", body.Data.Anime)
	}
}

// TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty is Auftraggeber-Mandat Punkt 3,
// item 1: type=alle with tag set and NO q must return an EMPTY fansub side
// (total==0, items==[]), not the full unfiltered fansub_groups list — even
// though a real fansub group exists in the fixture (Pitfall 1 regression guard,
// proven end-to-end, not just at the pure dispatch level).
func TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search?type=alle&tag=D%C3%A4mon", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}

	var body searchBypassEnvelope
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.Fansub.Total != 0 {
		t.Fatalf("type=alle tag-only (no q): fansub.total = %d, want 0 (must not leak the full fansub_groups list)", body.Data.Fansub.Total)
	}
	if len(body.Data.Fansub.Items) != 0 {
		t.Fatalf("type=alle tag-only (no q): fansub.items = %#v, want empty (the seeded 'Test Gruppe' row must NOT appear)", body.Data.Fansub.Items)
	}
	if body.Data.Anime.Total != 1 {
		t.Fatalf("type=alle tag-only (no q): anime side must still match, got total=%d", body.Data.Anime.Total)
	}
}

// TestSearchBypassTagOnlyTypeFansubStaysEmpty is Auftraggeber-Mandat Punkt 3,
// item 2: type=fansub with tag set and NO q must ALSO return empty. tag/genre
// are anime-only concepts and technically irrelevant to a fansub-only search,
// but the absence of q must never silently unlock an unfiltered fansub browse
// through this type parameter either.
func TestSearchBypassTagOnlyTypeFansubStaysEmpty(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search?type=fansub&tag=D%C3%A4mon", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}

	var body searchBypassEnvelope
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.Fansub.Total != 0 {
		t.Fatalf("type=fansub tag-only (no q): fansub.total = %d, want 0 (must not leak the full fansub_groups list)", body.Data.Fansub.Total)
	}
	if len(body.Data.Fansub.Items) != 0 {
		t.Fatalf("type=fansub tag-only (no q): fansub.items = %#v, want empty (the seeded 'Test Gruppe' row must NOT appear)", body.Data.Fansub.Items)
	}
}

// TestSearchBypassRejectsMissingQueryNoFilters is a regression guard: the D-08
// bypass must never widen to "no q at all is fine".
func TestSearchBypassRejectsMissingQueryNoFilters(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search", nil))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for /api/v1/search with no params at all: %s", response.Code, response.Body.String())
	}
}

// TestSearchBypassRejectsPresentButShortQueryWithTag proves the narrow D-08
// reading end-to-end: a PRESENT but too-short q still 400s even with tag set.
func TestSearchBypassRejectsPresentButShortQueryWithTag(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search?tag=Amnesia&q=a", nil))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for present-but-too-short q even with tag set: %s", response.Code, response.Body.String())
	}
}

// TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd is
// Auftraggeber-Mandat Punkt 3, item 3, proven through the REAL repository-backed
// handler (not just the nil-repo unit test in search_test.go): a non-tag/genre
// filter alone must never unlock the q-required bypass either.
func TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd(t *testing.T) {
	pool := openSearchBypassFixture(t)
	router := searchBypassRouter(pool)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/search?type=alle&format=tv", nil))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for format-only (no q, no tag/genre), even against a real repository: %s", response.Code, response.Body.String())
	}
}
