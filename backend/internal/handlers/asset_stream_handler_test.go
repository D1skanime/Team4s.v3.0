package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func TestAssetStreamHandler_StreamAsset_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewAssetStreamHandler(AssetStreamConfig{
		JellyfinAPIKey:     "test-key",
		JellyfinBaseURL:    "http://jellyfin.test",
		JellyfinStreamPath: "/Videos/%s/stream",
	})

	router := gin.New()
	router.GET("/assets/:assetId/stream", handler.StreamAsset)

	req := httptest.NewRequest(http.MethodGet, "/assets/12345/stream", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAssetStreamHandler_StreamAsset_InvalidAssetID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewAssetStreamHandler(AssetStreamConfig{
		JellyfinAPIKey:     "test-key",
		JellyfinBaseURL:    "http://jellyfin.test",
		JellyfinStreamPath: "/Videos/%s/stream",
	})

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:      1,
			DisplayName: "Test User",
		})
		c.Next()
	})
	router.GET("/assets/:assetId/stream", handler.StreamAsset)

	req := httptest.NewRequest(http.MethodGet, "/assets//stream", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestAssetStreamHandler_NewAssetStreamHandler_DefaultStreamPath(t *testing.T) {
	handler := NewAssetStreamHandler(AssetStreamConfig{
		JellyfinAPIKey:     "test-key",
		JellyfinBaseURL:    "http://jellyfin.test",
		JellyfinStreamPath: "",
	})

	if handler.jellyfinStreamPath != "/Videos/%s/stream" {
		t.Errorf("expected default stream path, got %q", handler.jellyfinStreamPath)
	}
}

func TestAssetStreamHandler_NewAssetStreamHandler_CustomStreamPath(t *testing.T) {
	handler := NewAssetStreamHandler(AssetStreamConfig{
		JellyfinAPIKey:     "test-key",
		JellyfinBaseURL:    "http://jellyfin.test",
		JellyfinStreamPath: "/Items/%s/stream",
	})

	if handler.jellyfinStreamPath != "/Items/%s/stream" {
		t.Errorf("expected custom stream path, got %q", handler.jellyfinStreamPath)
	}
}
