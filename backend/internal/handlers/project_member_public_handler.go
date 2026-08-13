package handlers

import (
	"context"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type projectMemberPublicLoader interface {
	HasMemberRelation(context.Context, int64, int64, int64) (bool, error)
	GetSummary(context.Context, int64, int64, int64) (*repository.ProjectMemberSummary, error)
	ListNotes(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberNote, *string, bool, error)
	ListMedia(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberMediaItem, *string, bool, error)
	ListReleases(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberRelease, *string, bool, error)
}

// ProjectMemberPublicHandler bedient die oeffentliche Projekt-Member-Seite (Phase 122):
// die kombinierte Read-View Member × Fansubgruppe × Anime. Alle Routen sind unauthenticated
// public (wie die uebrigen /anime/:id/group/:groupId/-Routen) und liefern nur oeffentliche Inhalte.
type ProjectMemberPublicHandler struct {
	accessResolver  publicMemberAccessResolver
	repo            projectMemberPublicLoader
	mediaStorageDir string
}

// NewProjectMemberPublicHandler erstellt einen neuen ProjectMemberPublicHandler.
func NewProjectMemberPublicHandler(
	accessResolver publicMemberAccessResolver,
	repo projectMemberPublicLoader,
	mediaStorageDir string,
) *ProjectMemberPublicHandler {
	return &ProjectMemberPublicHandler{accessResolver: accessResolver, repo: repo, mediaStorageDir: mediaStorageDir}
}

// buildMediaURL konvertiert einen Storage-Pfad in eine /media/...-Public-URL
// (identisch zu AdminContentHandler.buildRVMPublicURL).
func (h *ProjectMemberPublicHandler) buildMediaURL(storagePath string) string {
	if storagePath == "" {
		return ""
	}
	rel := strings.TrimPrefix(storagePath, h.mediaStorageDir)
	rel = strings.TrimPrefix(rel, "/")
	rel = strings.TrimPrefix(rel, "\\")
	rel = strings.ReplaceAll(rel, "\\", "/")
	return "/media/" + rel
}

// projectMemberCursorEnvelope ist der einheitliche Listen-Envelope (Brief 21).
type projectMemberCursorEnvelope struct {
	Items      interface{} `json:"items"`
	NextCursor *string     `json:"next_cursor"`
	HasMore    bool        `json:"has_more"`
}

// projectMemberMediaResponse ergaenzt das Repo-Item um die abgeleiteten Public-URLs.
// Thumbnail = 'thumb'-Variante (Galerie), Preview = 'original'-Variante (Media Viewer, Brief 18).
type projectMemberMediaResponse struct {
	repository.ProjectMemberMediaItem
	ThumbnailURL string `json:"thumbnail_url"`
	PreviewURL   string `json:"preview_url"`
}

// resolve parst anime-/group-id, autorisiert den Member und prüft erst danach die Projektbeziehung (D-10).
func (h *ProjectMemberPublicHandler) resolve(c *gin.Context) (animeID, groupID, memberID int64, ok bool) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return 0, 0, 0, false
	}
	groupID, err = parseGroupID(c.Param("groupId"))
	if err != nil {
		badRequest(c, "ungültige group-id")
		return 0, 0, 0, false
	}
	memberSlug := strings.TrimSpace(c.Param("memberSlug"))
	access, allowed := resolvePublicMemberAccess(c, h.accessResolver, memberSlug)
	if !allowed {
		return 0, 0, 0, false
	}
	exists, err := h.repo.HasMemberRelation(c.Request.Context(), animeID, groupID, access.MemberID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return 0, 0, 0, false
	}
	if !exists {
		writePublicMemberUnavailable(c)
		return 0, 0, 0, false
	}
	return animeID, groupID, access.MemberID, true
}

// GetSummary handles GET /api/v1/anime/:id/group/:groupId/members/:memberSlug
func (h *ProjectMemberPublicHandler) GetSummary(c *gin.Context) {
	animeID, groupID, memberID, ok := h.resolve(c)
	if !ok {
		return
	}
	summary, err := h.repo.GetSummary(c.Request.Context(), animeID, groupID, memberID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	// Avatar kommt aus media_assets.file_path (z. B. "media/profile/..."), NICHT aus media_files.path
	// wie die Release-Medien. Die Roh-Pfad wird — analog zu FansubMemberAvatar — im Frontend via
	// resolveApiUrl aufgeloest; kein buildMediaURL (das erzeugte ein doppeltes /media/).
	c.JSON(http.StatusOK, summary)
}

// GetNotes handles GET /api/v1/anime/:id/group/:groupId/members/:memberSlug/notes
func (h *ProjectMemberPublicHandler) GetNotes(c *gin.Context) {
	animeID, groupID, memberID, ok := h.resolve(c)
	if !ok {
		return
	}
	items, next, more, err := h.repo.ListNotes(c.Request.Context(), animeID, groupID, memberID, c.Query("cursor"), parseCursorLimitQuery(c))
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	c.JSON(http.StatusOK, projectMemberCursorEnvelope{Items: items, NextCursor: next, HasMore: more})
}

// GetMedia handles GET /api/v1/anime/:id/group/:groupId/members/:memberSlug/media
func (h *ProjectMemberPublicHandler) GetMedia(c *gin.Context) {
	animeID, groupID, memberID, ok := h.resolve(c)
	if !ok {
		return
	}
	items, next, more, err := h.repo.ListMedia(c.Request.Context(), animeID, groupID, memberID, c.Query("cursor"), parseCursorLimitQuery(c))
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	out := make([]projectMemberMediaResponse, 0, len(items))
	for _, it := range items {
		out = append(out, projectMemberMediaResponse{
			ProjectMemberMediaItem: it,
			ThumbnailURL:           h.buildMediaURL(it.ThumbFilePath),
			PreviewURL:             h.buildMediaURL(it.OriginalFilePath),
		})
	}
	c.JSON(http.StatusOK, projectMemberCursorEnvelope{Items: out, NextCursor: next, HasMore: more})
}

// GetReleases handles GET /api/v1/anime/:id/group/:groupId/members/:memberSlug/releases
func (h *ProjectMemberPublicHandler) GetReleases(c *gin.Context) {
	animeID, groupID, memberID, ok := h.resolve(c)
	if !ok {
		return
	}
	items, next, more, err := h.repo.ListReleases(c.Request.Context(), animeID, groupID, memberID, c.Query("cursor"), parseCursorLimitQuery(c))
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	c.JSON(http.StatusOK, projectMemberCursorEnvelope{Items: items, NextCursor: next, HasMore: more})
}
