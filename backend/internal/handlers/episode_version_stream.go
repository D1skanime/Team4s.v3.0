package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"team4s.v3/backend/internal/models"

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
	versionID, variantIDs, err := parseReleaseStreamSelection(c)
	if err != nil {
		badRequest(c, "ungültige release id")
		return
	}

	if !h.authorizeReleaseStream(c, versionID) {
		return
	}

	release, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID, variantIDs...)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("release stream: repo error (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	targetURL, err := h.buildReleaseSourceStreamURL(c.Request.Context(), release)
	if err != nil || strings.TrimSpace(targetURL) == "" {
		log.Printf("release stream: unable to build stream url (release_id=%d, provider=%q): %v", versionID, release.MediaProvider, err)
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "stream nicht gefunden"}})
		return
	}
	targetURL = appendReleaseStreamStartOffset(targetURL, firstNonEmpty([]string{c.Query("startTimeTicks"), c.Query("StartTimeTicks")}))

	req, err := h.newProviderRequest(c.Request.Context(), release.MediaProvider, targetURL)
	if err != nil {
		log.Printf("release stream: create outbound request failed (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	copyProxyHeaders(c.Request.Header, req.Header)

	resp, err := h.doProviderRequest(release.MediaProvider, req)
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

// Bound video requests use their stored identity without an extra metadata read.
// Existing unbound rows resolve at playback time and are never persisted here.
func (h *FansubHandler) buildReleaseSourceStreamURL(ctx context.Context, source *models.ReleaseStreamSource) (string, error) {
	if !strings.EqualFold(strings.TrimSpace(source.MediaProvider), "jellyfin") {
		return h.buildProviderStreamURL(source.MediaProvider, source.MediaItemID, source.StreamURL)
	}
	target, err := buildJellyfinStreamURL(h.jellyfinBaseURL, h.jellyfinStreamPath, h.jellyfinAPIKey, source.MediaItemID)
	if err != nil {
		return "", err
	}
	id := strings.TrimSpace(derefString(source.MediaSourceID))
	if source.JellyfinSource != nil {
		id = strings.TrimSpace(source.JellyfinSource.MediaSourceID)
	}
	if id == "" {
		selected, err := fetchJellyfinPlaybackSource(ctx, h.httpClient, h.jellyfinBaseURL, h.jellyfinAPIKey, source.MediaItemID, source.JellyfinSource)
		if err != nil {
			return "", err
		}
		id = selected.Snapshot.MediaSourceID
	}
	return withJellyfinMediaSourceID(target, id)
}

func withJellyfinMediaSourceID(target, sourceID string) (string, error) {
	parsed, err := url.Parse(target)
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	query.Set("MediaSourceId", sourceID)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}
