package handlers

import (
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) StreamRelease(c *gin.Context) {
	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige release id")
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
