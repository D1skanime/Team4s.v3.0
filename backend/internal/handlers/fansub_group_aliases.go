package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubAliases gibt alle Aliase einer Fansub-Gruppe zurück.
func (h *FansubHandler) ListFansubAliases(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
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
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	identity, ok := h.requireFansubAliasWriteAccess(c, fansubID, "fansub_group_alias.create.denied", "fansub_group", &fansubID)
	if !ok {
		return
	}

	var req fansubAliasCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub alias create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungültiger request body")
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

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_alias.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_alias",
		TargetID:       &item.ID,
		Action:         string(permissions.ActionFansubGroupEdit),
		Outcome:        "allowed",
		Payload:        map[string]any{"alias": item.Alias},
	})

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

// DeleteFansubAlias entfernt einen Alias aus einer Fansub-Gruppe.
func (h *FansubHandler) DeleteFansubAlias(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	aliasID, err := parseFansubAliasID(c.Param("aliasId"))
	if err != nil {
		badRequest(c, "ungültige alias id")
		return
	}
	identity, ok := h.requireFansubAliasWriteAccess(c, fansubID, "fansub_group_alias.delete.denied", "fansub_group_alias", &aliasID)
	if !ok {
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

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_alias.deleted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_alias",
		TargetID:       &aliasID,
		Action:         string(permissions.ActionFansubGroupEdit),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) requireFansubAliasWriteAccess(
	c *gin.Context,
	fansubID int64,
	deniedEvent string,
	targetType string,
	targetID *int64,
) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Alias-Berechtigung konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, deniedEvent, &fansubID, targetType, targetID, permissions.ActionFansubGroupEdit, result)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}
