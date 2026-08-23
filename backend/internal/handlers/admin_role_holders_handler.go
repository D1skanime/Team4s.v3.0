package handlers

import (
	"context"
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// roleHolderRepo is the minimal interface the handler needs to load
// group-scoped role holders (Plan 138-01, D-07).
type roleHolderRepo interface {
	ListRoleHolders(ctx context.Context, roleCode string) ([]repository.RoleHolderEntry, error)
}

// AdminRoleHoldersHandler answers "who holds fansub-group role X" for the
// D-07 "Rollen" view. This is a cross-group, platform-admin-only surface —
// it mirrors AdminCapabilityHandler's authorization pattern verbatim and
// never uses the group-scoped CanForFansubGroup pattern
// (138-RESEARCH.md Security Domain, binding).
type AdminRoleHoldersHandler struct {
	authzRepo  capabilityAuthzRepo
	holderRepo roleHolderRepo
}

// NewAdminRoleHoldersHandler creates a new AdminRoleHoldersHandler.
func NewAdminRoleHoldersHandler(authzRepo capabilityAuthzRepo, holderRepo roleHolderRepo) *AdminRoleHoldersHandler {
	return &AdminRoleHoldersHandler{
		authzRepo:  authzRepo,
		holderRepo: holderRepo,
	}
}

// ListRoleHolders lists all fansub-group-scoped holders of the requested
// role_definitions role code.
// GET /api/v1/admin/role-holders/:roleCode
// Gesichert: platform-admin identity check (erste Aktion, no data access before it).
// roleCode is validated against the known fansub-group role catalog before the
// query runs, closing an unknown-role-code enumeration path (T-138-02).
// Global app roles (platform_admin/content_admin/user) are out of scope —
// they already have a working "who holds this" answer via
// /admin/users?role=<code>.
func (h *AdminRoleHoldersHandler) ListRoleHolders(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	if !permissions.IsKnownFansubGroupRole(roleCode) {
		badRequest(c, "unbekannte gruppenrolle")
		return
	}

	entries, err := h.holderRepo.ListRoleHolders(c.Request.Context(), roleCode)
	if err != nil {
		log.Printf("role holders: repo error (role=%q): %v", roleCode, err)
		internalError(c, "Rolleninhaber konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entries})
}
