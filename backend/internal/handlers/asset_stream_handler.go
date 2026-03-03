package handlers

import (
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// AssetStreamHandler handles streaming of media assets from Jellyfin/Emby
type AssetStreamHandler struct {
	jellyfinAPIKey     string
	jellyfinBaseURL    string
	jellyfinStreamPath string
	httpClient         *http.Client
}

// AssetStreamConfig holds configuration for asset streaming
type AssetStreamConfig struct {
	JellyfinAPIKey         string
	JellyfinBaseURL        string
	JellyfinStreamPath     string
}

// NewAssetStreamHandler creates a new AssetStreamHandler
func NewAssetStreamHandler(cfg AssetStreamConfig) *AssetStreamHandler {
	streamPath := strings.TrimSpace(cfg.JellyfinStreamPath)
	if streamPath == "" || !strings.Contains(streamPath, "%s") {
		streamPath = "/Videos/%s/stream"
	}

	return &AssetStreamHandler{
		jellyfinAPIKey:     strings.TrimSpace(cfg.JellyfinAPIKey),
		jellyfinBaseURL:    strings.TrimSpace(cfg.JellyfinBaseURL),
		jellyfinStreamPath: streamPath,
		httpClient: &http.Client{
			Timeout: 0,
		},
	}
}

// StreamAsset proxies a stream request to Jellyfin
func (h *AssetStreamHandler) StreamAsset(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	assetID := strings.TrimSpace(c.Param("assetId"))
	if assetID == "" {
		badRequest(c, "ungueltige asset id")
		return
	}

	if _, err := strconv.ParseInt(assetID, 10, 64); err == nil {
		// If assetID is numeric, it's treated as a Jellyfin item ID
	} else {
		// Also allow non-numeric IDs (Jellyfin can have GUID-based IDs)
		if len(assetID) > 100 {
			badRequest(c, "ungueltige asset id")
			return
		}
	}

	targetURL, err := buildProviderStreamURL(
		h.jellyfinBaseURL,
		h.jellyfinStreamPath,
		h.jellyfinAPIKey,
		assetID,
	)
	if err != nil || strings.TrimSpace(targetURL) == "" {
		log.Printf("asset stream: unable to build stream url (asset_id=%q, user_id=%d): %v", assetID, identity.UserID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("asset stream: create outbound request failed (asset_id=%q, user_id=%d): %v", assetID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	copyProxyHeaders(c.Request.Header, req.Header)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("asset stream: upstream request failed (asset_id=%q, user_id=%d): %v", assetID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "asset nicht gefunden",
			},
		})
		return
	}

	if resp.StatusCode >= 500 {
		log.Printf("asset stream: upstream error (asset_id=%q, user_id=%d, status=%d)", assetID, identity.UserID, resp.StatusCode)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "stream fehler",
			},
		})
		return
	}

	copyResponseHeaders(resp.Header, c.Writer.Header())
	c.Status(resp.StatusCode)

	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("asset stream: proxy copy failed (asset_id=%q, user_id=%d): %v", assetID, identity.UserID, err)
	}
}
