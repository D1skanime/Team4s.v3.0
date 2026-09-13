package repository_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// This tracer records SQL as well as counts: the public-read budget must never
// hide schema/metadata queries by excluding them from its measurement.
type animePublicReadTracer struct {
	mu      sync.Mutex
	queries []string
}

func (tracer *animePublicReadTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	tracer.mu.Lock()
	defer tracer.mu.Unlock()
	tracer.queries = append(tracer.queries, data.SQL)
	return ctx
}
func (*animePublicReadTracer) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}
func (tracer *animePublicReadTracer) reset() {
	tracer.mu.Lock()
	defer tracer.mu.Unlock()
	tracer.queries = nil
}
func (tracer *animePublicReadTracer) snapshot() []string {
	tracer.mu.Lock()
	defer tracer.mu.Unlock()
	return append([]string(nil), tracer.queries...)
}

func openAnimePublicReadFixture(t *testing.T) (*pgxpool.Pool, *animePublicReadTracer) {
	t.Helper()
	// Uses explicit TEAM4S_PHASE106_TEST_DSN, validated database name, a unique
	// search_path and scoped cleanup. Never reads application DATABASE_URL.
	fixture := testsupport.OpenPhase106Postgres(t)
	_, err := fixture.Exec(context.Background(), `
CREATE TABLE anime (
	id BIGINT PRIMARY KEY, slug TEXT, title TEXT NOT NULL, title_de TEXT, title_en TEXT,
	anime_type_id BIGINT, type TEXT NOT NULL DEFAULT 'tv',
	content_type TEXT NOT NULL DEFAULT 'anime', status TEXT NOT NULL DEFAULT 'ongoing',
	year SMALLINT, max_episodes SMALLINT, genre TEXT, description TEXT,
	cover_image TEXT, cover_resolved_url TEXT, banner_resolved_url TEXT, banner_asset_id BIGINT,
	source TEXT, folder_name TEXT, anisearch_id TEXT, view_count INT NOT NULL DEFAULT 0
);
CREATE TABLE episodes (
	id BIGINT PRIMARY KEY, anime_id BIGINT, episode_number TEXT, title TEXT,
	status TEXT, view_count INT, download_count INT, stream_links TEXT[], filename TEXT
);
CREATE TABLE anime_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE languages (id BIGINT PRIMARY KEY, code TEXT);
CREATE TABLE title_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_titles (anime_id BIGINT, language_id BIGINT, title_type_id BIGINT, title TEXT);
CREATE TABLE anime_genres (anime_id BIGINT, genre_id BIGINT);
CREATE TABLE genres (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_tags (anime_id BIGINT, tag_id BIGINT);
CREATE TABLE tags (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE media_external (id BIGINT PRIMARY KEY, media_id BIGINT, external_id TEXT, provider TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT);
CREATE TABLE anime_source_links (anime_id BIGINT, source TEXT);
CREATE TABLE relation_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_relations (source_anime_id BIGINT, target_anime_id BIGINT, relation_type_id BIGINT);
INSERT INTO anime (id, slug, title, status, year) VALUES
	(1, 'stored-route', 'A Different Display Title', 'ongoing', 2024),
	(2, 'empty-relations', 'Without Relations', 'done', 2023),
	(3, 'disabled-route', 'Disabled Anime', 'disabled', 2022),
	(4, 'related-route', 'Related Anime', 'licensed', 2020);
INSERT INTO languages VALUES (1, 'ja');
INSERT INTO title_types VALUES (1, 'main');
INSERT INTO anime_titles SELECT id, 1, 1, title FROM anime;
INSERT INTO episodes VALUES (11, 1, '1', 'First Episode', 'done', 7, 2, ARRAY['https://example.com/episode'], 'episode.mkv');
INSERT INTO relation_types VALUES (1, 'sequel');
INSERT INTO anime_relations VALUES (1, 4, 1), (4, 1, 1), (1, 3, 1);
`)
	if err != nil {
		t.Fatal(err)
	}

	tracer := &animePublicReadTracer{}
	config := fixture.Config()
	config.ConnConfig.Tracer = tracer
	config.MaxConns = 1
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	// Establish search_path before starting the per-request measurement.
	if err := pool.Ping(context.Background()); err != nil {
		t.Fatal(err)
	}
	tracer.reset()
	return pool, tracer
}

func animePublicReadRouter(pool *pgxpool.Pool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := handlers.NewAnimeHandler(repository.NewAnimeRepository(pool), nil, handlers.AnimeMediaConfig{})
	router.GET("/api/v1/anime/:id/relations", handler.GetAnimeRelations)
	return router
}

func TestAnimePublicReadRelationsStatusAndSQLBudget(t *testing.T) {
	pool, tracer := openAnimePublicReadFixture(t)
	router := animePublicReadRouter(pool)
	for _, tc := range []struct {
		name, id                      string
		status, statements, relations int
		message                       string
	}{
		{"visible with relations", "1", 200, 2, 1, ""},
		{"visible without relations", "2", 200, 2, 0, ""},
		{"licensed remains visible", "4", 200, 2, 1, ""},
		{"unknown", "99", 404, 1, 0, "anime nicht gefunden"},
		{"disabled", "3", 404, 1, 0, "anime nicht gefunden"},
		{"invalid", "1abc", 400, 0, 0, "ungültige anime-id"},
		{"decimal", "1.5", 400, 0, 0, "ungültige anime-id"},
		{"zero", "0", 400, 0, 0, "ungültige anime-id"},
		{"negative", "-1", 400, 0, 0, "ungültige anime-id"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			tracer.reset()
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/anime/"+tc.id+"/relations", nil))
			if response.Code != tc.status {
				t.Fatalf("status = %d, want %d: %s", response.Code, tc.status, response.Body.String())
			}
			queries := tracer.snapshot()
			t.Logf("HTTP %d; SQL statements = %d", response.Code, len(queries))
			if len(queries) != tc.statements {
				t.Errorf("statements = %d, want %d; SQL: %v", len(queries), tc.statements, queries)
			}
			if tc.message != "" {
				var body struct {
					Error struct {
						Message string `json:"message"`
					} `json:"error"`
				}
				if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if body.Error.Message != tc.message {
					t.Errorf("error = %q, want %q", body.Error.Message, tc.message)
				}
				return
			}
			var body struct {
				Data []repository.AnimeRelation `json:"data"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if body.Data == nil || len(body.Data) != tc.relations {
				t.Fatalf("relations = %#v, want non-null array of length %d", body.Data, tc.relations)
			}
			if tc.id == "1" && (body.Data[0].AnimeID != 4 || body.Data[0].Title != "Related Anime" || body.Data[0].RelationType != "sequel") {
				t.Errorf("relation payload changed: %#v", body.Data)
			}
			for _, sql := range queries {
				if strings.Contains(sql, "information_schema") || strings.Contains(sql, "episodes") || strings.Contains(sql, "anime_titles") {
					t.Errorf("relations loaded unrelated schema/detail data: %s", sql)
				}
			}
		})
	}
}

func TestAnimePublicReadRelationsDatabaseErrors(t *testing.T) {
	for _, tc := range []struct {
		name, ddl, message string
		statements         int
	}{
		{"existence failure", "ALTER TABLE anime RENAME COLUMN status TO unavailable_status", "interner fehler", 1},
		{"relations failure", "ALTER TABLE anime_relations RENAME TO unavailable_relations", "relationen konnten nicht geladen werden", 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			pool, tracer := openAnimePublicReadFixture(t)
			if _, err := pool.Exec(context.Background(), tc.ddl); err != nil {
				t.Fatal(err)
			}
			tracer.reset()
			response := httptest.NewRecorder()
			animePublicReadRouter(pool).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/anime/1/relations", nil))
			if response.Code != 500 {
				t.Fatalf("status = %d, want 500: %s", response.Code, response.Body.String())
			}
			var body struct {
				Error struct {
					Message string `json:"message"`
				} `json:"error"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if body.Error.Message != tc.message {
				t.Errorf("message = %q, want %q", body.Error.Message, tc.message)
			}
			queries := tracer.snapshot()
			t.Logf("HTTP 500; SQL statements = %d", len(queries))
			if len(queries) != tc.statements {
				t.Errorf("statements = %d, want %d; SQL: %v", len(queries), tc.statements, queries)
			}
		})
	}
}

func TestAnimePublicReadDetailStoredSlugAndSQLBudget(t *testing.T) {
	for _, tc := range []struct {
		name       string
		storedSlug any
		wantSlug   string
		legacy     bool
	}{
		{"stored slug differs from display title", "authoritative-route", "authoritative-route", false},
		{"trim stored slug", "  saved-route  ", "saved-route", false},
		{"empty slug", "", "", false},
		{"blank slug", "   ", "", false},
		{"null slug", nil, "", false},
		{"legacy schema has no slug", nil, "", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			pool, tracer := openAnimePublicReadFixture(t)
			if tc.legacy {
				if _, err := pool.Exec(context.Background(), "ALTER TABLE anime DROP COLUMN slug"); err != nil {
					t.Fatal(err)
				}
			} else if _, err := pool.Exec(context.Background(), "UPDATE anime SET slug = $1 WHERE id = 1", tc.storedSlug); err != nil {
				t.Fatal(err)
			}
			tracer.reset()
			detail, err := repository.NewAnimeRepository(pool).GetByID(context.Background(), 1, false)
			if err != nil {
				t.Fatal(err)
			}
			queries := tracer.snapshot()
			t.Logf("detail SQL statements = %d (one schema read + six data statements)", len(queries))
			if len(queries) != 7 {
				t.Errorf("detail statements = %d, want unchanged 7; SQL: %v", len(queries), queries)
			}
			if detail.ID != 1 || detail.Title != "A Different Display Title" || detail.Status != "ongoing" || detail.Type != "tv" || detail.Year == nil || *detail.Year != 2024 {
				t.Errorf("existing detail fields changed: %#v", detail)
			}
			if len(detail.Episodes) != 1 || detail.Episodes[0].ID != 11 || detail.Episodes[0].Title == nil || *detail.Episodes[0].Title != "First Episode" || detail.Episodes[0].ViewCount != 7 {
				t.Errorf("existing episodes changed: %#v", detail.Episodes)
			}
			serialized, err := json.Marshal(detail)
			if err != nil {
				t.Fatal(err)
			}
			var payload map[string]any
			if err := json.Unmarshal(serialized, &payload); err != nil {
				t.Fatal(err)
			}
			if tc.wantSlug == "" {
				if slug, exists := payload["slug"]; exists {
					t.Errorf("unavailable slug must be omitted, got %#v", slug)
				}
			} else if payload["slug"] != tc.wantSlug {
				t.Errorf("slug = %#v, want stored %q", payload["slug"], tc.wantSlug)
			}
		})
	}
}
