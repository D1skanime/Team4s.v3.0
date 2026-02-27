package handlers

import (
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *EpisodePlaybackHandler) Play(c *gin.Context) {
	episodeID, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige episode id")
		return
	}

	principal, ok := h.authorizePlayback(c, episodeID)
	if !ok {
		return
	}
	if !h.enforcePlaybackRateLimit(c, "play", principal) {
		return
	}

	releaseSlot, ok := h.acquirePlaybackSlot(c)
	if !ok {
		return
	}
	defer releaseSlot()

	if strings.TrimSpace(h.embyAPIKey) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream derzeit nicht verfuegbar",
			},
		})
		return
	}

	episode, ok := h.loadPlayableEpisode(c, episodeID)
	if !ok {
		return
	}

	targetURL, ok := h.resolveTargetStreamURL(c, episodeID, episode.StreamLinks)
	if !ok {
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("episode_playback: create outbound request failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	copyProxyHeaders(c.Request.Header, req.Header)
	h.proxyPlaybackResponse(c, episodeID, req)
}

func (h *EpisodePlaybackHandler) resolveTargetStreamURL(c *gin.Context, episodeID int64, streamLinks []string) (string, bool) {
	sourceURL := firstNonEmpty(streamLinks)
	if sourceURL == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return "", false
	}

	targetURL, err := h.buildEmbyStreamURL(sourceURL)
	if err != nil {
		log.Printf("episode_playback: build stream url failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return "", false
	}

	return targetURL, true
}

func (h *EpisodePlaybackHandler) proxyPlaybackResponse(c *gin.Context, episodeID int64, req *http.Request) {
	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("episode_playback: emby request failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	copyResponseHeaders(resp.Header, c.Writer.Header())
	c.Status(resp.StatusCode)

	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("episode_playback: proxy copy failed (episode_id=%d): %v", episodeID, err)
	}
}
