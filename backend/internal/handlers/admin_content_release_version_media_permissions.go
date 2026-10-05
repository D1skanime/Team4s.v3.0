package handlers

import (
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func releaseVersionMediaHasAllScope(result permissions.Result) bool {
	return result.ReasonCode == permissions.ReasonPlatformAdmin ||
		result.MatchedRole == permissions.RoleFansubLead ||
		result.MatchedRole == permissions.RoleProjectLead
}

func releaseVersionMediaUploadedByCurrentUser(uploadedByUserID *int64, currentLegacyUserID int64) bool {
	return uploadedByUserID != nil && *uploadedByUserID == currentLegacyUserID
}

func filterReleaseVersionMediaItemsForActor(items []repository.ReleaseVersionMediaItem, currentLegacyUserID int64, result permissions.Result) []repository.ReleaseVersionMediaItem {
	if releaseVersionMediaHasAllScope(result) {
		return items
	}

	filtered := make([]repository.ReleaseVersionMediaItem, 0, len(items))
	for _, item := range items {
		if releaseVersionMediaUploadedByCurrentUser(item.UploadedByUserID, currentLegacyUserID) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func releaseVersionMediaOwnerMismatchResult() permissions.Result {
	return permissions.Result{
		Allowed:    false,
		ReasonCode: permissions.ReasonOwnerMismatch,
		Reason:     "Medium gehört einem anderen Benutzer.",
	}
}

func releaseVersionMediaCanDeleteOwn(results ...permissions.Result) bool {
	for _, result := range results {
		if releaseVersionMediaHasAllScope(result) {
			return true
		}
		if permissions.RoleAllowsAction(result.MatchedRole, permissions.ActionReleaseVersionMediaDeleteOwn) {
			return true
		}
	}
	return false
}

// evaluateReleaseVersionMediaRelationMutation is the pure (DB-free) decision core shared by the
// per-item annotate/PATCH/DELETE path and the batched reorder path. It contains the exact four
// branches of the original canMutateReleaseVersionMediaRelation body:
//  1. platform_admin (actor flag or ReasonPlatformAdmin) -> allowed.
//  2. any contributor group allowed for the action (anyGroupAllowed) -> allowed.
//  3. uploaded-by-current-user with the action-specific RoleAllowsAction fallback -> allowed.
//  4. otherwise -> denied.
//
// anyGroupAllowed is the OR over the caller-resolved CanForFansubGroup results for this relation,
// so both call sites reach an identical authorization decision.
func evaluateReleaseVersionMediaRelationMutation(
	actor permissions.Actor,
	baseResult permissions.Result,
	uploadedByUserID *int64,
	currentLegacyUserID int64,
	action permissions.Action,
	anyGroupAllowed bool,
) bool {
	if actor.IsPlatformAdmin || baseResult.ReasonCode == permissions.ReasonPlatformAdmin {
		return true
	}

	if anyGroupAllowed {
		return true
	}

	// Release-version contribution roles already authorize curation of the concrete
	// relation. Do not require the separate group-role or owner path again.
	if baseResult.Allowed &&
		(action == permissions.ActionReleaseVersionMediaHighlight ||
			action == permissions.ActionReleaseVersionMediaReorder) {
		return true
	}

	if releaseVersionMediaUploadedByCurrentUser(uploadedByUserID, currentLegacyUserID) {
		if action == permissions.ActionReleaseVersionMediaDelete &&
			(permissions.RoleAllowsAction(baseResult.MatchedRole, permissions.ActionReleaseVersionMediaDeleteOwn) ||
				permissions.RoleAllowsAction(baseResult.MatchedRole, permissions.ActionReleaseVersionMediaDelete)) {
			return true
		}
		if action == permissions.ActionReleaseVersionMediaUpdate &&
			baseResult.Allowed &&
			permissions.RoleAllowsAction(baseResult.MatchedRole, permissions.ActionReleaseVersionMediaUpdate) {
			return true
		}
	}

	return false
}

func (h *AdminContentHandler) canMutateReleaseVersionMediaRelation(
	c *gin.Context,
	actor permissions.Actor,
	relationID int64,
	uploadedByUserID *int64,
	currentLegacyUserID int64,
	action permissions.Action,
	baseResult permissions.Result,
) (bool, error) {
	if actor.IsPlatformAdmin || baseResult.ReasonCode == permissions.ReasonPlatformAdmin {
		return true, nil
	}

	groupIDs, err := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDs(c.Request.Context(), relationID)
	if err != nil {
		return false, err
	}
	anyGroupAllowed := false
	for _, groupID := range groupIDs {
		result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, action, groupID)
		if err != nil {
			return false, err
		}
		if result.Allowed {
			anyGroupAllowed = true
			break
		}
	}

	return evaluateReleaseVersionMediaRelationMutation(
		actor, baseResult, uploadedByUserID, currentLegacyUserID, action, anyGroupAllowed,
	), nil
}

func (h *AdminContentHandler) annotateReleaseVersionMediaItemPermissions(
	c *gin.Context,
	actor permissions.Actor,
	currentLegacyUserID int64,
	items []repository.ReleaseVersionMediaItem,
	updateResult permissions.Result,
) error {
	for i := range items {
		items[i].UploadedByCurrentUser = releaseVersionMediaUploadedByCurrentUser(items[i].UploadedByUserID, currentLegacyUserID)
		canUpdate, err := h.canMutateReleaseVersionMediaRelation(
			c, actor, items[i].ID, items[i].UploadedByUserID, currentLegacyUserID,
			permissions.ActionReleaseVersionMediaUpdate, updateResult,
		)
		if err != nil {
			return err
		}
		deleteResult, err := h.permissionSvc.CanForReleaseVersionMediaDelete(c.Request.Context(), actor, items[i].ID)
		if err != nil {
			return err
		}
		canDelete, err := h.canMutateReleaseVersionMediaRelation(
			c, actor, items[i].ID, items[i].UploadedByUserID, currentLegacyUserID,
			permissions.ActionReleaseVersionMediaDelete, deleteResult,
		)
		if err != nil {
			return err
		}
		items[i].CanUpdate = canUpdate
		items[i].CanDelete = canDelete
	}
	return nil
}

// annotateReleaseVersionMediaItemPermissionsBatch resolves contributor-group rights once per
// distinct group and projects those in-memory decisions onto every media relation in the list.
// The central permissions.Service remains the authority; this only removes repeated relation
// resolution from the list projection.
func (h *AdminContentHandler) annotateReleaseVersionMediaItemPermissionsBatch(
	c *gin.Context,
	actor permissions.Actor,
	currentLegacyUserID int64,
	items []repository.ReleaseVersionMediaItem,
	updateResult permissions.Result,
) error {
	relationIDs := make([]int64, 0, len(items))
	for _, item := range items {
		relationIDs = append(relationIDs, item.ID)
	}

	groupsByRelation, err := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsByRelation(c.Request.Context(), relationIDs)
	if err != nil {
		return err
	}
	groupIDs := make([]int64, 0)
	seenGroups := make(map[int64]struct{})
	for _, groupIDsForRelation := range groupsByRelation {
		for _, groupID := range groupIDsForRelation {
			if _, seen := seenGroups[groupID]; seen {
				continue
			}
			seenGroups[groupID] = struct{}{}
			groupIDs = append(groupIDs, groupID)
		}
	}

	groupRights := make(map[int64]*permissions.GroupRightsResolution, len(groupIDs))
	for _, groupID := range groupIDs {
		resolved, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), actor, groupID)
		if err != nil {
			return err
		}
		groupRights[groupID] = resolved
	}

	platformBypass := actor.IsPlatformAdmin || updateResult.ReasonCode == permissions.ReasonPlatformAdmin
	for i := range items {
		items[i].UploadedByCurrentUser = releaseVersionMediaUploadedByCurrentUser(items[i].UploadedByUserID, currentLegacyUserID)
		canUpdateByGroup := platformBypass
		canDeleteByGroup := platformBypass
		for _, groupID := range groupsByRelation[items[i].ID] {
			rights := groupRights[groupID]
			if rights == nil {
				continue
			}
			canUpdateByGroup = canUpdateByGroup || rights.Can(permissions.ActionReleaseVersionMediaUpdate).Allowed
			canDeleteByGroup = canDeleteByGroup || rights.Can(permissions.ActionReleaseVersionMediaDelete).Allowed
			if items[i].UploadedByCurrentUser {
				canDeleteByGroup = canDeleteByGroup || rights.Can(permissions.ActionReleaseVersionMediaDeleteOwn).Allowed
			}
		}
		items[i].CanUpdate = evaluateReleaseVersionMediaRelationMutation(
			actor, updateResult, items[i].UploadedByUserID, currentLegacyUserID,
			permissions.ActionReleaseVersionMediaUpdate, canUpdateByGroup,
		)
		items[i].CanDelete = canDeleteByGroup
	}
	return nil
}
