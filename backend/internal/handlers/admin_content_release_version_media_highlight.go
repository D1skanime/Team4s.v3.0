package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func parseReleaseVersionMediaMutationIDs(c *gin.Context) (int64, int64, bool) {
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return 0, 0, false
	}
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return 0, 0, false
	}
	return versionID, relationID, true
}

func (h *AdminContentHandler) SetReleaseVersionMediaHighlight(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil || h.permissionSvc == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, relationID, ok := parseReleaseVersionMediaMutationIDs(c)
	if !ok {
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaHighlight, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Highlight-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		if h.auditLogRepo != nil {
			auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.highlight.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaHighlight, result)
		}
		writePermissionDenied(c, result)
		return
	}

	var raw map[string]json.RawMessage
	if err := c.ShouldBindJSON(&raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültiger highlight body"}})
		return
	}
	highlightedRaw, exists := raw["highlighted"]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "highlighted muss gesetzt werden"}})
		return
	}
	var highlighted bool
	if err := json.Unmarshal(highlightedRaw, &highlighted); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "highlighted muss boolean sein"}})
		return
	}
	highlightOrder := 0
	if orderRaw, exists := raw["highlight_order"]; exists {
		if err := json.Unmarshal(orderRaw, &highlightOrder); err != nil || highlightOrder < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "highlight_order muss eine nicht-negative Zahl sein"}})
			return
		}
	}

	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if highlighted {
		err = h.mediaRepo.UpsertReleaseVersionMediaHighlight(c.Request.Context(), tx, versionID, relationID, highlightOrder)
	} else {
		err = h.mediaRepo.RemoveReleaseVersionMediaHighlight(c.Request.Context(), tx, versionID, relationID)
	}
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "medium gehört nicht zu dieser release version"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Highlight konnte nicht gespeichert werden.")
		return
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	if h.auditLogRepo != nil {
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &identity.AppUserID,
			ActorLegacyUserID: &identity.UserID,
			EventType:         "release_version_media.highlight.updated",
			TargetType:        "release_version_media",
			TargetID:          &relationID,
			Action:            string(permissions.ActionReleaseVersionMediaHighlight),
			Outcome:           "allowed",
			Payload:           map[string]any{"version_id": versionID, "highlighted": highlighted, "highlight_order": highlightOrder},
		})
	}

	response := gin.H{"status": "updated", "is_highlight": highlighted}
	if highlighted {
		response["highlight_order"] = highlightOrder
	}
	c.JSON(http.StatusOK, response)
}

func (h *AdminContentHandler) ReorderReleaseVersionMediaHighlights(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil || h.permissionSvc == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaHighlight, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Highlight-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		if h.auditLogRepo != nil {
			auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.highlight_reorder.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaHighlight, result)
		}
		writePermissionDenied(c, result)
		return
	}

	var raw struct {
		Items []map[string]json.RawMessage
	}
	if err := c.ShouldBindJSON(&raw); err != nil || len(raw.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "items array fehlt oder leer"}})
		return
	}

	seen := make(map[int64]struct{}, len(raw.Items))
	items := make([]repository.ReleaseVersionMediaHighlightReorderItem, len(raw.Items))
	for i, entry := range raw.Items {
		var id int64
		var highlightOrder int
		if err := json.Unmarshal(entry["id"], &id); err != nil || id <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige highlight relation"}})
			return
		}
		if err := json.Unmarshal(entry["highlight_order"], &highlightOrder); err != nil || highlightOrder < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige highlight order"}})
			return
		}
		if _, exists := seen[id]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "highlight relation darf nicht doppelt vorkommen"}})
			return
		}
		seen[id] = struct{}{}
		items[i] = repository.ReleaseVersionMediaHighlightReorderItem{RelationID: id, HighlightOrder: highlightOrder}
	}

	currentItems, err := h.mediaRepo.ListReleaseVersionMedia(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Highlights konnten nicht geladen werden.")
		return
	}
	currentHighlights := make(map[int64]struct{})
	for _, item := range currentItems {
		if item.IsHighlight {
			currentHighlights[item.ID] = struct{}{}
		}
	}
	for _, item := range items {
		if _, exists := currentHighlights[item.RelationID]; !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "highlight relation gehört nicht zu dieser release version"}})
			return
		}
	}
	if len(seen) != len(currentHighlights) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "die vollständige highlight-liste ist erforderlich"}})
		return
	}

	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if err := h.mediaRepo.ReorderReleaseVersionMediaHighlights(c.Request.Context(), tx, versionID, items); err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "highlight relation gehört nicht zu dieser release version"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Highlight-Reorder fehlgeschlagen.")
		return
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	if h.auditLogRepo != nil {
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &identity.AppUserID,
			ActorLegacyUserID: &identity.UserID,
			EventType:         "release_version_media.highlight_reordered",
			TargetType:        "release_version",
			TargetID:          &versionID,
			Action:            string(permissions.ActionReleaseVersionMediaHighlight),
			Outcome:           "allowed",
			Payload:           map[string]any{"highlights": len(items)},
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
