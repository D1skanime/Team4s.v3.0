package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func permissionActorFromContext(c *gin.Context) (middleware.AuthIdentity, permissions.Actor, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, permissions.Actor{}, false
	}

	return identity, permissions.Actor{
		AppUserID:       identity.AppUserID,
		Status:          identity.AppUserStatus,
		IsPlatformAdmin: identity.IsPlatformAdmin,
	}, true
}

func permissionDeniedStatus(result permissions.Result) int {
	switch result.ReasonCode {
	case permissions.ReasonUnauthorized:
		return http.StatusUnauthorized
	case permissions.ReasonResourceNotFound:
		return http.StatusNotFound
	default:
		return http.StatusForbidden
	}
}

func permissionDeniedMessage(result permissions.Result) string {
	switch result.ReasonCode {
	case permissions.ReasonUnauthorized:
		return "anmeldung erforderlich"
	case permissions.ReasonDisabledUser:
		return "benutzer ist deaktiviert"
	case permissions.ReasonResourceNotFound:
		return "ressource nicht gefunden"
	case permissions.ReasonNoMembership:
		return "keine berechtigte gruppenmitgliedschaft gefunden"
	case permissions.ReasonOwnerMismatch:
		return "aktion ist nur für eigene ressourcen erlaubt"
	default:
		return "keine berechtigung für diese aktion"
	}
}

func writePermissionDenied(c *gin.Context, result permissions.Result) {
	c.JSON(permissionDeniedStatus(result), gin.H{
		"error": gin.H{
			"message":     permissionDeniedMessage(result),
			"reason_code": result.ReasonCode,
		},
	})
}

func writePermissionInternalError(c *gin.Context, err error, detail string) {
	writeInternalErrorResponse(c, "interner serverfehler", err, detail)
}

func auditPermissionDenied(
	ctx *gin.Context,
	auditRepo auditLogWriter,
	identity middleware.AuthIdentity,
	eventType string,
	scopeID *int64,
	targetType string,
	targetID *int64,
	action permissions.Action,
	result permissions.Result,
) {
	if auditRepo == nil {
		return
	}

	var actorAppUserID *int64
	if identity.AppUserID > 0 {
		actorAppUserID = &identity.AppUserID
	}
	var actorLegacyUserID *int64
	if identity.UserID > 0 {
		actorLegacyUserID = &identity.UserID
	}
	reasonCode := result.ReasonCode
	_ = auditRepo.Write(ctx.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    actorAppUserID,
		ActorLegacyUserID: actorLegacyUserID,
		EventType:         eventType,
		ScopeType:         permissions.ScopeTypeGroup,
		ScopeID:           scopeID,
		TargetType:        targetType,
		TargetID:          targetID,
		Action:            string(action),
		Outcome:           "denied",
		ReasonCode:        &reasonCode,
		Payload: map[string]any{
			"matched_role":  result.MatchedRole,
			"matched_scope": result.MatchedScope,
		},
	})
}
