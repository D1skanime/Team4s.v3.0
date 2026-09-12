package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminAnimeSegmentContributorsRequest ist der Body fuer
// PUT /api/v1/admin/anime/:id/segments/:segmentId/contributors (Phase 156, Plan
// 156-13, GAP-01). Der Admin waehlt NUR Personen -- niemals deren Rolle, die kommt
// live aus dem Origin-Release (156-UAT.md Auftragspunkt 6/7/20).
type adminAnimeSegmentContributorsRequest struct {
	MemberIDs []int64 `json:"member_ids"`
}

// resolveSegmentPermissionReleaseVersionID liefert die Release-Version, gegen die
// requireSegmentManage geprueft wird: die aktuelle Origin, falls gesetzt, sonst die
// erste zugewiesene Release-Version, sonst 0 (requireSegmentManage lehnt 0 selbst mit
// 400 ab, ausser fuer Platform-Admins) -- identisches Fallback-Muster wie jeder andere
// Segment-Schreibpfad, keine neue/parallele Autorisierung (T-156-11/T-156-26).
func resolveSegmentPermissionReleaseVersionID(seg *models.AdminThemeSegment) int64 {
	if seg.OriginReleaseVersionID != nil {
		return *seg.OriginReleaseVersionID
	}
	if len(seg.AssignedReleaseVersionIDs) > 0 {
		return seg.AssignedReleaseVersionIDs[0]
	}
	return 0
}

// ListThemeSegmentContributors verarbeitet GET
// /api/v1/admin/anime/:id/segments/:segmentId/contributors. Laedt die Segment-
// Contributor-Kandidatenliste (jeder effektive Origin-Contributor mit aktueller Rolle
// und Auswahlstatus, T-156-25: dieselbe visibility-gegatete
// loadPublicEffectiveContributors-Aufloesung wie die oeffentliche Seite, keine
// separate, laxere Admin-Query) hinter derselben requireSegmentManage-Pruefung wie
// jeder andere Segment-Schreibpfad.
func (h *AdminContentHandler) ListThemeSegmentContributors(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, 0)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}

	if !h.requireSegmentManage(c, resolveSegmentPermissionReleaseVersionID(segment)) {
		return
	}

	candidates, err := h.themeRepo.ListThemeSegmentContributorCandidates(c.Request.Context(), segmentID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Contributor-Kandidaten konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": candidates, "origin_release_version_id": segment.OriginReleaseVersionID})
}

// SetAnimeSegmentContributors verarbeitet PUT
// /api/v1/admin/anime/:id/segments/:segmentId/contributors. Setzt die explizite
// Segment-Contributor-Auswahl (theme_segment_contributors, Plan 156-12) -- ein
// Segment ohne Origin lehnt jede Auswahl mit 409/segment_has_no_origin ab, ein
// referenzierter Nicht-Origin-Contributor mit 409/member_not_origin_contributor
// (T-156-26: die Repository-Validierung gegen die EFFEKTIVE Contributor-Aufloesung
// ist die eigentliche Autoritaet, keine client-gelieferte Rolle/Auswahl wird
// vertraut).
func (h *AdminContentHandler) SetAnimeSegmentContributors(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}

	var req adminAnimeSegmentContributorsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "member_ids ist erforderlich")
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, 0)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}

	if !h.requireSegmentManage(c, resolveSegmentPermissionReleaseVersionID(segment)) {
		return
	}

	if segment.OriginReleaseVersionID == nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "Segment hat keine Origin-Release-Version", "code": "segment_has_no_origin"}})
		return
	}

	if _, _, err := h.themeRepo.SetThemeSegmentContributors(c.Request.Context(), segmentID, req.MemberIDs); err != nil {
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "mindestens ein member_id ist kein Beitragender der Origin-Release-Version", "code": "member_not_origin_contributor"}})
			return
		}
		if errors.Is(err, repository.ErrValidation) {
			badRequest(c, "member_ids enthält ungültige oder doppelte Werte")
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
			return
		}
		log.Printf("admin anime segment contributors set: segment=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Contributor-Auswahl konnte nicht gespeichert werden.")
		return
	}

	reloadedSegment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, 0)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nach dem Speichern der Auswahl nicht neu geladen werden.")
		return
	}
	candidates, err := h.themeRepo.ListThemeSegmentContributorCandidates(c.Request.Context(), segmentID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Contributor-Kandidaten konnten nach dem Speichern nicht neu geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": reloadedSegment, "contributors": candidates})
}
