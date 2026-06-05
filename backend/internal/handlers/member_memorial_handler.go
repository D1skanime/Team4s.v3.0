package handlers

// MemberMemorialHandler implementiert POST /api/v1/admin/members/:id/memorial.
// Setzt members.profile_status='memorial' — nur Global Admin darf das (D-14/D-16-Caveat).
// Berührt NICHT den app_user-Account (D-13). Schreibt audit_logs (D-15).

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MemberMemorialRoleChecker prüft, ob ein AppUser Global Admin ist.
// Erlaubt DB-freie Handler-Tests via Stub.
type MemberMemorialRoleChecker interface {
	AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error)
}

// MemberMemorialRepo kapselt den DB-Zugriff für den Memorial-Setter.
// Erlaubt DB-freie Handler-Tests via Stub (nil-sicher in Tests).
type MemberMemorialRepo interface {
	GetMemberProfileStatus(ctx context.Context, memberID int64) (string, error)
	SetMemorialStatus(ctx context.Context, memberID int64) error
}

// MemberMemorialAuditLog schreibt Audit-Einträge (nil-sicher, fehlertolerant).
type MemberMemorialAuditLog interface {
	Write(ctx context.Context, entry repository.AuditLogEntry) error
}

// MemberMemorialHandler verdrahtet die Memorial-Setter-Aktion.
type MemberMemorialHandler struct {
	roleChecker MemberMemorialRoleChecker
	memberRepo  MemberMemorialRepo
	auditLog    MemberMemorialAuditLog
}

// NewMemberMemorialHandler erstellt einen neuen MemberMemorialHandler.
// memberRepo darf nil sein (Tests ohne DB setzen nil; Handler prüft auf nil).
func NewMemberMemorialHandler(
	roleChecker MemberMemorialRoleChecker,
	memberRepo MemberMemorialRepo,
	auditLog MemberMemorialAuditLog,
) *MemberMemorialHandler {
	return &MemberMemorialHandler{
		roleChecker: roleChecker,
		memberRepo:  memberRepo,
		auditLog:    auditLog,
	}
}

// requirePlatformAdminAppUserIdentity prüft die AppUserID-basierte Global-Admin-Identität.
// Liest den auth_identity-Kontext direkt ohne die UserID>0-Schranke von
// CommentAuthIdentityFromContext, da dieser Endpoint nur AppUserID-Identitäten (Keycloak)
// kennt. Analog requirePlatformAdminIdentity aber ohne Legacy-UserID-Fallback.
func requirePlatformAdminAppUserIdentity(c *gin.Context, roleChecker MemberMemorialRoleChecker) (middleware.AuthIdentity, bool) {
	raw, ok := c.Get("auth_identity")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}
	identity, ok := raw.(middleware.AuthIdentity)
	if !ok || identity.AppUserID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}

	if identity.AppUserStatus == models.AppUserStatusDisabled {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "konto ist deaktiviert"}})
		return middleware.AuthIdentity{}, false
	}
	if identity.AppUserStatus == models.AppUserStatusPending {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "konto wartet noch auf freischaltung"}})
		return middleware.AuthIdentity{}, false
	}

	isAdmin, err := roleChecker.AppUserHasGlobalRole(c.Request.Context(), identity.AppUserID, models.AppGlobalRolePlatformAdmin)
	if err != nil {
		log.Printf("memorial setter: platform-admin authz failed (app_user_id=%d): %v", identity.AppUserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}

// SetMemorial verarbeitet POST /api/v1/admin/members/:id/memorial.
// Nur Global Admin — NICHT gruppen-capability-gegated (D-16-Caveat/Fallstrick 4).
func (h *MemberMemorialHandler) SetMemorial(c *gin.Context) {
	// Schritt 1: Plattform-Admin-Identität prüfen (Global Admin, nicht Gruppen-Capability).
	// Direkte Context-Extraktion um AppUserID-only-Identitäten (Keycloak) und Test-Stubs
	// korrekt zu behandeln ohne die UserID>0-Schranke von CommentAuthIdentityFromContext.
	identity, ok := requirePlatformAdminAppUserIdentity(c, h.roleChecker)
	if !ok {
		return
	}

	// Schritt 2: memberID aus URL-Param parsen.
	memberID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || memberID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige member-id"}})
		return
	}

	// Schritt 3: Vorigen Status lesen (nil-sicher: repo kann in Tests nil sein).
	var previousStatus string
	if h.memberRepo != nil {
		previousStatus, err = h.memberRepo.GetMemberProfileStatus(c.Request.Context(), memberID)
		if err != nil {
			log.Printf("memorial setter: get profile_status member_id=%d: %v", memberID, err)
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "member nicht gefunden"}})
			return
		}

		// Schritt 4: profile_status auf 'memorial' setzen.
		if err := h.memberRepo.SetMemorialStatus(c.Request.Context(), memberID); err != nil {
			log.Printf("memorial setter: set memorial member_id=%d: %v", memberID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
			return
		}
	}

	// Schritt 5: Audit-Log schreiben (D-15). KEIN app_user-Account-UPDATE (D-13).
	if h.auditLog != nil {
		_ = h.auditLog.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID: &identity.AppUserID,
			EventType:      "member_profile.memorial_set",
			TargetType:     "member",
			TargetID:       &memberID,
			Action:         "set_memorial",
			Outcome:        "allowed",
			Payload: map[string]any{
				"previous_status": previousStatus,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"member_id":      memberID,
		"profile_status": "memorial",
	}})
}
