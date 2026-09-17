package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListGroupedEpisodes gibt alle Episoden eines Anime gruppiert nach Staffel/Episode zurück, optional mit Versionen und Fansubs.
func (h *FansubHandler) ListGroupedEpisodes(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	query, err := parseStrictNamedQuery(c.Request.URL.RawQuery, "projection", "limit", "cursor")
	if err != nil {
		badRequest(c, "ungültige Episodenoptionen")
		return
	}
	projection := query.Get("projection")
	var data any
	if projection == "public" {
		query, err = parseStrictNamedQuery(c.Request.URL.RawQuery, "projection", "limit", "cursor", "includeVersions", "includeFansubs", "fansub")
		if err != nil {
			badRequest(c, "ungültige Episodenoptionen")
			return
		}
		for _, key := range []string{"projection", "limit", "cursor", "includeVersions", "includeFansubs", "fansub"} {
			if len(query[key]) > 1 {
				badRequest(c, "ungültige Episodenoptionen")
				return
			}
		}
		for _, key := range []string{"includeVersions", "includeFansubs"} {
			if values, ok := query[key]; ok && values[0] != "true" {
				badRequest(c, "widersprüchliche Episodenoptionen")
				return
			}
		}
		options := repository.PublicEpisodeOptions{Cursor: query.Get("cursor"), Fansub: query.Get("fansub")}
		if values, ok := query["limit"]; ok {
			raw := values[0]
			options.Limit, err = strconv.Atoi(raw)
			if err != nil || options.Limit <= 0 || strings.IndexFunc(raw, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
				badRequest(c, "ungültiges Episodenlimit")
				return
			}
		}
		// Validate before resolving the slug: normalized() compares the cursor's
		// embedded raw slug identity against options.Fansub without touching the
		// DB, so a cursor scoped to a different filter is rejected before any SQL
		// runs (D-06) instead of wasting a slug-resolution round trip first.
		if err = options.Validate(animeID); err != nil {
			badRequest(c, "ungültige Episodenoptionen")
			return
		}
		if options.Fansub != "" {
			groupID, resolveErr := h.fansubRepo.ResolveFansubGroupIDForAnime(c.Request.Context(), animeID, options.Fansub)
			if errors.Is(resolveErr, repository.ErrNotFound) {
				badRequest(c, "unbekannte Fansub-Gruppe für diesen Anime")
				return
			}
			if resolveErr != nil {
				log.Printf("grouped episodes list: fansub slug resolution error (anime_id=%d): %v", animeID, resolveErr)
				c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
				return
			}
			options.GroupID = &groupID
		}
		data, err = h.episodeVersionRepo.ListPublicGroupedByAnimeID(c.Request.Context(), animeID, options)
	} else {
		if projection != "" || query.Has("projection") || query.Has("limit") || query.Has("cursor") {
			badRequest(c, "ungültige Episodenprojektion")
			return
		}
		includeVersions := c.DefaultQuery("includeVersions", "true") == "true"
		includeFansubs := c.DefaultQuery("includeFansubs", "true") == "true"
		data, err = h.episodeVersionRepo.ListGroupedByAnimeID(c.Request.Context(), animeID, includeVersions, includeFansubs)
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("grouped episodes list: repo error (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}

// GetEpisodeVersionByID gibt eine einzelne Episodenversion anhand ihrer ID zurück.
func (h *FansubHandler) GetEpisodeVersionByID(c *gin.Context) {
	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungültige version id")
		return
	}

	item, err := h.episodeVersionRepo.GetByID(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("episode version get: repo error (version_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	// The public compatibility read must not expose the editor-only source selector.
	publicItem := *item
	publicItem.MediaSourceID = nil
	c.JSON(http.StatusOK, gin.H{"data": publicItem})
}
