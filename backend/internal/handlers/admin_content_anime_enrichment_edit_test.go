package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func TestLoadAnimeAniSearchEditEnrichment_ReturnsDraftSuccessContract(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/anime/7/enrichment/anisearch",
		strings.NewReader(`{"anisearch_id":"12345","draft":{"title":"Lookup Title","source":"anisearch:12345"},"protected_fields":["title"]}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.LoadAnimeAniSearchEnrichment(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data struct {
			Mode                   string            `json:"mode"`
			Source                 string            `json:"source"`
			SkippedProtectedFields []string          `json:"skipped_protected_fields"`
			Draft                  map[string]string `json:"draft"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Data.Source != "anisearch:12345" {
		t.Fatalf("expected anisearch source, got %#v", payload.Data)
	}
}

func TestLoadAnimeAniSearchEditEnrichment_ReturnsConflictRedirectForDuplicateSource(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/anime/7/enrichment/anisearch",
		strings.NewReader(`{"anisearch_id":"12345","draft":{"title":"Lookup Title"},"protected_fields":[]}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.LoadAnimeAniSearchEnrichment(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "redirect_path") {
		t.Fatalf("expected redirect_path in body, got %s", recorder.Body.String())
	}
}

func TestLoadAnimeAniSearchEditEnrichment_SerializesAppliedSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/anime/7/enrichment/anisearch",
		strings.NewReader(`{"anisearch_id":"12345","draft":{"title":"Lookup Title"},"protected_fields":["description"]}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 21, DisplayName: "Admin"})

	handler.LoadAnimeAniSearchEnrichment(c)

	if !strings.Contains(recorder.Body.String(), "applied_relations") {
		t.Fatalf("expected applied_relations summary, got %s", recorder.Body.String())
	}
}
