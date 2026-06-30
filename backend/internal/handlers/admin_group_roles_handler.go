package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

// AdminGroupRolesHandler liefert die Liste der assignable Gruppenrollen (D-12).
// GET /api/v1/admin/fansub-group-roles — nur Platform-Admins.
// authzRepo ist any, da requirePlatformAdminIdentity roleChecker als any erwartet
// und intern per Type-Assertion prüft (analog zu anderen Handlern im Projekt).
type AdminGroupRolesHandler struct {
	authzRepo any
}

// NewAdminGroupRolesHandler erstellt einen neuen AdminGroupRolesHandler.
func NewAdminGroupRolesHandler(authzRepo any) *AdminGroupRolesHandler {
	return &AdminGroupRolesHandler{authzRepo: authzRepo}
}

// roleItem ist der JSON-DTO für einen einzelnen Rolleneintrag.
type roleItem struct {
	Code string `json:"code"`
}

// ListFansubGroupRoles gibt alle assignable Gruppenrollen aus dem In-Memory-Catalog zurück.
// GET /api/v1/admin/fansub-group-roles
// Gesichert: requirePlatformAdminIdentity (D-12, T-95-02-ID).
func (h *AdminGroupRolesHandler) ListFansubGroupRoles(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roles := permissions.FansubGroupRoles()

	items := make([]roleItem, len(roles))
	for i, r := range roles {
		items[i] = roleItem{Code: r}
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
