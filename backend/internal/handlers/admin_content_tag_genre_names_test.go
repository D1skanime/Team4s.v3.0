package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// openAdminTagGenreNamesFixture opens a real, schema-isolated Postgres fixture
// (never DATABASE_URL) and creates the minimal schema the new admin tag/genre
// German-name endpoints need: languages (seeded with 'de'), tags/tag_names,
// genres/genre_names, and the anime_tags/anime_genres junction tables used for
// the usage-count column. Mirrors the anime_public_read_integration_test.go
// pattern of building the schema directly via fixture.Exec, since
// createPhase106Prerequisites only provides unrelated FK prerequisites
// (members/app_users/fansub_groups/release_versions).
func openAdminTagGenreNamesFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	fixture := testsupport.OpenPhase106Postgres(t)

	_, err := fixture.Exec(context.Background(), `
CREATE TABLE languages (id BIGINT PRIMARY KEY, code TEXT NOT NULL);
INSERT INTO languages (id, code) VALUES (1, 'de');

CREATE TABLE tags (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE tag_names (
	id BIGSERIAL PRIMARY KEY,
	tag_id BIGINT NOT NULL,
	language_id BIGINT NOT NULL,
	name TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_tag_name_language UNIQUE (tag_id, language_id)
);
CREATE TABLE anime_tags (anime_id BIGINT NOT NULL, tag_id BIGINT NOT NULL);

CREATE TABLE genres (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE genre_names (
	id BIGSERIAL PRIMARY KEY,
	genre_id BIGINT NOT NULL,
	language_id BIGINT NOT NULL,
	name TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_genre_name_language UNIQUE (genre_id, language_id)
);
CREATE TABLE anime_genres (anime_id BIGINT NOT NULL, genre_id BIGINT NOT NULL);

INSERT INTO tags (id, name) VALUES (1, 'Amnesia'), (2, 'Real Robot');
INSERT INTO anime_tags (anime_id, tag_id) VALUES (100, 1), (101, 1), (100, 2);

INSERT INTO genres (id, name) VALUES (1, 'Action'), (2, 'Comedy');
INSERT INTO anime_genres (anime_id, genre_id) VALUES (100, 1), (101, 1);
`)
	if err != nil {
		t.Fatalf("create admin tag/genre names fixture schema: %v", err)
	}

	return fixture
}

func newAdminTagGenreNamesTestHandler(pool *pgxpool.Pool) *AdminContentHandler {
	return &AdminContentHandler{
		repo:      repository.NewAdminContentRepository(pool),
		authzRepo: adminRoleCheckerStub{isAdmin: true},
	}
}

func performAdminTagGenreNamesRequest(handler *AdminContentHandler, method string, path string, body string, params gin.Params, admin bool, fn func(c *gin.Context)) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	var reader *bytes.Reader
	if body == "" {
		reader = bytes.NewReader(nil)
	} else {
		reader = bytes.NewReader([]byte(body))
	}
	c.Request = httptest.NewRequest(method, path, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = params
	if admin {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Admin"})
	}
	fn(c)
	return recorder
}

// TestAdminTagGenreNames_ListTagNames_RequiresAdmin proves GET /admin/tags/names
// 401/403s without an admin identity — the requireAdmin gate fires before any
// repository call.
func TestAdminTagGenreNames_ListTagNames_RequiresAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := &AdminContentHandler{
		repo:      repository.NewAdminContentRepository(pool),
		authzRepo: adminRoleCheckerStub{isAdmin: false},
	}

	recorder := performAdminTagGenreNamesRequest(handler, http.MethodGet, "/api/v1/admin/tags/names", "", nil, true, handler.ListTagNames)

	if recorder.Code != http.StatusForbidden && recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401/403 for non-admin, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

// TestAdminTagGenreNames_ListTagNames_ReturnsSeededRows proves GET
// /admin/tags/names returns id/name/count/name_de for an admin identity.
func TestAdminTagGenreNames_ListTagNames_ReturnsSeededRows(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := newAdminTagGenreNamesTestHandler(pool)

	recorder := performAdminTagGenreNamesRequest(handler, http.MethodGet, "/api/v1/admin/tags/names", "", nil, true, handler.ListTagNames)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data []struct {
			ID     int64   `json:"id"`
			Name   string  `json:"name"`
			Count  int64   `json:"count"`
			NameDE *string `json:"name_de"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 2 {
		t.Fatalf("expected 2 tag rows, got %d: %+v", len(payload.Data), payload.Data)
	}

	byName := map[string]struct {
		ID     int64
		Count  int64
		NameDE *string
	}{}
	for _, row := range payload.Data {
		byName[row.Name] = struct {
			ID     int64
			Count  int64
			NameDE *string
		}{ID: row.ID, Count: row.Count, NameDE: row.NameDE}
	}

	amnesia, ok := byName["Amnesia"]
	if !ok {
		t.Fatalf("expected Amnesia row, got %+v", payload.Data)
	}
	if amnesia.Count != 2 {
		t.Fatalf("expected Amnesia count 2, got %d", amnesia.Count)
	}
	if amnesia.NameDE != nil {
		t.Fatalf("expected Amnesia name_de nil (untranslated), got %v", *amnesia.NameDE)
	}
}

// TestAdminTagGenreNames_UpsertTagName_ThreeCaseFallback proves the three
// direct-evidence cases mandated by Auftraggeber-Mandat Punkt 2 for tags:
// (a) setting a real German name, (b) clearing with an empty string, and
// (c) clearing with a whitespace-only string — all three via real handler
// execution and a follow-up GET that reflects the change.
func TestAdminTagGenreNames_UpsertTagName_ThreeCaseFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := newAdminTagGenreNamesTestHandler(pool)

	getNameDE := func(t *testing.T, tagID int64) *string {
		t.Helper()
		recorder := performAdminTagGenreNamesRequest(handler, http.MethodGet, "/api/v1/admin/tags/names", "", nil, true, handler.ListTagNames)
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200 on GET, got %d: %s", recorder.Code, recorder.Body.String())
		}
		var payload struct {
			Data []struct {
				ID     int64   `json:"id"`
				NameDE *string `json:"name_de"`
			} `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		for _, row := range payload.Data {
			if row.ID == tagID {
				return row.NameDE
			}
		}
		t.Fatalf("tag id %d not found in GET response", tagID)
		return nil
	}

	patch := func(t *testing.T, tagID int64, name string) *httptest.ResponseRecorder {
		t.Helper()
		body, err := json.Marshal(map[string]string{"name": name})
		if err != nil {
			t.Fatalf("marshal patch body: %v", err)
		}
		return performAdminTagGenreNamesRequest(
			handler,
			http.MethodPatch,
			"/api/v1/admin/tags/1/names/de",
			string(body),
			gin.Params{{Key: "id", Value: strconv.FormatInt(tagID, 10)}},
			true,
			handler.UpsertTagName,
		)
	}

	// Case (a): setting a real name.
	recorder := patch(t, 1, "Amnesie")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (a) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got == nil || *got != "Amnesie" {
		t.Fatalf("case (a) expected name_de 'Amnesie' after set, got %v", got)
	}

	// Case (b): clearing with an empty string.
	recorder = patch(t, 1, "")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (b) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got != nil {
		t.Fatalf("case (b) expected name_de nil after empty-string clear, got %v", *got)
	}

	// Re-set so case (c) proves clearing works from a non-nil starting state too.
	recorder = patch(t, 1, "Amnesie")
	if recorder.Code != http.StatusOK {
		t.Fatalf("re-set before case (c) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got == nil || *got != "Amnesie" {
		t.Fatalf("re-set before case (c) expected name_de 'Amnesie', got %v", got)
	}

	// Case (c): clearing with a whitespace-only string.
	recorder = patch(t, 1, "   ")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (c) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got != nil {
		t.Fatalf("case (c) expected name_de nil after whitespace-only clear, got %v", *got)
	}
}

// TestAdminTagGenreNames_UpsertTagName_TooLongNameRejected proves a >100-rune
// name 400s instead of being persisted.
func TestAdminTagGenreNames_UpsertTagName_TooLongNameRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := newAdminTagGenreNamesTestHandler(pool)

	tooLong := strings.Repeat("a", 101)
	body, err := json.Marshal(map[string]string{"name": tooLong})
	if err != nil {
		t.Fatalf("marshal patch body: %v", err)
	}

	recorder := performAdminTagGenreNamesRequest(
		handler,
		http.MethodPatch,
		"/api/v1/admin/tags/1/names/de",
		string(body),
		gin.Params{{Key: "id", Value: "1"}},
		true,
		handler.UpsertTagName,
	)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for too-long name, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

// TestAdminTagGenreNames_UpsertGenreName_ThreeCaseFallback mirrors the tag
// three-case fallback proof for genres (Auftraggeber-Mandat Punkt 2, genre
// half of D-07's "dasselbe Mehrsprachen-Modell und dieselbe Pflege wie Tags").
func TestAdminTagGenreNames_UpsertGenreName_ThreeCaseFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := newAdminTagGenreNamesTestHandler(pool)

	getNameDE := func(t *testing.T, genreID int64) *string {
		t.Helper()
		recorder := performAdminTagGenreNamesRequest(handler, http.MethodGet, "/api/v1/admin/genres/names", "", nil, true, handler.ListGenreNames)
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200 on GET, got %d: %s", recorder.Code, recorder.Body.String())
		}
		var payload struct {
			Data []struct {
				ID     int64   `json:"id"`
				NameDE *string `json:"name_de"`
			} `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		for _, row := range payload.Data {
			if row.ID == genreID {
				return row.NameDE
			}
		}
		t.Fatalf("genre id %d not found in GET response", genreID)
		return nil
	}

	patch := func(t *testing.T, genreID int64, name string) *httptest.ResponseRecorder {
		t.Helper()
		body, err := json.Marshal(map[string]string{"name": name})
		if err != nil {
			t.Fatalf("marshal patch body: %v", err)
		}
		return performAdminTagGenreNamesRequest(
			handler,
			http.MethodPatch,
			"/api/v1/admin/genres/1/names/de",
			string(body),
			gin.Params{{Key: "id", Value: strconv.FormatInt(genreID, 10)}},
			true,
			handler.UpsertGenreName,
		)
	}

	// Case (a): setting a real name.
	recorder := patch(t, 1, "Aktion")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (a) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got == nil || *got != "Aktion" {
		t.Fatalf("case (a) expected name_de 'Aktion' after set, got %v", got)
	}

	// Case (b): clearing with an empty string.
	recorder = patch(t, 1, "")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (b) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got != nil {
		t.Fatalf("case (b) expected name_de nil after empty-string clear, got %v", *got)
	}

	// Re-set so case (c) proves clearing works from a non-nil starting state too.
	recorder = patch(t, 1, "Aktion")
	if recorder.Code != http.StatusOK {
		t.Fatalf("re-set before case (c) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got == nil || *got != "Aktion" {
		t.Fatalf("re-set before case (c) expected name_de 'Aktion', got %v", got)
	}

	// Case (c): clearing with a whitespace-only string.
	recorder = patch(t, 1, "   ")
	if recorder.Code != http.StatusOK {
		t.Fatalf("case (c) expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := getNameDE(t, 1); got != nil {
		t.Fatalf("case (c) expected name_de nil after whitespace-only clear, got %v", *got)
	}
}

// TestAdminTagGenreNames_ListGenreNames_ReturnsSeededRows mirrors the tag list
// assertion for genres.
func TestAdminTagGenreNames_ListGenreNames_ReturnsSeededRows(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openAdminTagGenreNamesFixture(t)
	handler := newAdminTagGenreNamesTestHandler(pool)

	recorder := performAdminTagGenreNamesRequest(handler, http.MethodGet, "/api/v1/admin/genres/names", "", nil, true, handler.ListGenreNames)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data []struct {
			ID     int64   `json:"id"`
			Name   string  `json:"name"`
			Count  int64   `json:"count"`
			NameDE *string `json:"name_de"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 2 {
		t.Fatalf("expected 2 genre rows, got %d: %+v", len(payload.Data), payload.Data)
	}

	for _, row := range payload.Data {
		if row.Name == "Action" && row.Count != 2 {
			t.Fatalf("expected Action count 2, got %d", row.Count)
		}
		if row.Name == "Comedy" && row.Count != 0 {
			t.Fatalf("expected Comedy count 0, got %d", row.Count)
		}
	}
}
