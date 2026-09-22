package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// TestCreateAnime_RealPostgresDuplicateAniSearchSourceReturns409NotInternalError is the missing
// full-HTTP-chain proof GAP-06/D-30 (165-18) closes: a real HTTP request, routed through the
// actual CreateAnime handler, wired to a real *repository.AdminContentRepository over real
// Postgres, must return 409 (not 500) when the request's anisearch: source is already taken by
// another anime -- the literal chain that produced GAP-06's live HTTP 500.
func TestCreateAnime_RealPostgresDuplicateAniSearchSourceReturns409NotInternalError(t *testing.T) {
	pool := testsupport.OpenPhase165Postgres(t)
	repo := repository.NewAdminContentRepository(pool)

	var seededAnimeID int64
	if err := pool.QueryRow(
		context.Background(),
		`INSERT INTO anime (title, source) VALUES ($1, $2) RETURNING id`,
		"Serial Experiments Lain",
		"anisearch:999",
	).Scan(&seededAnimeID); err != nil {
		t.Fatalf("seed existing anime: %v", err)
	}

	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: repo,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Serial Experiments Lain (Duplicate Attempt)","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp","source":"anisearch:999"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data models.AdminAnimeAniSearchEnrichmentRedirectResult `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.ExistingAnimeID != seededAnimeID {
		t.Fatalf("expected existing_anime_id=%d, got %d", seededAnimeID, payload.Data.ExistingAnimeID)
	}
	if payload.Data.ExistingTitle != "Serial Experiments Lain" {
		t.Fatalf("expected existing_title to be the seeded anime's title, got %q", payload.Data.ExistingTitle)
	}
}
