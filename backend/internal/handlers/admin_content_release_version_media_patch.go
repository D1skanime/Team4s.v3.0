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
	if !previewOnly && isReleaseVersionMediaUploader(relationMeta.UploadedByUserID, identity.UserID) {
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
