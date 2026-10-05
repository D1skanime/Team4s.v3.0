package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const (
	rvmMaxFileSizeBytes  = 15 * 1024 * 1024 // 15 MB
	rvmMaxFilesPerUpload = 20
	rvmMaxImageWidth     = 8000
	rvmMaxImageHeight    = 8000
	rvmMaxGIFFrames      = 300
	rvmThumbnailWidth    = 400
)

var rvmAllowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

var rvmValidCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
	"fun_outtake":         true,
	"other":               true,
}

var rvmPreviewAllowedCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
}

func parseOptionalCaptionField(rawBody map[string]interface{}) (*string, bool, error) {
	return parseOptionalRVMStringField(rawBody, "caption")
}

func parseOptionalRVMStringField(rawBody map[string]interface{}, field string) (*string, bool, error) {
	v, ok := rawBody[field]
	if !ok {
		return nil, false, nil
	}
	if v == nil {
		return nil, true, nil
	}
	s, ok := v.(string)
	if !ok {
		return nil, false, fmt.Errorf("%s muss string oder null sein", field)
	}
	return &s, true, nil
}

// parseOptionalRVMTitleField keeps PATCH missing/null semantics and shares the string
// parser with caption. Titles are plain text owned by the media relation.
func parseOptionalRVMTitleField(rawBody map[string]interface{}) (*string, bool, error) {
	value, present, err := parseOptionalRVMStringField(rawBody, "title")
	if err != nil {
		return nil, false, fmt.Errorf("Titel muss Text oder null sein.")
	}
	if !present || value == nil {
		return value, present, nil
	}
	trimmed := strings.TrimSpace(*value)
	if utf8.RuneCountInString(trimmed) > 200 {
		return nil, false, fmt.Errorf("Titel darf höchstens 200 Zeichen enthalten.")
	}
	if trimmed == "" {
		return nil, true, nil
	}
	return &trimmed, true, nil
}

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

// ListReleaseVersionMedia handles GET /api/v1/admin/release-versions/:versionId/media.
// Returns scoped, non-deleted media for a release version with populated URLs.
func (h *AdminContentHandler) ListReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	items, err := h.mediaRepo.ListReleaseVersionMedia(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Liste konnte nicht geladen werden.")
		return
	}
	if items == nil {
		items = make([]repository.ReleaseVersionMediaItem, 0)
	}
	items = filterReleaseVersionMediaItemsForActor(items, identity.UserID, result)

	updateResult, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if err := h.annotateReleaseVersionMediaItemPermissionsBatch(c, actor, identity.UserID, items, updateResult); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
	}

	storyOrder, err := h.mediaRepo.ListReleaseVersionStoryOrder(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Reihenfolge konnte nicht geladen werden.")
		return
	}
	storyOrderResponse := make([]gin.H, 0, len(storyOrder))
	for _, item := range storyOrder {
		entry := gin.H{
			"type":       string(item.ItemType),
			"sort_order": item.SortOrder,
		}
		if item.ReleaseVersionMediaID != nil {
			entry["media_id"] = *item.ReleaseVersionMediaID
		}
		if item.ThemeSegmentID != nil {
			entry["theme_segment_id"] = *item.ThemeSegmentID
		}
		storyOrderResponse = append(storyOrderResponse, entry)
	}

	c.JSON(http.StatusOK, gin.H{"data": items, "story_order": storyOrderResponse})
}

func (h *AdminContentHandler) loadReleaseVersionMediaResponseItem(
	ctx *gin.Context,
	actor permissions.Actor,
	currentLegacyUserID int64,
	versionID, relationID int64,
) (repository.ReleaseVersionMediaItem, error) {
	items, err := h.mediaRepo.ListReleaseVersionMedia(ctx.Request.Context(), versionID)
	if err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}
	updateResult, err := h.permissionSvc.CanForReleaseVersion(ctx.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}
	if err := h.annotateReleaseVersionMediaItemPermissions(ctx, actor, currentLegacyUserID, items, updateResult); err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
		if items[i].ID == relationID {
			return items[i], nil
		}
	}

	return repository.ReleaseVersionMediaItem{}, repository.ErrNotFound
}

// PatchReleaseVersionMedia handles PATCH /api/v1/admin/release-versions/:versionId/media/:relationId.
func (h *AdminContentHandler) PatchReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersionMedia(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, relationID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}

	relationMeta, err := h.mediaRepo.GetReleaseVersionMediaRelation(c.Request.Context(), relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geladen werden.")
		return
	}
	if relationMeta.ReleaseVersionID != versionID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation gehoert nicht zu dieser release version"}})
		return
	}
	var rawBody map[string]interface{}
	if err := c.ShouldBindJSON(&rawBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige json body"}})
		return
	}
	title, titleSet, err := parseOptionalRVMTitleField(rawBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	caption, captionSet, err := parseOptionalCaptionField(rawBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	categoryPatch := parseRVMCategoryPatchField(rawBody)
	if categoryPatch.Invalid {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "ungültige kategorie", "error_code": "INVALID_CATEGORY"}})
		return
	}
	var isPreviewCandidate *bool
	if v, ok := rawBody["is_preview_candidate"]; ok {
		if b, ok := v.(bool); ok {
			isPreviewCandidate = &b
		}
	}

	var expectedRevision *int64
	if rawRevision, ok := rawBody["source_revision"]; ok {
		number, numberOK := rawRevision.(float64)
		revision := int64(number)
		if !numberOK || number != float64(revision) || revision <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{
				"message":    "Ungültige Source-Revision.",
				"error_code": "INVALID_SOURCE_REVISION",
			}})
			return
		}
		expectedRevision = &revision
	}

	previewOnly := isPreviewCandidate != nil && !titleSet && !captionSet && categoryPatch.Category == nil
	authorizationAction := permissions.ActionReleaseVersionMediaUpdate
	authorizationResult := result
	if previewOnly {
		authorizationAction = permissions.ActionReleaseVersionMediaHighlight
		authorizationResult, err = h.permissionSvc.CanForReleaseVersionMedia(c.Request.Context(), actor, authorizationAction, relationID)
		if err != nil {
			writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
			return
		}
	}
	if !authorizationResult.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, authorizationAction, authorizationResult)
		writePermissionDenied(c, authorizationResult)
		return
	}
	canMutate, err := h.canMutateReleaseVersionMediaRelation(
		c, actor, relationID, relationMeta.UploadedByUserID, identity.UserID,
		authorizationAction, authorizationResult,
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}
	if !canMutate {
		ownerResult := releaseVersionMediaOwnerMismatchResult()
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, authorizationAction, ownerResult)
		writePermissionDenied(c, ownerResult)
		return
	}

	if rvmPreviewGuardBlocked(isPreviewCandidate, relationMeta.IsPreviewCandidate, relationMeta.Category, categoryPatch.Category) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "vorschaubild nicht erlaubt für diese kategorie",
			"error_code": "PREVIEW_NOT_ALLOWED_FOR_CATEGORY",
		}})
		return
	}

	patchInput := repository.ReleaseVersionMediaPatchInput{
		Title:              title,
		TitleSet:           titleSet,
		Caption:            caption,
		CaptionSet:         captionSet,
		IsPreviewCandidate: isPreviewCandidate,
		Category:           categoryPatch.Category,
	}

	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if isPreviewCandidate != nil && *isPreviewCandidate {
		if err := h.mediaRepo.ClearPreviewCandidateForVersion(c.Request.Context(), tx, versionID, relationID); err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Preview-Flag konnte nicht zurückgesetzt werden.")
			return
		}
	}
	if err := h.mediaRepo.PatchReleaseVersionMedia(c.Request.Context(), tx, relationID, patchInput); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Patch fehlgeschlagen.")
		return
	}
	if !previewOnly {
		if _, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
			c.Request.Context(),
			repository.ReleaseReviewSubmissionInput{
				SourceID:         relationID,
				ActorAppUserID:   identity.AppUserID,
				ExpectedRevision: expectedRevision,
				LastActivityAt:   time.Now().UTC(),
			},
		); err != nil {
			if errors.Is(err, repository.ErrConflict) {
				c.JSON(http.StatusConflict, gin.H{"error": gin.H{
					"message":    "Das Medium wurde zwischenzeitlich geändert.",
					"error_code": "SOURCE_REVISION_CONFLICT",
				}})
				return
			}
			if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrValidation) {
				c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
					"message":    "Die Einreicher-Zuordnung ist nicht mehr eindeutig.",
					"error_code": "SOURCE_ATTRIBUTION_INVALID",
				}})
				return
			}
			writeInternalErrorResponse(c, "interner serverfehler", err, "Review-Lifecycle konnte nicht aktualisiert werden.")
			return
		}
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	item, err := h.loadReleaseVersionMediaResponseItem(c, actor, identity.UserID, versionID, relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisierte Relation konnte nicht geladen werden.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.updated",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaUpdate),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID},
	})

	c.JSON(http.StatusOK, item)
}

// DeleteReleaseVersionMedia handles DELETE /api/v1/admin/release-versions/:versionId/media/:relationId.
func (h *AdminContentHandler) DeleteReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersionMediaDelete(c.Request.Context(), actor, relationID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.delete.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaDelete, result)
		writePermissionDenied(c, result)
		return
	}

	relationMeta, err := h.mediaRepo.GetReleaseVersionMediaRelation(c.Request.Context(), relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geladen werden.")
		return
	}
	if relationMeta.ReleaseVersionID != versionID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation gehoert nicht zu dieser release version"}})
		return
	}
	canMutate, err := h.canMutateReleaseVersionMediaRelation(
		c, actor, relationID, relationMeta.UploadedByUserID, identity.UserID,
		permissions.ActionReleaseVersionMediaDelete, result,
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}
	if !canMutate {
		ownerResult := releaseVersionMediaOwnerMismatchResult()
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.delete.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaDelete, ownerResult)
		writePermissionDenied(c, ownerResult)
		return
	}

	if err := h.mediaRepo.SoftDeleteReleaseVersionMedia(c.Request.Context(), relationID, identity.UserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "löschen fehlgeschlagen.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.deleted",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaDelete),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID},
	})

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

type releaseVersionCapabilitiesResponse struct {
	CanViewMedia        bool `json:"can_view_media"`
	CanUploadMedia      bool `json:"can_upload_media"`
	CanUpdateMedia      bool `json:"can_update_media"`
	CanDeleteMedia      bool `json:"can_delete_media"`
	CanDeleteOwnMedia   bool `json:"can_delete_own_media"`
	CanReorderMedia     bool `json:"can_reorder_media"`
	CanManageHighlights bool `json:"can_manage_highlights"`
	CanEditNotes        bool `json:"can_edit_notes"`
	CanManageSegments   bool `json:"can_manage_segments"`
	CanEditMetadata     bool `json:"can_edit_metadata"`
}

func (h *AdminContentHandler) GetReleaseVersionCapabilities(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	canViewVersion, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUploadMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUpdateMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canDeleteMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaDelete, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canReorderMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaReorder, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageHighlights, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaHighlight, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditNotes, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageSegments, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	canEditMetadata, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMetadataUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	if !canViewVersion.Allowed && !canViewMedia.Allowed && !canUploadMedia.Allowed && !canUpdateMedia.Allowed && !canDeleteMedia.Allowed && !canReorderMedia.Allowed && !canManageHighlights.Allowed && !canEditNotes.Allowed && !canManageSegments.Allowed && !canEditMetadata.Allowed {
		writePermissionDenied(c, canViewVersion)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": releaseVersionCapabilitiesResponse{
		CanViewMedia:        canViewMedia.Allowed,
		CanUploadMedia:      canUploadMedia.Allowed,
		CanUpdateMedia:      canUpdateMedia.Allowed,
		CanDeleteMedia:      canDeleteMedia.Allowed,
		CanDeleteOwnMedia:   releaseVersionMediaCanDeleteOwn(canViewMedia, canUploadMedia, canUpdateMedia, canDeleteMedia),
		CanReorderMedia:     canReorderMedia.Allowed,
		CanManageHighlights: canManageHighlights.Allowed,
		CanEditNotes:        canEditNotes.Allowed,
		CanManageSegments:   canManageSegments.Allowed,
		CanEditMetadata:     canEditMetadata.Allowed,
	}})
}
