package handlers

import (
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func appendReleaseStreamStartOffset(targetURL string, rawStartTimeTicks string) string {
	trimmed := strings.TrimSpace(rawStartTimeTicks)
	if trimmed == "" {
		return targetURL
	}
	value, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || value < 0 {
		return targetURL
	}
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return targetURL
	}
	query := parsed.Query()
	query.Set("startTimeTicks", strconv.FormatInt(value, 10))
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

// StreamRelease leitet den Videostream einer Release-Version nach Autorisierungsprüfung als Proxy weiter.
func (h *FansubHandler) StreamRelease(c *gin.Context) {
	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige release id")
		return
	}

	if !h.authorizeReleaseStream(c, versionID) {
		return
	}

	release, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("release stream: repo error (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	targetURL, err := h.buildProviderStreamURL(release.MediaProvider, release.MediaItemID, release.StreamURL)
	if err != nil || strings.TrimSpace(targetURL) == "" {
		log.Printf("release stream: unable to build stream url (release_id=%d, provider=%q): %v", versionID, release.MediaProvider, err)
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "stream nicht gefunden"}})
		return
	}
	targetURL = appendReleaseStreamStartOffset(targetURL, firstNonEmpty([]string{c.Query("startTimeTicks"), c.Query("StartTimeTicks")}))

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("release stream: create outbound request failed (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	copyProxyHeaders(c.Request.Header, req.Header)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("release stream: upstream request failed (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "stream nicht erreichbar"}})
		return
	}
	defer resp.Body.Close()

	copyResponseHeaders(resp.Header, c.Writer.Header())
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("release stream: proxy copy failed (release_id=%d): %v", versionID, err)
	}
}
