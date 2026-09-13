package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAnimeRelationsInvalidIDNeverCallsRepository(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	// A nil repository makes any accidental database access fail this test,
	// including when no opt-in PostgreSQL fixture DSN is available.
	handler := NewAnimeHandler(nil, nil, AnimeMediaConfig{})
	router.GET("/api/v1/anime/:id/relations", handler.GetAnimeRelations)
	for _, id := range []string{"1abc", "1.5", "0", "-1", "9223372036854775808"} {
		t.Run(id, func(t *testing.T) {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/anime/"+id+"/relations", nil))
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", response.Code)
			}
		})
	}
}
