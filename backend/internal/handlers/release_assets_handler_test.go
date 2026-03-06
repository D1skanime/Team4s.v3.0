package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func TestReleaseAssetsHandler_ListReleaseAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	defer db.Close()

	versionRepo := repository.NewEpisodeVersionRepository(db)
	handler := NewReleaseAssetsHandler(versionRepo)

	animeID := createTestAnimeForHandlers(t, db)
	release, err := versionRepo.Create(testCtx, models.EpisodeVersionCreateInput{
		AnimeID:       animeID,
		EpisodeNumber: 1,
		MediaProvider: "jellyfin",
		MediaItemID:   "release-assets-test-item",
	})
	if err != nil {
		t.Fatalf("failed to create release: %v", err)
	}

	t.Run("Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", release.ID)}}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.ListReleaseAssets(c)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}

		var response struct {
			Data models.ReleaseAssetsData `json:"data"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if response.Data.ReleaseID != release.ID {
			t.Fatalf("expected release_id %d, got %d", release.ID, response.Data.ReleaseID)
		}
		if len(response.Data.Assets) != 0 {
			t.Fatalf("expected empty assets slice, got %d items", len(response.Data.Assets))
		}
	})

	t.Run("InvalidReleaseID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "invalid"}}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.ListReleaseAssets(c)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", w.Code)
		}
	})

	t.Run("NotFound", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "999999"}}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.ListReleaseAssets(c)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected status 404, got %d", w.Code)
		}
	})
}
