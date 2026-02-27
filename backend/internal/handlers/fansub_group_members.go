package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubMembers returns all members of a fansub group.
func (h *FansubHandler) ListFansubMembers(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	items, err := h.fansubRepo.ListMembers(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub member list: repo error (fansub_id=%d): %v", fansubID, err)
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

// CreateFansubMember adds a new member to a fansub group.
func (h *FansubHandler) CreateFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req fansubMemberCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub member create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubMemberCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateMember(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub member create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
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

// UpdateFansubMember modifies an existing member.
func (h *FansubHandler) UpdateFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	memberID, err := parseFansubMemberID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "ungueltige member id")
		return
	}

	var req models.FansubMemberPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf(
			"fansub member update: bad request (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubMemberPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.UpdateMember(c.Request.Context(), fansubID, memberID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitglied nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf(
			"fansub member update: repo error (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// DeleteFansubMember removes a member from a fansub group.
func (h *FansubHandler) DeleteFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	memberID, err := parseFansubMemberID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "ungueltige member id")
		return
	}

	if err := h.fansubRepo.DeleteMember(c.Request.Context(), fansubID, memberID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitglied nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf(
			"fansub member delete: repo error (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
