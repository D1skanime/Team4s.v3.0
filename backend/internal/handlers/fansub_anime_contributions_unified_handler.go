package handlers

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

// ListUnifiedGroupMembers gibt die vereinheitlichte Personenliste einer Fansub-Gruppe zurück.
// Die Liste umfasst sowohl historische als auch App-Member (D-02), identifiziert über members.id.
// GET /admin/fansubs/:id/unified-members
// Gesichert mit CanForFansubGroup(MembersView) (T-82-02-01, ASVS V4.1).
func (h *FansubAnimeContributionsHandler) ListUnifiedGroupMembers(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "unified_members.list.denied", &fansubID, "unified_member", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	if h.histMembersRepo == nil {
		log.Printf("unified members list: histMembersRepo nicht konfiguriert (fansub_id=%d)", fansubID)
		internalError(c, "interner serverfehler")
		return
	}

	items, err := h.histMembersRepo.ListUnifiedByFansub(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("unified members list: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
