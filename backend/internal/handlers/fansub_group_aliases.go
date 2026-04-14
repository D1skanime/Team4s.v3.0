package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubAliases gibt alle Aliase einer Fansub-Gruppe zurück.
func (h *FansubHandler) ListFansubAliases(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	items, err := h.fansubRepo.ListAliases(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub alias list: repo error (fansub_id=%d): %v", fansubID, err)
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

// CreateFansubAlias fügt einer Fansub-Gruppe einen neuen Alias hinzu.
func (h *FansubHandler) CreateFansubAlias(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req fansubAliasCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub alias create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubAliasCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateAlias(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "alias bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub alias create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
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

// DeleteFansubAlias entfernt einen Alias aus einer Fansub-Gruppe.
func (h *FansubHandler) DeleteFansubAlias(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	aliasID, err := parseFansubAliasID(c.Param("aliasId"))
	if err != nil {
		badRequest(c, "ungueltige alias id")
		return
	}

	if err := h.fansubRepo.DeleteAlias(c.Request.Context(), fansubID, aliasID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "alias nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("fansub alias delete: repo error (user_id=%d, fansub_id=%d, alias_id=%d): %v", identity.UserID, fansubID, aliasID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
