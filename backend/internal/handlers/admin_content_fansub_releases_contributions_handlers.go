package handlers

import (
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// requireReleaseVersionViewAccess kapselt die Berechtigungsprüfung für Release-Version-Lesezugriff.
// Gibt die versionID zurück wenn die Prüfung erfolgreich ist, sonst schreibt es die Fehlerantwort.
func (h *AdminContentHandler) requireReleaseVersionViewAccess(c *gin.Context) (int64, bool) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return 0, false
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return 0, false
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Version-Berechtigung konnte nicht geprüft werden.")
		return 0, false
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return 0, false
	}

	return versionID, true
}

// GetEffectiveContributionsForVersion verarbeitet
// GET /api/v1/admin/release-versions/:versionId/contributions/effective?fansub_group_id=N
// Gibt den aufgelösten Mitwirkenden-Satz zurück (versions-spezifischer Override oder Projekt-Default).
func (h *AdminContentHandler) GetEffectiveContributionsForVersion(c *gin.Context) {
	// IDOR-Mitigation (T-83-IDOR): Berechtigung VOR Datenabfrage prüfen
	versionID, ok := h.requireReleaseVersionViewAccess(c)
	if !ok {
		return
	}

	fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
	if err != nil || fansubGroupID <= 0 {
		badRequest(c, "fansub_group_id fehlt oder ungültig")
		return
	}

	result, err := h.fansubReleasesContributionsRepo.ListEffectiveContributionsForVersion(
		c.Request.Context(), versionID, fansubGroupID,
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Mitwirkende konnten nicht geladen werden.")
		return
	}

	// nil-Ergebnis: leere Antwort mit Defaults zurückgeben
	if result == nil {
		c.JSON(http.StatusOK, gin.H{
			"data": []repository.EffectiveContributionRow{},
			"meta": gin.H{"is_override": false, "source": "anime_default"},
		})
		return
	}

	rows := result.Rows
	if rows == nil {
		rows = []repository.EffectiveContributionRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": rows,
		"meta": gin.H{"is_override": result.IsOverride, "source": result.Source},
	})
}
