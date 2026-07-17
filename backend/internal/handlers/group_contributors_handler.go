package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// GroupPublicHandler verwaltet öffentliche HTTP-Endpunkte für Gruppen-Projektions-Daten.
// Diese Routen erfordern keine Authentifizierung.
type GroupPublicHandler struct {
	contributorsRepo  *repository.GroupContributorsRepository
	themesRepo        *repository.GroupThemesRepository
	mediaRepo         *repository.GroupReleaseMediaRepository
	notesRepo         *repository.FansubNotesRepository
	releaseDetailRepo *repository.ReleaseDetailPublicRepository
	groupReleasesRepo *repository.GroupRepository
}

// NewGroupPublicHandler erstellt einen neuen GroupPublicHandler.
func NewGroupPublicHandler(
	contributorsRepo *repository.GroupContributorsRepository,
	themesRepo *repository.GroupThemesRepository,
	mediaRepo *repository.GroupReleaseMediaRepository,
	notesRepo *repository.FansubNotesRepository,
) *GroupPublicHandler {
	return &GroupPublicHandler{
		contributorsRepo: contributorsRepo,
		themesRepo:       themesRepo,
		mediaRepo:        mediaRepo,
		notesRepo:        notesRepo,
	}
}

// WithReleaseDetailRepo haengt das ReleaseDetailPublicRepository (AO4-02) an,
// ohne die bestehende Konstruktor-Signatur zu aendern (vermeidet Aufruf-Churn
// an allen bisherigen NewGroupPublicHandler-Call-Sites).
func (h *GroupPublicHandler) WithReleaseDetailRepo(repo *repository.ReleaseDetailPublicRepository) *GroupPublicHandler {
	h.releaseDetailRepo = repo
	return h
}

// WithGroupReleasesRepo haengt das GroupRepository an (fuer die additive Cursor-
// Release-Liste, AO4-03), analog zu WithReleaseDetailRepo — vermeidet Aufruf-Churn
// an bisherigen NewGroupPublicHandler-Call-Sites.
func (h *GroupPublicHandler) WithGroupReleasesRepo(repo *repository.GroupRepository) *GroupPublicHandler {
	h.groupReleasesRepo = repo
	return h
}

// parseCursorLimitQuery liest den optionalen limit-Query-Parameter (AO4-03/AO4-24).
// Fehlende oder ungueltige Werte liefern 0 — das Repository setzt dafuer per
// clampCursorLimit den Default und deckelt gegen Missbrauch (MaxCursorPageLimit).
func parseCursorLimitQuery(c *gin.Context) int {
	raw := c.Query("limit")
	if raw == "" {
		return 0
	}
	limit, err := strconv.Atoi(raw)
	if err != nil || limit < 0 {
		return 0
	}
	return limit
}

// GetGroupContributors handles GET /api/v1/anime/:id/group/:groupId/contributors
// Gibt projektspezifische Mitwirkende zurück (Team-Beteiligte + Externe Mitwirkende).
func (h *GroupPublicHandler) GetGroupContributors(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	response, err := h.contributorsRepo.GetProjectContributors(c.Request.Context(), animeID, groupID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetGroupThemes handles GET /api/v1/anime/:id/group/:groupId/themes
// Gibt öffentliche Themes (OP/ED/Middle) zurück, die mit dieser Gruppe+Anime verknüpft sind.
func (h *GroupPublicHandler) GetGroupThemes(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	response, err := h.themesRepo.GetPublicGroupThemes(c.Request.Context(), animeID, groupID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetGroupReleaseMedia handles GET /api/v1/anime/:id/group/:groupId/release-media
// Gibt öffentliche Release-Version-Medien zurück (nur freigegebene Medien, status='ready').
func (h *GroupPublicHandler) GetGroupReleaseMedia(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	response, err := h.mediaRepo.GetPublicReleaseMedia(c.Request.Context(), animeID, groupID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetGroupProjectNote handles GET /api/v1/anime/:id/group/:groupId/project-note
// and returns only public, published anime_fansub_project_notes content.
func (h *GroupPublicHandler) GetGroupProjectNote(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	note, err := h.notesRepo.GetPublicAnimeFansubProjectNote(c.Request.Context(), animeID, groupID)
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) || errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusOK, repository.PublicAnimeFansubProjectNoteResponse{Data: nil})
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, repository.PublicAnimeFansubProjectNoteResponse{Data: note})
}

// GetGroupReleaseDetail handles GET /api/v1/anime/:id/group/:groupId/releases/:releaseVersionId
// Gibt das aggregierte öffentliche Release-Detail zurück (Kopf-Kennzahlen, Beteiligte,
// Bilder, Texte) für eine release_version_id (AO4-02). Aggregationseinheit ist
// release_versions — NICHT fansub_releases.
func (h *GroupPublicHandler) GetGroupReleaseDetail(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}
	releaseVersionID, err := parseAnimeID(c.Param("releaseVersionId"))
	if err != nil {
		badRequest(c, "ungültige release-version-id")
		return
	}

	if h.releaseDetailRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	detail, err := h.releaseDetailRepo.GetPublicReleaseDetail(c.Request.Context(), animeID, groupID, releaseVersionID)
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "release nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, detail)
}

// GetGroupReleaseListCursor handles GET /api/v1/anime/:id/group/:groupId/release-list
// Liefert eine Seek-paginierte (Cursor-)Seite der vollstaendigen Release-Liste
// (AO4-03/AO4-24), additiv neben der Offset-Route GetGroupReleases — die alte
// Offset-`releases/page.tsx` bleibt unveraendert und ungestoert.
func (h *GroupPublicHandler) GetGroupReleaseListCursor(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}

	if h.groupReleasesRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	filter, err := parseGroupReleasesFilter(c)
	if err != nil {
		badRequest(c, "ungültige filter parameter")
		return
	}

	cursor := c.Query("cursor")
	limit := parseCursorLimitQuery(c)

	page, err := h.groupReleasesRepo.GetGroupReleasesCursor(c.Request.Context(), animeID, groupID, filter, cursor, limit)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, page)
}

// GetGroupReleaseImages handles
// GET /api/v1/anime/:id/group/:groupId/releases/:releaseVersionId/images
// Liefert eine Seek-paginierte (Cursor-)Seite der vollstaendigen Bildergalerie
// einer Release-Version (AO4-03/AO4-18/AO4-24), additiv neben dem vollstaendig
// ladenden GetGroupReleaseDetail. Ownership wird fuer jedes Nachladen erneut
// gegen animeID/groupID/releaseVersionID geprueft.
func (h *GroupPublicHandler) GetGroupReleaseImages(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}
	releaseVersionID, err := parseAnimeID(c.Param("releaseVersionId"))
	if err != nil {
		badRequest(c, "ungültige release-version-id")
		return
	}

	if h.releaseDetailRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	cursor := c.Query("cursor")
	limit := parseCursorLimitQuery(c)
	category := c.Query("category")

	page, err := h.releaseDetailRepo.ListReleaseVersionImagesCursor(c.Request.Context(), animeID, groupID, releaseVersionID, category, cursor, limit)
	if errors.Is(err, repository.ErrValidation) {
		badRequest(c, "ungültige bildkategorie")
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "release nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, page)
}

// GetGroupReleaseNotes handles
// GET /api/v1/anime/:id/group/:groupId/releases/:releaseVersionId/notes
// Liefert eine Seek-paginierte (Cursor-)Seite der vollstaendigen Textliste einer
// Release-Version (AO4-03/AO4-19/AO4-24), additiv neben dem vollstaendig ladenden
// GetGroupReleaseDetail. Kein zusaetzlicher Ownership-Check gegen animeID/groupID
// hier — die initiale volle Detailseite validiert das bereits.
func (h *GroupPublicHandler) GetGroupReleaseNotes(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}
	groupID, err := parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return
	}
	releaseVersionID, err := parseAnimeID(c.Param("releaseVersionId"))
	if err != nil {
		badRequest(c, "ungültige release-version-id")
		return
	}

	if h.releaseDetailRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	cursor := c.Query("cursor")
	limit := parseCursorLimitQuery(c)

	page, err := h.releaseDetailRepo.ListReleaseVersionNotesCursor(c.Request.Context(), animeID, groupID, releaseVersionID, cursor, limit)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
			return
		}
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, page)
}
