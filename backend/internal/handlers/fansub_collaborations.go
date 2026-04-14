package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type addCollaborationMemberRequest struct {
	MemberGroupID int64 `json:"member_group_id"`
}

// ListCollaborationMembers gibt alle Mitgliedsgruppen einer Kollaboration zurück.
func (h *FansubHandler) ListCollaborationMembers(c *gin.Context) {
	collaborationID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	members, err := h.fansubRepo.ListCollaborationMembers(c.Request.Context(), collaborationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "fansubgruppe nicht gefunden"},
		})
		return
	} else if err != nil {
		log.Printf("list collaboration members: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": members,
	})
}

// AddCollaborationMember fügt einer Kollaboration eine neue Mitgliedsgruppe hinzu.
func (h *FansubHandler) AddCollaborationMember(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	collaborationID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req addCollaborationMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.MemberGroupID <= 0 {
		badRequest(c, "member_group_id ist erforderlich")
		return
	}

	if req.MemberGroupID == collaborationID {
		badRequest(c, "gruppe kann nicht sich selbst als mitglied haben")
		return
	}

	// Check that collaboration is actually a collaboration type
	collab, err := h.fansubRepo.GetGroupByID(c.Request.Context(), collaborationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "fansubgruppe nicht gefunden"},
		})
		return
	} else if err != nil {
		log.Printf("add collab member: get group %d: %v", collaborationID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	if collab.GroupType != models.FansubGroupTypeCollaboration {
		badRequest(c, "nur kollaborationen koennen mitglieder haben")
		return
	}

	member, err := h.fansubRepo.AddCollaborationMember(c.Request.Context(), collaborationID, req.MemberGroupID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "mitgliedsgruppe nicht gefunden"},
		})
		return
	} else if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "mitglied bereits vorhanden"},
		})
		return
	} else if err != nil {
		log.Printf("add collab member: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": member,
	})
}

// RemoveCollaborationMember entfernt eine Mitgliedsgruppe aus einer Kollaboration.
func (h *FansubHandler) RemoveCollaborationMember(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	collaborationID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	memberGroupID, err := parseFansubID(c.Param("memberGroupId"))
	if err != nil {
		badRequest(c, "ungueltige member_group_id")
		return
	}

	if err := h.fansubRepo.RemoveCollaborationMember(c.Request.Context(), collaborationID, memberGroupID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "mitglied nicht gefunden"},
		})
		return
	} else if err != nil {
		log.Printf("remove collab member: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
