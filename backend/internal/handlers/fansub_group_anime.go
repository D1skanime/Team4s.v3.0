package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListAnimeFansubs gibt alle mit einem Anime verknüpften Fansub-Gruppen zurück.
func (h *FansubHandler) ListAnimeFansubs(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	items, err := h.fansubRepo.ListAnimeFansubs(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime fansub list: repo error (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

// AttachAnimeFansub verknüpft eine Fansub-Gruppe mit einem Anime.
func (h *FansubHandler) AttachAnimeFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	fansubID, err := parseFansubID(c.Param("fansubId"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req animeFansubAttachRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("anime fansub attach: bad request (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input := models.AnimeFansubAttachInput{
		IsPrimary: req.IsPrimary != nil && *req.IsPrimary,
		Notes:     normalizeNullableString(req.Notes),
	}

	item, err := h.fansubRepo.AttachAnimeFansub(c.Request.Context(), animeID, fansubID, input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "verknuepfung bereits vorhanden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime oder fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime fansub attach: repo error (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

// DetachAnimeFansub hebt die Verknüpfung zwischen einer Fansub-Gruppe und einem Anime auf.
func (h *FansubHandler) DetachAnimeFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	fansubID, err := parseFansubID(c.Param("fansubId"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	if err := h.fansubRepo.DetachAnimeFansub(c.Request.Context(), animeID, fansubID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "verknuepfung nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("anime fansub detach: repo error (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
