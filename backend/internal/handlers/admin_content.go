package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

var allowedAnimeTypes = map[string]struct{}{
	"tv":      {},
	"film":    {},
	"ova":     {},
	"ona":     {},
	"special": {},
	"bonus":   {},
}

var allowedEpisodeStatuses = map[string]struct{}{
	"disabled": {},
	"private":  {},
	"public":   {},
}

type adminAnimeCreateRequest struct {
	Title       string  `json:"title"`
	TitleDE     *string `json:"title_de"`
	TitleEN     *string `json:"title_en"`
	Type        string  `json:"type"`
	ContentType string  `json:"content_type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year"`
	MaxEpisodes *int16  `json:"max_episodes"`
	Genre       *string `json:"genre"`
	Description *string `json:"description"`
	CoverImage  *string `json:"cover_image"`
}

type adminEpisodeCreateRequest struct {
	AnimeID       int64   `json:"anime_id"`
	EpisodeNumber string  `json:"episode_number"`
	Title         *string `json:"title"`
	Status        string  `json:"status"`
	StreamLink    *string `json:"stream_link"`
}

type AdminContentHandler struct {
	repo               *repository.AdminContentRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	authzRepo          *repository.AuthzRepository
	adminRoleName      string
	jellyfinAPIKey     string
	jellyfinBaseURL    string
	httpClient         *http.Client
}

type AdminContentJellyfinConfig struct {
	APIKey  string
	BaseURL string
}

func NewAdminContentHandler(
	repo *repository.AdminContentRepository,
	episodeVersionRepo *repository.EpisodeVersionRepository,
	authzRepo *repository.AuthzRepository,
	adminRoleName string,
	jellyfinCfg AdminContentJellyfinConfig,
) *AdminContentHandler {
	return &AdminContentHandler{
		repo:               repo,
		episodeVersionRepo: episodeVersionRepo,
		authzRepo:          authzRepo,
		adminRoleName:      strings.TrimSpace(adminRoleName),
		jellyfinAPIKey:     strings.TrimSpace(jellyfinCfg.APIKey),
		jellyfinBaseURL:    strings.TrimSpace(jellyfinCfg.BaseURL),
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (h *AdminContentHandler) CreateAnime(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req adminAnimeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content create_anime: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminAnimeCreateRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content create_anime: validation failed (user_id=%d): %s", identity.UserID, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateAnime(c.Request.Context(), input)
	if err != nil {
		log.Printf("admin_content create_anime: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *AdminContentHandler) UpdateAnime(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseAnimeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content update_anime: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige anime id")
		return
	}

	var req models.AdminAnimePatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content update_anime: bad request (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminAnimePatchRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content update_anime: validation failed (user_id=%d, anime_id=%d): %s", identity.UserID, id, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.UpdateAnime(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content update_anime: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *AdminContentHandler) CreateEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req adminEpisodeCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content create_episode: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminEpisodeCreateRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content create_episode: validation failed (user_id=%d): %s", identity.UserID, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.CreateEpisode(c.Request.Context(), input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content create_episode: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, input.AnimeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *AdminContentHandler) UpdateEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content update_episode: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige episode id")
		return
	}

	var req models.AdminEpisodePatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("admin_content update_episode: bad request (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateAdminEpisodePatchRequest(req)
	if validationMessage != "" {
		log.Printf("admin_content update_episode: validation failed (user_id=%d, episode_id=%d): %s", identity.UserID, id, validationMessage)
		badRequest(c, validationMessage)
		return
	}

	item, err := h.repo.UpdateEpisode(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episode nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content update_episode: repo error (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *AdminContentHandler) DeleteEpisode(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		log.Printf("admin_content delete_episode: invalid id %q (user_id=%d): %v", c.Param("id"), identity.UserID, err)
		badRequest(c, "ungueltige episode id")
		return
	}

	result, err := h.repo.DeleteEpisode(c.Request.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episode nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("admin_content delete_episode: repo error (user_id=%d, episode_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *AdminContentHandler) ListGenreTokens(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	q := strings.TrimSpace(c.Query("q"))
	if len([]rune(q)) > 100 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	limit := 200
	limitRaw := strings.TrimSpace(c.Query("limit"))
	if limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungueltiger limit parameter")
			return
		}
		limit = value
	}
	if limit > 1000 {
		limit = 1000
	}

	items, err := h.repo.ListGenreTokens(c.Request.Context(), q, limit)
	if err != nil {
		log.Printf("admin_content list_genres: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		log.Printf("admin_content require_admin: missing identity (path=%s)", c.FullPath())
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	if h.authzRepo == nil {
		log.Printf("admin_content require_admin: authz repo missing (user_id=%d, path=%s)", identity.UserID, c.FullPath())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	roleName := h.adminRoleName
	if roleName == "" {
		roleName = "admin"
	}

	isAdmin, err := h.authzRepo.UserHasRole(c.Request.Context(), identity.UserID, roleName)
	if err != nil {
		log.Printf("admin_content require_admin: authz check failed (user_id=%d, role=%q): %v", identity.UserID, roleName, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	if !isAdmin {
		log.Printf("admin_content require_admin: forbidden (user_id=%d, role=%q, path=%s)", identity.UserID, roleName, c.FullPath())
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"message": "keine berechtigung",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}

func validateAdminAnimeCreateRequest(req adminAnimeCreateRequest) (models.AdminAnimeCreateInput, string) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return models.AdminAnimeCreateInput{}, "title ist erforderlich"
	}
	if len([]rune(title)) > 255 {
		return models.AdminAnimeCreateInput{}, "title ist zu lang"
	}

	animeType := strings.TrimSpace(req.Type)
	if _, ok := allowedAnimeTypes[animeType]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger type parameter"
	}

	contentType := strings.TrimSpace(req.ContentType)
	if _, ok := allowedContentTypes[contentType]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger content_type parameter"
	}

	status := strings.TrimSpace(req.Status)
	if _, ok := allowedAnimeStatuses[status]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger status parameter"
	}

	if req.Year != nil && *req.Year <= 0 {
		return models.AdminAnimeCreateInput{}, "ungueltiger year parameter"
	}
	if req.MaxEpisodes != nil && *req.MaxEpisodes <= 0 {
		return models.AdminAnimeCreateInput{}, "ungueltiger max_episodes parameter"
	}

	return models.AdminAnimeCreateInput{
		Title:       title,
		TitleDE:     normalizeNullableString(req.TitleDE),
		TitleEN:     normalizeNullableString(req.TitleEN),
		Type:        animeType,
		ContentType: contentType,
		Status:      status,
		Year:        req.Year,
		MaxEpisodes: req.MaxEpisodes,
		Genre:       normalizeNullableString(req.Genre),
		Description: normalizeNullableString(req.Description),
		CoverImage:  normalizeNullableString(req.CoverImage),
	}, ""
}

func validateAdminAnimePatchRequest(req models.AdminAnimePatchInput) (models.AdminAnimePatchInput, string) {
	if !hasAnyAdminAnimePatchField(req) {
		return models.AdminAnimePatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Title.Set {
		title := normalizeRequiredString(req.Title.Value)
		if title == nil {
			return models.AdminAnimePatchInput{}, "title ist erforderlich"
		}
		if len([]rune(*title)) > 255 {
			return models.AdminAnimePatchInput{}, "title ist zu lang"
		}
		req.Title.Value = title
	}

	if req.Type.Set {
		value := normalizeRequiredString(req.Type.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger type parameter"
		}
		if _, ok := allowedAnimeTypes[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger type parameter"
		}
		req.Type.Value = value
	}

	if req.ContentType.Set {
		value := normalizeRequiredString(req.ContentType.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger content_type parameter"
		}
		if _, ok := allowedContentTypes[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger content_type parameter"
		}
		req.ContentType.Value = value
	}

	if req.Status.Set {
		value := normalizeRequiredString(req.Status.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedAnimeStatuses[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = value
	}

	if req.Year.Set && req.Year.Value != nil && *req.Year.Value <= 0 {
		return models.AdminAnimePatchInput{}, "ungueltiger year parameter"
	}
	if req.MaxEpisodes.Set && req.MaxEpisodes.Value != nil && *req.MaxEpisodes.Value <= 0 {
		return models.AdminAnimePatchInput{}, "ungueltiger max_episodes parameter"
	}

	if req.TitleDE.Set {
		req.TitleDE.Value = normalizeNullableString(req.TitleDE.Value)
	}
	if req.TitleEN.Set {
		req.TitleEN.Value = normalizeNullableString(req.TitleEN.Value)
	}
	if req.Genre.Set {
		req.Genre.Value = normalizeNullableString(req.Genre.Value)
	}
	if req.Description.Set {
		req.Description.Value = normalizeNullableString(req.Description.Value)
	}
	if req.CoverImage.Set {
		req.CoverImage.Value = normalizeNullableString(req.CoverImage.Value)
	}

	return req, ""
}

func validateAdminEpisodeCreateRequest(req adminEpisodeCreateRequest) (models.AdminEpisodeCreateInput, string) {
	if req.AnimeID <= 0 {
		return models.AdminEpisodeCreateInput{}, "anime_id ist erforderlich"
	}

	episodeNumber := strings.TrimSpace(req.EpisodeNumber)
	if episodeNumber == "" {
		return models.AdminEpisodeCreateInput{}, "episode_number ist erforderlich"
	}
	if len([]rune(episodeNumber)) > 32 {
		return models.AdminEpisodeCreateInput{}, "episode_number ist zu lang"
	}

	status := strings.TrimSpace(req.Status)
	if _, ok := allowedEpisodeStatuses[status]; !ok {
		return models.AdminEpisodeCreateInput{}, "ungueltiger status parameter"
	}

	return models.AdminEpisodeCreateInput{
		AnimeID:       req.AnimeID,
		EpisodeNumber: episodeNumber,
		Title:         normalizeNullableString(req.Title),
		Status:        status,
		StreamLink:    normalizeNullableString(req.StreamLink),
	}, ""
}

func validateAdminEpisodePatchRequest(req models.AdminEpisodePatchInput) (models.AdminEpisodePatchInput, string) {
	if !req.EpisodeNumber.Set && !req.Title.Set && !req.Status.Set && !req.StreamLink.Set {
		return models.AdminEpisodePatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.EpisodeNumber.Set {
		episodeNumber := normalizeRequiredString(req.EpisodeNumber.Value)
		if episodeNumber == nil {
			return models.AdminEpisodePatchInput{}, "episode_number ist erforderlich"
		}
		if len([]rune(*episodeNumber)) > 32 {
			return models.AdminEpisodePatchInput{}, "episode_number ist zu lang"
		}
		req.EpisodeNumber.Value = episodeNumber
	}

	if req.Title.Set {
		req.Title.Value = normalizeNullableString(req.Title.Value)
	}

	if req.Status.Set {
		status := normalizeRequiredString(req.Status.Value)
		if status == nil {
			return models.AdminEpisodePatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedEpisodeStatuses[*status]; !ok {
			return models.AdminEpisodePatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = status
	}

	if req.StreamLink.Set {
		req.StreamLink.Value = normalizeNullableString(req.StreamLink.Value)
	}

	return req, ""
}

func hasAnyAdminAnimePatchField(req models.AdminAnimePatchInput) bool {
	return req.Title.Set ||
		req.TitleDE.Set ||
		req.TitleEN.Set ||
		req.Type.Set ||
		req.ContentType.Set ||
		req.Status.Set ||
		req.Year.Set ||
		req.MaxEpisodes.Set ||
		req.Genre.Set ||
		req.Description.Set ||
		req.CoverImage.Set
}

func normalizeRequiredString(raw *string) *string {
	if raw == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func normalizeNullableString(raw *string) *string {
	if raw == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
