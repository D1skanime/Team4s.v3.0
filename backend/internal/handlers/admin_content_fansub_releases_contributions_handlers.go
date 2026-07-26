package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type replaceReleaseCrewRequest struct {
	Rows []replaceReleaseCrewRow `json:"rows"`
}

type replaceReleaseCrewRow struct {
	MemberID  int64    `json:"member_id"`
	RoleCodes []string `json:"role_codes"`
}

func releaseCrewResponseRows(rows []repository.ReleaseCrewRow) []repository.EffectiveContributionRow {
	result := make([]repository.EffectiveContributionRow, 0, len(rows))
	for _, row := range rows {
		result = append(result, repository.EffectiveContributionRow{
			ContributionID:  row.ContributionID,
			MemberID:        row.MemberID,
			MemberName:      row.MemberName,
			MemberAvatarURL: row.MemberAvatarURL,
			RoleCodes:       row.RoleCodes,
		})
	}
	return result
}

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

func (h *AdminContentHandler) ReplaceEffectiveContributionsForVersion(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige Versions-ID")
		return
	}
	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}
	fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
	if err != nil || fansubGroupID <= 0 {
		badRequest(c, "fansub_group_id fehlt oder ist ungültig")
		return
	}
	var req replaceReleaseCrewRequest
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil || req.Rows == nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}
	rows := make([]repository.ReleaseCrewRow, 0, len(req.Rows))
	for _, row := range req.Rows {
		if row.MemberID <= 0 || len(row.RoleCodes) == 0 {
			badRequest(c, "Mitglied und mindestens eine Rolle sind erforderlich")
			return
		}
		rows = append(rows, repository.ReleaseCrewRow{MemberID: row.MemberID, RoleCodes: row.RoleCodes})
	}
	if h.releaseCrewSvc == nil {
		internalError(c, "interner Serverfehler")
		return
	}
	snapshot, err := h.releaseCrewSvc.Replace(c.Request.Context(), services.ReleaseCrewReplaceCommand{
		ReleaseVersionID: versionID, FansubGroupID: fansubGroupID,
		ActorAppUserID: identity.AppUserID, Rows: rows,
	})
	if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrValidation) {
		notFound(c, "Release-Besetzung nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": releaseCrewResponseRows(snapshot.Rows),
		"meta": gin.H{"snapshot_mode": snapshot.Mode},
	})
}

// GetEffectiveContributionsForVersion verarbeitet
// GET /api/v1/admin/release-versions/:versionId/contributions/effective?fansub_group_id=N
// Gibt ausschließlich den gespeicherten Release-Snapshot oder den expliziten
// Zustand "uninitialized" zurück. Ein Projektteam-Fallback findet nicht statt.
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
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Release-Besetzung nicht gefunden")
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Mitwirkende konnten nicht geladen werden.")
		return
	}

	// nil-Ergebnis: leere Antwort mit Defaults zurückgeben
	if result == nil {
		writeInternalErrorResponse(
			c,
			"interner serverfehler",
			errors.New("stored release crew snapshot result is nil"),
			"Mitwirkende konnten nicht geladen werden.",
		)
		return
	}

	rows := result.Rows
	if rows == nil {
		rows = []repository.EffectiveContributionRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": rows,
		"meta": gin.H{"snapshot_mode": result.SnapshotMode},
	})
}
