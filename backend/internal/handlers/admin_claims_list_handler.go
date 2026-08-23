package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// claimsListRepo is the minimal interface the handler needs to load the
// cross-group Claims workspace (Plan 138-05, D-23).
type claimsListRepo interface {
	ListClaims(ctx context.Context, filter repository.ClaimListFilter) ([]repository.ClaimListRow, int, error)
}

// AdminClaimsListHandler answers D-23's "zentrale Arbeitsqueue" for
// member_claims across ALL fansub groups. This is intentionally MORE
// restrictive than the existing group-delegable ListPendingClaimsForGroup —
// platform-admin-only, mirroring AdminRoleHoldersHandler's authorization
// pattern verbatim (138-RESEARCH.md Security Domain, T-138-10).
type AdminClaimsListHandler struct {
	authzRepo capabilityAuthzRepo
	claimsRepo claimsListRepo
}

// NewAdminClaimsListHandler creates a new AdminClaimsListHandler.
func NewAdminClaimsListHandler(authzRepo capabilityAuthzRepo, claimsRepo claimsListRepo) *AdminClaimsListHandler {
	return &AdminClaimsListHandler{
		authzRepo:  authzRepo,
		claimsRepo: claimsRepo,
	}
}

// ListClaims lists all member_claims across all fansub groups with
// status/type/group/user/date filtering and clamped pagination.
// GET /admin/claims
func (h *AdminClaimsListHandler) ListClaims(c *gin.Context) {
	if _, ok := requirePlatformAdminIdentity(c, h.authzRepo, ""); !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	filter := repository.ClaimListFilter{
		Limit:  parseOptionalInt(c.Query("limit")),
		Offset: parseOptionalInt(c.Query("offset")),
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filter.Status = &status
	}
	if claimType := strings.TrimSpace(c.Query("claim_type")); claimType != "" {
		filter.Type = &claimType
	}
	if groupID, ok := parseOptionalPositiveID(c.Query("fansub_group_id")); ok {
		filter.FansubGroupID = &groupID
	}
	if appUserID, ok := parseOptionalPositiveID(c.Query("app_user_id")); ok {
		filter.AppUserID = &appUserID
	}
	if from, ok := parseOptionalRFC3339(c.Query("from")); ok {
		filter.From = &from
	}
	if to, ok := parseOptionalRFC3339(c.Query("to")); ok {
		filter.To = &to
	}

	rows, total, err := h.claimsRepo.ListClaims(c.Request.Context(), filter)
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

func parseOptionalInt(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0
	}
	return value
}

func parseOptionalPositiveID(raw string) (int64, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return 0, false
	}
	value, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || value <= 0 {
		return 0, false
	}
	return value, true
}

func parseOptionalRFC3339(raw string) (time.Time, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}
