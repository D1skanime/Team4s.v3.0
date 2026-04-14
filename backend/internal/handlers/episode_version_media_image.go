package handlers

import (
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var allowedMediaImageKinds = map[string]struct{}{
	"primary":  {},
	"backdrop": {},
	"logo":     {},
	"banner":   {},
	"thumb":    {},
}

// MediaImage liefert ein Bild vom konfigurierten Media-Provider (Jellyfin/Emby) als Proxy-Antwort.
func (h *FansubHandler) MediaImage(c *gin.Context) {
	provider := strings.TrimSpace(c.Query("provider"))
	itemID := strings.TrimSpace(c.Query("item_id"))
	if provider == "" || itemID == "" {
		badRequest(c, "ungueltige media parameter")
		return
	}

	kind := strings.TrimSpace(c.DefaultQuery("kind", "primary"))
	if _, ok := allowedMediaImageKinds[kind]; !ok {
		badRequest(c, "ungueltiger kind parameter")
		return
	}

	widthValue, ok := parsePositiveIntQuery(c, "width", "ungueltiger width parameter")
	if !ok {
		return
	}
	qualityValue, ok := parseBoundedIntQuery(c, "quality", 1, 100, "ungueltiger quality parameter")
	if !ok {
		return
	}
	indexValue, ok := parseBoundedIntQuery(c, "index", 0, 1<<31-1, "ungueltiger index parameter")
	if !ok {
		return
	}

	targetURL, err := h.buildProviderImageURL(provider, itemID, kind, widthValue, qualityValue, indexValue)
	if err != nil {
		log.Printf("media image: unable to build image url (provider=%q, item_id=%q): %v", provider, itemID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "bild nicht gefunden"}})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("media image: create outbound request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}
	req.Header.Set("Accept", "image/*")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("media image: upstream request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "bild nicht erreichbar"}})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "bild nicht gefunden"}})
		return
	}

	c.Writer.Header().Set("Cache-Control", "public, max-age=3600")
	for _, key := range []string{"Content-Type", "Content-Length", "ETag", "Last-Modified"} {
		if value := strings.TrimSpace(resp.Header.Get(key)); value != "" {
			c.Writer.Header().Set(key, value)
		}
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("media image: proxy copy failed: %v", err)
	}
}

// parsePositiveIntQuery liest einen optionalen positiven Ganzzahl-Query-Parameter aus dem Request.
// Gibt nil zurück, wenn der Parameter fehlt; schreibt einen Bad-Request-Fehler und false, wenn der Wert ungültig ist.
func parsePositiveIntQuery(c *gin.Context, key string, errorMessage string) (*int, bool) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil, true
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		badRequest(c, errorMessage)
		return nil, false
	}
	return &value, true
}

// parseBoundedIntQuery liest einen optionalen Ganzzahl-Query-Parameter innerhalb eines erlaubten Wertebereichs.
// Gibt nil zurück, wenn der Parameter fehlt; schreibt einen Bad-Request-Fehler und false bei ungültigem Wert.
func parseBoundedIntQuery(c *gin.Context, key string, minValue int, maxValue int, errorMessage string) (*int, bool) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil, true
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value < minValue || value > maxValue {
		badRequest(c, errorMessage)
		return nil, false
	}
	return &value, true
}
