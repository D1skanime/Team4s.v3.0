package handlers

import (
	"errors"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

// resolveActorMemberIDs resolves the requesting actor's verified member IDs once per
// handler method call -- the second identity signal the shared existence-and-identity
// 403/404 split (Plan 141-03) needs alongside actor.AppUserID, mirroring queueOptions'
// identical resolution (Plan 141-02). Shared by Detail, Next, Decide, and queueOptions so
// the identity-nil-check + error-write pair is defined exactly once.
func (h *ReleaseReviewHandler) resolveActorMemberIDs(c *gin.Context, actor permissions.Actor) ([]int64, bool) {
	if h.identity == nil {
		writeInternalErrorResponse(c, "interner serverfehler", errors.New("release review identity resolver missing"), "")
		return nil, false
	}
	actorMemberIDs, err := h.identity.ResolveVerifiedActorMemberIDs(c.Request.Context(), actor.AppUserID)
	if err != nil {
		writePermissionInternalError(c, err, "Aktorenidentität konnte nicht geprüft werden.")
		return nil, false
	}
	return actorMemberIDs, true
}
