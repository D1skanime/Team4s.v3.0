package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type rvmReorderItem struct {
	ID        int64 `json:"id"`
	SortOrder int   `json:"sort_order"`
}

type rvmReorderBody struct {
	Items []rvmReorderItem `json:"items"`
}

// ReorderReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media/reorder.
//
// The relation-meta and contributor-group resolution are bundled once for the whole request
// instead of loading each relation and each group per image: the metas are fetched with one
// batched loader, the contributor groups with a second batched loader, and each distinct group
// permission is evaluated exactly once (memoized in groupAllowed). The authorization decision per
// relation is delegated to the shared evaluateReleaseVersionMediaRelationMutation helper so the
// ownership gate and permission gate stay identical to the per-item PATCH/DELETE path.
func (h *AdminContentHandler) ReorderReleaseVersionMedia(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaReorder, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.reorder.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaReorder, result)
		writePermissionDenied(c, result)
		return
	}

	var body rvmReorderBody
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "items array fehlt oder leer"}})
		return
	}

	reorderItems := make([]repository.ReleaseVersionMediaReorderItem, len(body.Items))
	relationIDs := make([]int64, len(body.Items))
	seenIDs := make(map[int64]struct{}, len(body.Items))
	seenOrders := make(map[int]struct{}, len(body.Items))
	for i, item := range body.Items {
		if item.ID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
			return
		}
		if item.SortOrder < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "sort_order muss nicht-negativ sein"}})
			return
		}
		if _, exists := seenIDs[item.ID]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "relation darf nicht doppelt vorkommen"}})
			return
		}
		if _, exists := seenOrders[item.SortOrder]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "sort_order darf nicht doppelt vorkommen"}})
			return
		}
		seenIDs[item.ID] = struct{}{}
		seenOrders[item.SortOrder] = struct{}{}
		reorderItems[i] = repository.ReleaseVersionMediaReorderItem{
			RelationID: item.ID,
			SortOrder:  item.SortOrder,
		}
		relationIDs[i] = item.ID
	}

	if err := h.mediaRepo.ValidateReleaseVersionMediaOwnership(c.Request.Context(), versionID, relationIDs); err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere relationen gehoeren nicht zu dieser release version"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht validiert werden.")
		return
	}
	currentItems, err := h.mediaRepo.ListReleaseVersionMedia(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktuelle Medienreihenfolge konnte nicht geladen werden.")
		return
	}
	if len(currentItems) != len(reorderItems) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "die vollständige medienliste ist erforderlich"}})
		return
	}
	currentIDs := make(map[int64]struct{}, len(currentItems))
	for _, item := range currentItems {
		currentIDs[item.ID] = struct{}{}
	}
	for _, relationID := range relationIDs {
		if _, exists := currentIDs[relationID]; !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere relationen gehoeren nicht zu dieser release version"}})
			return
		}
	}
	// The server owns the canonical spacing. Keep the request field for compatibility,
	// but never persist client-chosen gaps or ordering values.
	for i := range reorderItems {
		reorderItems[i].SortOrder = (i + 1) * 10
	}

	// Metas aller Relationen in einem Zug laden statt pro Bild.
	metas, err := h.mediaRepo.ListReleaseVersionMediaRelationMetas(c.Request.Context(), relationIDs)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht validiert werden.")
		return
	}
	// Verhaltensgarantie: eine fehlende Meta ergibt dieselbe 404 wie der fruehere per-Bild
	// ErrNotFound-Zweig. Nach der Ownership-Validierung ist das nur eine defensive Absicherung.
	if len(metas) != len(relationIDs) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere relationen gehoeren nicht zu dieser release version"}})
		return
	}
	uploadedByByRelation := make(map[int64]*int64, len(metas))
	for i := range metas {
		uploadedByByRelation[metas[i].RelationID] = metas[i].UploadedByUserID
	}

	// Platform-Admins ueberspringen die Gruppen-Aufloesung genau wie der Einzelpfad, damit keine
	// zusaetzlichen Gruppen-Queries laufen, die es zuvor nicht gab.
	platformBypass := actor.IsPlatformAdmin || result.ReasonCode == permissions.ReasonPlatformAdmin

	groupsByRelation := map[int64][]int64{}
	if !platformBypass {
		groupsByRelation, err = h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsByRelation(c.Request.Context(), relationIDs)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht validiert werden.")
			return
		}
	}

	// Pro eindeutiger Gruppe wird die Permission genau einmal aufgeloest und memoisiert.
	groupAllowed := make(map[int64]bool)

	for _, relationID := range relationIDs {
		anyGroupAllowed := false
		if !platformBypass {
			for _, groupID := range groupsByRelation[relationID] {
				allowed, seen := groupAllowed[groupID]
				if !seen {
					groupResult, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, groupID)
					if err != nil {
						writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht validiert werden.")
						return
					}
					allowed = groupResult.Allowed
					groupAllowed[groupID] = allowed
				}
				if allowed {
					anyGroupAllowed = true
					break
				}
			}
		}

		canMutate := evaluateReleaseVersionMediaRelationMutation(
			actor, result, uploadedByByRelation[relationID], identity.UserID,
			permissions.ActionReleaseVersionMediaReorder, anyGroupAllowed,
		)
		if !canMutate {
			ownerResult := releaseVersionMediaOwnerMismatchResult()
			auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.reorder.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaReorder, ownerResult)
			writePermissionDenied(c, ownerResult)
			return
		}
	}

	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if err := h.mediaRepo.ReorderReleaseVersionMedia(c.Request.Context(), tx, reorderItems); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Reorder fehlgeschlagen.")
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
			EventType:         "release_version_media.reordered",
			TargetType:        "release_version",
			TargetID:          &versionID,
			Action:            string(permissions.ActionReleaseVersionMediaReorder),
			Outcome:           "allowed",
			Payload:           map[string]any{"items": len(body.Items)},
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
