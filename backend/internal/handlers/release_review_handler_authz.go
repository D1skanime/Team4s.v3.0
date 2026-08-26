package handlers

import (
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// authorizedKinds resolves group review rights exactly ONCE per handler call (Phase 141
// Plan 01, closing 141-RESEARCH.md Pitfall 1) via permissions.ResolveReviewGroupAuthorization,
// then projects both review.text.decide / review.image.decide states from that single
// resolution -- previously this checked each candidate kind's review capability
// individually, independently re-resolving group rights each time.
func (h *ReleaseReviewHandler) authorizedKinds(
	c *gin.Context,
	actor permissions.Actor,
	groupID int64,
	requested string,
) ([]string, bool) {
	actions := []struct {
		action permissions.Action
		kind   string
	}{
		{permissions.ActionReviewTextDecide, string(repository.ReviewKindText)},
		{permissions.ActionReviewImageDecide, string(repository.ReviewKindImage)},
	}
	results, err := h.permissions.ResolveReviewGroupAuthorization(c.Request.Context(), actor, groupID)
	if err != nil {
		writePermissionInternalError(c, err, "Review-Berechtigung konnte nicht geprüft werden.")
		return nil, false
	}
	allowed := make([]string, 0, len(actions))
	var denied permissions.Result
	for _, candidate := range actions {
		result := results[candidate.action]
		if result.Allowed {
			if requested == "" || requested == candidate.kind {
				allowed = append(allowed, candidate.kind)
			}
		} else {
			denied = result.Result
		}
	}
	if len(allowed) == 0 {
		if denied.ReasonCode == "" {
			denied = permissions.Result{ReasonCode: permissions.ReasonInsufficientRole}
		}
		writePermissionDenied(c, denied)
		return nil, false
	}
	return allowed, true
}
