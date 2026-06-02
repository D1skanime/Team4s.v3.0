package handlers

// Dropdown-Lookup-Endpunkt fuer das Leader-Contribution-Formular (Phase 67-04).
// Liefert die gruppen-gefilterten Release-Versionen eines Anime als Auswahloptionen.
// Eigene Datei, damit fansub_anime_contributions_handler.go unter dem
// 450-Zeilen-Limit (CLAUDE.md) bleibt.
//
// Sicherheit (T-67-04-AUTH): authMiddleware (in main.go vorgeschaltet) +
// CanForFansubGroup(MembersView) — kein ungeschuetzter Lookup.

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

// ListGroupReleaseVersions gibt die Release-Versionen zurueck, an denen die
// gewaehlte Fansub-Gruppe fuer das gegebene Anime beteiligt ist. Dient als
// Datenquelle fuer das optionale, gruppen-gefilterte Release-Version-Dropdown.
// GET /admin/fansubs/:id/anime/:animeId/release-versions
func (h *FansubAnimeContributionsHandler) ListGroupReleaseVersions(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.release_versions.denied", &fansubID, "anime_contribution", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	items, err := h.contributionsRepo.ListGroupReleaseVersionsForAnime(c.Request.Context(), fansubID, animeID)
	if err != nil {
		log.Printf("anime contributions release-versions list: repo error (fansub_id=%d, anime_id=%d): %v", fansubID, animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
