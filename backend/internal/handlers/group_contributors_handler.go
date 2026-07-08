package handlers

import (
	"errors"
	"net/http"

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
