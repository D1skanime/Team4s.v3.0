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

func TestGroupHandler_GetGroupDetail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	defer db.Close()

	repo := repository.NewGroupRepository(db)
	fansubRepo := repository.NewFansubRepository(db)
	handler := NewGroupHandler(repo)

	// Setup test data
	animeID := createTestAnimeForHandlers(t, db)
	group, err := fansubRepo.CreateGroup(testCtx, models.FansubGroupCreateInput{
		Slug:   "test-handler-group",
		Name:   "Test Handler Group",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("failed to create test group: %v", err)
	}

	_, err = fansubRepo.AttachAnimeFansub(testCtx, animeID, group.ID, models.AnimeFansubAttachInput{
		IsPrimary: true,
	})
	if err != nil {
		t.Fatalf("failed to attach group: %v", err)
	}

	// Test: Success (200)
	t.Run("Success", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: fmt.Sprintf("%d", group.ID)},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupDetail(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var response struct {
			Data models.GroupDetail `json:"data"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if response.Data.AnimeID != animeID {
			t.Errorf("expected anime_id %d, got %d", animeID, response.Data.AnimeID)
		}
		if response.Data.FansubID != group.ID {
			t.Errorf("expected fansub_id %d, got %d", group.ID, response.Data.FansubID)
		}
	})

	// Test: Invalid anime ID (400)
	t.Run("InvalidAnimeID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: "invalid"},
			{Key: "groupId", Value: fmt.Sprintf("%d", group.ID)},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupDetail(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	// Test: Invalid group ID (400)
	t.Run("InvalidGroupID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: "invalid"},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupDetail(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	// Test: Group not found (404)
	t.Run("NotFound", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: "999999"},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupDetail(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", w.Code)
		}
	})
}

func TestGroupHandler_GetGroupReleases(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)
	defer db.Close()

	repo := repository.NewGroupRepository(db)
	fansubRepo := repository.NewFansubRepository(db)
	versionRepo := repository.NewEpisodeVersionRepository(db)
	handler := NewGroupHandler(repo)

	// Setup test data
	animeID := createTestAnimeForHandlers(t, db)
	group, err := fansubRepo.CreateGroup(testCtx, models.FansubGroupCreateInput{
		Slug:   "test-releases-group",
		Name:   "Test Releases Group",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("failed to create test group: %v", err)
	}

	_, err = fansubRepo.AttachAnimeFansub(testCtx, animeID, group.ID, models.AnimeFansubAttachInput{
		IsPrimary: true,
	})
	if err != nil {
		t.Fatalf("failed to attach group: %v", err)
	}

	// Create episodes
	for i := int32(1); i <= 10; i++ {
		_, err := versionRepo.Create(testCtx, models.EpisodeVersionCreateInput{
			AnimeID:       animeID,
			EpisodeNumber: i,
			FansubGroupID: &group.ID,
			MediaProvider: "jellyfin",
			MediaItemID:   fmt.Sprintf("item-%d", i),
		})
		if err != nil {
			t.Fatalf("failed to create episode %d: %v", i, err)
		}
	}

	// Test: Success with default pagination (200)
	t.Run("SuccessDefaultPagination", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: fmt.Sprintf("%d", group.ID)},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupReleases(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var response struct {
			Data models.GroupReleasesData `json:"data"`
			Meta map[string]any           `json:"meta"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if len(response.Data.Episodes) != 10 {
			t.Errorf("expected 10 episodes, got %d", len(response.Data.Episodes))
		}
		if response.Meta["total"] != float64(10) {
			t.Errorf("expected total 10, got %v", response.Meta["total"])
		}
	})

	// Test: Custom pagination (200)
	t.Run("SuccessCustomPagination", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: fmt.Sprintf("%d", group.ID)},
		}
		req := httptest.NewRequest(http.MethodGet, "/?page=2&per_page=3", nil)
		c.Request = req

		handler.GetGroupReleases(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}

		var response struct {
			Data models.GroupReleasesData `json:"data"`
			Meta map[string]any           `json:"meta"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if len(response.Data.Episodes) != 3 {
			t.Errorf("expected 3 episodes on page 2, got %d", len(response.Data.Episodes))
		}
		if response.Meta["current_page"] != float64(2) {
			t.Errorf("expected current_page 2, got %v", response.Meta["current_page"])
		}
	})

	// Test: Invalid pagination parameter (400)
	t.Run("InvalidPagination", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: fmt.Sprintf("%d", group.ID)},
		}
		req := httptest.NewRequest(http.MethodGet, "/?page=invalid", nil)
		c.Request = req

		handler.GetGroupReleases(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", w.Code)
		}
	})

	// Test: Group not found (404)
	t.Run("NotFound", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{
			{Key: "id", Value: fmt.Sprintf("%d", animeID)},
			{Key: "groupId", Value: "999999"},
		}
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

		handler.GetGroupReleases(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", w.Code)
		}
	})
}
