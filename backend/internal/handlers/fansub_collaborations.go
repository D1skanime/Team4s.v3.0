package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type addCollaborationMemberRequest struct {
	MemberGroupID int64 `json:"member_group_id"`
}

// ListCollaborationMembers ist nach Phase 81 deaktiviert — Kombigruppen existieren nicht mehr.
// Endpunkt wird in Plan 04 vollständig entfernt.
func (h *FansubHandler) ListCollaborationMembers(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{
		"error": gin.H{"message": "kollaborationsgruppen wurden entfernt (phase 81)"},
	})
}

// AddCollaborationMember ist nach Phase 81 deaktiviert — Kombigruppen existieren nicht mehr.
// Endpunkt wird in Plan 04 vollständig entfernt.
func (h *FansubHandler) AddCollaborationMember(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{
		"error": gin.H{"message": "kollaborationsgruppen wurden entfernt (phase 81)"},
	})
}

// RemoveCollaborationMember ist nach Phase 81 deaktiviert — Kombigruppen existieren nicht mehr.
// Endpunkt wird in Plan 04 vollständig entfernt.
func (h *FansubHandler) RemoveCollaborationMember(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{
		"error": gin.H{"message": "kollaborationsgruppen wurden entfernt (phase 81)"},
	})
}
