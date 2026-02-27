package handlers

import (
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) MediaVideo(c *gin.Context) {
	provider := strings.TrimSpace(c.Query("provider"))
	itemID := strings.TrimSpace(c.Query("item_id"))
	if provider == "" || itemID == "" {
		badRequest(c, "ungueltige media parameter")
		return
	}

	targetURL, err := h.buildProviderStreamURL(provider, itemID, nil)
	if err != nil {
		log.Printf("media video: unable to build video url (provider=%q, item_id=%q): %v", provider, itemID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "video nicht gefunden"}})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("media video: create outbound request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	copyProxyHeaders(c.Request.Header, req.Header)
	req.Header.Set("Accept", "video/*")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("media video: upstream request failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "video nicht erreichbar"}})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "video nicht gefunden"}})
		return
	}
	if resp.StatusCode >= 500 {
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "video nicht erreichbar"}})
		return
	}

	copyResponseHeaders(resp.Header, c.Writer.Header())
	if strings.TrimSpace(c.Writer.Header().Get("Cache-Control")) == "" {
		c.Writer.Header().Set("Cache-Control", "public, max-age=600")
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("media video: proxy copy failed: %v", err)
	}
}
