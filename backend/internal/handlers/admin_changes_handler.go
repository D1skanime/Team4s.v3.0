package handlers

import (
	"context"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// changesRepo is the minimal interface the handler needs to load the
// cross-group Aenderungen/audit workspace (Plan 138-05, D-25/D-28).
type changesRepo interface {
	ListChanges(ctx context.Context, filter repository.ChangeListFilter) ([]repository.ChangeListRow, int, error)
}

// AdminChangesHandler answers D-25/D-28's central "Aenderungen" workspace
// across ALL fansub groups. Platform-admin-only, mirroring
// AdminClaimsListHandler/AdminRoleHoldersHandler's authorization pattern
// verbatim (138-RESEARCH.md Security Domain, T-138-10).
type AdminChangesHandler struct {
	authzRepo   capabilityAuthzRepo
	changesRepo changesRepo
}

// NewAdminChangesHandler creates a new AdminChangesHandler.
func NewAdminChangesHandler(authzRepo capabilityAuthzRepo, changesRepo changesRepo) *AdminChangesHandler {
	return &AdminChangesHandler{
		authzRepo:   authzRepo,
		changesRepo: changesRepo,
	}
}

// ListChanges lists audit_logs entries across all fansub groups/users with
// benutzer/gruppe/target_type/zeitraum filtering and clamped pagination.
// GET /admin/changes
func (h *AdminChangesHandler) ListChanges(c *gin.Context) {
	if _, ok := requirePlatformAdminIdentity(c, h.authzRepo, ""); !ok {
		return
	}
	if h.changesRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	filter := repository.ChangeListFilter{
		Limit:  parseOptionalInt(c.Query("limit")),
		Offset: parseOptionalInt(c.Query("offset")),
	}
	if benutzer, ok := parseOptionalPositiveID(c.Query("benutzer")); ok {
		filter.AppUserID = &benutzer
	}
	if akteur, ok := parseOptionalPositiveID(c.Query("akteur")); ok {
		filter.AppUserID = &akteur
	}
	if gruppe, ok := parseOptionalPositiveID(c.Query("gruppe")); ok {
		filter.ScopeGroupID = &gruppe
	}
	if targetType := strings.TrimSpace(c.Query("target_type")); targetType != "" {
		filter.TargetType = &targetType
	}
	if from, ok := parseOptionalRFC3339(c.Query("from")); ok {
		filter.From = &from
	}
	if to, ok := parseOptionalRFC3339(c.Query("to")); ok {
		filter.To = &to
	}

	rows, total, err := h.changesRepo.ListChanges(c.Request.Context(), filter)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	effectiveLimit, effectiveOffset := repository.ClampAdminListPage(filter.Limit, filter.Offset)
	c.JSON(http.StatusOK, gin.H{
		"data": rows,
		"meta": gin.H{
			"total":  total,
			"limit":  effectiveLimit,
			"offset": effectiveOffset,
		},
	})
}
