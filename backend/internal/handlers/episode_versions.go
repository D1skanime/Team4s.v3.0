package handlers

import (
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

var allowedSubtitleTypes = map[string]struct{}{
	"hardsub": {},
	"softsub": {},
}

var allowedMediaImageKinds = map[string]struct{}{
	"primary":  {},
	"backdrop": {},
	"logo":     {},
	"banner":   {},
	"thumb":    {},
}

type episodeVersionCreateRequest struct {
	Title         *string    `json:"title"`
	FansubGroupID *int64     `json:"fansub_group_id"`
	MediaProvider string     `json:"media_provider"`
	MediaItemID   string     `json:"media_item_id"`
	VideoQuality  *string    `json:"video_quality"`
	SubtitleType  *string    `json:"subtitle_type"`
	ReleaseDate   *time.Time `json:"release_date"`
	StreamURL     *string    `json:"stream_url"`
}

func (h *FansubHandler) CreateReleaseStreamGrant(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige release id")
		return
	}

	if _, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "release nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("release stream grant: repo error (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	if h.releaseGrantTTL <= 0 || strings.TrimSpace(h.releaseGrantSecret) == "" {
		log.Printf("release stream grant: grant config unavailable (release_id=%d, user_id=%d)", versionID, identity.UserID)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return
	}

	grantToken, expiresAt, err := auth.CreateReleaseStreamGrant(
		versionID,
		identity.UserID,
		h.releaseGrantSecret,
		time.Now(),
		h.releaseGrantTTL,
	)
	if err != nil {
		log.Printf("release stream grant: signing failed (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"release_id":  versionID,
			"grant_token": grantToken,
			"expires_at":  expiresAt,
			"ttl_seconds": int64(h.releaseGrantTTL / time.Second),
			"issued_for":  identity.UserID,
		},
	})
}

func (h *FansubHandler) ListGroupedEpisodes(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	data, err := h.episodeVersionRepo.ListGroupedByAnimeID(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("grouped episodes list: repo error (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
	})
}

func (h *FansubHandler) GetEpisodeVersionByID(c *gin.Context) {
	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	item, err := h.episodeVersionRepo.GetByID(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episodenversion nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("episode version get: repo error (version_id=%d): %v", versionID, err)
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

func (h *FansubHandler) CreateEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	episodeNumber, err := parseEpisodeNumber(c.Param("episodeNumber"))
	if err != nil {
		badRequest(c, "ungueltige episode nummer")
		return
	}

	var req episodeVersionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf(
			"episode version create: bad request (user_id=%d, anime_id=%d, episode_number=%d): %v",
			identity.UserID,
			animeID,
			episodeNumber,
			err,
		)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateEpisodeVersionCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}
	input.AnimeID = animeID
	input.EpisodeNumber = episodeNumber

	item, err := h.episodeVersionRepo.Create(c.Request.Context(), input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime oder fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "versionskombination bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf(
			"episode version create: repo error (user_id=%d, anime_id=%d, episode_number=%d): %v",
			identity.UserID,
			animeID,
			episodeNumber,
			err,
		)
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

func (h *FansubHandler) UpdateEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	var req models.EpisodeVersionPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("episode version update: bad request (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateEpisodeVersionPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.episodeVersionRepo.Update(c.Request.Context(), versionID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episodenversion nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "versionskombination bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("episode version update: repo error (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
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

func (h *FansubHandler) DeleteEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	if err := h.episodeVersionRepo.Delete(c.Request.Context(), versionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episodenversion nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("episode version delete: repo error (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) StreamRelease(c *gin.Context) {
	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige release id")
		return
	}

	if !h.authorizeReleaseStream(c, versionID) {
		return
	}

	release, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "release nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("release stream: repo error (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	targetURL, err := h.buildProviderStreamURL(release.MediaProvider, release.MediaItemID, release.StreamURL)
	if err != nil {
		log.Printf("release stream: unable to build stream url (release_id=%d, provider=%q): %v", versionID, release.MediaProvider, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}
	if strings.TrimSpace(targetURL) == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("release stream: create outbound request failed (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}
	copyProxyHeaders(c.Request.Header, req.Header)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("release stream: upstream request failed (release_id=%d): %v", versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	copyResponseHeaders(resp.Header, c.Writer.Header())
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("release stream: proxy copy failed (release_id=%d): %v", versionID, err)
	}
}

func (h *FansubHandler) authorizeReleaseStream(c *gin.Context, versionID int64) bool {
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok && identity.UserID > 0 {
		return true
	}

	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return false
	}

	if strings.TrimSpace(h.releaseGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return false
	}

	claims, err := auth.ParseAndVerifyReleaseStreamGrant(grantToken, h.releaseGrantSecret, time.Now())
	if err != nil || claims.ReleaseID != versionID {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "ungueltiger stream grant",
			},
		})
		return false
	}

	return true
}

func (h *FansubHandler) MediaImage(c *gin.Context) {
	provider := strings.TrimSpace(c.Query("provider"))
	itemID := strings.TrimSpace(c.Query("item_id"))
	if provider == "" || itemID == "" {
		badRequest(c, "ungueltige media parameter")
		return
	}

	kind := strings.TrimSpace(c.DefaultQuery("kind", "primary"))
	if _, ok := allowedMediaImageKinds[kind]; !ok {
		badRequest(c, "ungueltiger kind parameter")
		return
	}

	widthRaw := strings.TrimSpace(c.Query("width"))
	var widthValue *int
	if widthRaw != "" {
		width, err := strconv.Atoi(widthRaw)
		if err != nil || width <= 0 {
			badRequest(c, "ungueltiger width parameter")
			return
		}
		widthValue = &width
	}

	qualityRaw := strings.TrimSpace(c.Query("quality"))
	var qualityValue *int
	if qualityRaw != "" {
		quality, err := strconv.Atoi(qualityRaw)
		if err != nil || quality <= 0 || quality > 100 {
			badRequest(c, "ungueltiger quality parameter")
			return
		}
		qualityValue = &quality
	}

	indexRaw := strings.TrimSpace(c.Query("index"))
	var indexValue *int
	if indexRaw != "" {
		index, err := strconv.Atoi(indexRaw)
		if err != nil || index < 0 {
			badRequest(c, "ungueltiger index parameter")
			return
		}
		indexValue = &index
	}

	targetURL, err := h.buildProviderImageURL(provider, itemID, kind, widthValue, qualityValue, indexValue)
	if err != nil {
		log.Printf("media image: unable to build image url (provider=%q, item_id=%q): %v", provider, itemID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "bild nicht gefunden",
			},
		})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("media image: create outbound request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}
	req.Header.Set("Accept", "image/*")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("media image: upstream request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "bild nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "bild nicht gefunden",
			},
		})
		return
	}

	c.Writer.Header().Set("Cache-Control", "public, max-age=3600")
	for _, key := range []string{"Content-Type", "Content-Length", "ETag", "Last-Modified"} {
		value := strings.TrimSpace(resp.Header.Get(key))
		if value != "" {
			c.Writer.Header().Set(key, value)
		}
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("media image: proxy copy failed: %v", err)
	}
}

func (h *FansubHandler) MediaVideo(c *gin.Context) {
	provider := strings.TrimSpace(c.Query("provider"))
	itemID := strings.TrimSpace(c.Query("item_id"))
	if provider == "" || itemID == "" {
		badRequest(c, "ungueltige media parameter")
		return
	}

	targetURL, err := h.buildProviderStreamURL(provider, itemID, nil)
	if err != nil {
		log.Printf("media video: unable to build video url (provider=%q, item_id=%q): %v", provider, itemID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "video nicht gefunden",
			},
		})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("media video: create outbound request failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}
	copyProxyHeaders(c.Request.Header, req.Header)
	req.Header.Set("Accept", "video/*")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("media video: upstream request failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "video nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "video nicht gefunden",
			},
		})
		return
	}
	if resp.StatusCode >= 500 {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "video nicht erreichbar",
			},
		})
		return
	}

	copyResponseHeaders(resp.Header, c.Writer.Header())
	if strings.TrimSpace(c.Writer.Header().Get("Cache-Control")) == "" {
		c.Writer.Header().Set("Cache-Control", "public, max-age=600")
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("media video: proxy copy failed: %v", err)
	}
}

func validateEpisodeVersionCreateRequest(req episodeVersionCreateRequest) (models.EpisodeVersionCreateInput, string) {
	mediaProvider := normalizeRequiredString(&req.MediaProvider)
	if mediaProvider == nil || len([]rune(*mediaProvider)) > 30 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger media_provider parameter"
	}
	mediaItemID := normalizeRequiredString(&req.MediaItemID)
	if mediaItemID == nil || len([]rune(*mediaItemID)) > 120 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger media_item_id parameter"
	}

	if req.FansubGroupID != nil && *req.FansubGroupID <= 0 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger fansub_group_id parameter"
	}

	title := normalizeNullableString(req.Title)
	if title != nil && len([]rune(*title)) > 255 {
		return models.EpisodeVersionCreateInput{}, "title ist zu lang"
	}

	videoQuality := normalizeNullableString(req.VideoQuality)
	if videoQuality != nil && len([]rune(*videoQuality)) > 20 {
		return models.EpisodeVersionCreateInput{}, "video_quality ist zu lang"
	}

	subtitleType := normalizeNullableString(req.SubtitleType)
	if subtitleType != nil {
		if _, ok := allowedSubtitleTypes[*subtitleType]; !ok {
			return models.EpisodeVersionCreateInput{}, "ungueltiger subtitle_type parameter"
		}
	}

	streamURL := normalizeNullableString(req.StreamURL)

	return models.EpisodeVersionCreateInput{
		Title:         title,
		FansubGroupID: req.FansubGroupID,
		MediaProvider: *mediaProvider,
		MediaItemID:   *mediaItemID,
		VideoQuality:  videoQuality,
		SubtitleType:  subtitleType,
		ReleaseDate:   req.ReleaseDate,
		StreamURL:     streamURL,
	}, ""
}

func validateEpisodeVersionPatchRequest(req models.EpisodeVersionPatchInput) (models.EpisodeVersionPatchInput, string) {
	if !req.Title.Set &&
		!req.FansubGroupID.Set &&
		!req.MediaProvider.Set &&
		!req.MediaItemID.Set &&
		!req.VideoQuality.Set &&
		!req.SubtitleType.Set &&
		!req.ReleaseDate.Set &&
		!req.StreamURL.Set {
		return models.EpisodeVersionPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Title.Set {
		req.Title.Value = normalizeNullableString(req.Title.Value)
		if req.Title.Value != nil && len([]rune(*req.Title.Value)) > 255 {
			return models.EpisodeVersionPatchInput{}, "title ist zu lang"
		}
	}
	if req.FansubGroupID.Set && req.FansubGroupID.Value != nil && *req.FansubGroupID.Value <= 0 {
		return models.EpisodeVersionPatchInput{}, "ungueltiger fansub_group_id parameter"
	}
	if req.MediaProvider.Set {
		value := normalizeRequiredString(req.MediaProvider.Value)
		if value == nil || len([]rune(*value)) > 30 {
			return models.EpisodeVersionPatchInput{}, "ungueltiger media_provider parameter"
		}
		req.MediaProvider.Value = value
	}
	if req.MediaItemID.Set {
		value := normalizeRequiredString(req.MediaItemID.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.EpisodeVersionPatchInput{}, "ungueltiger media_item_id parameter"
		}
		req.MediaItemID.Value = value
	}
	if req.VideoQuality.Set {
		req.VideoQuality.Value = normalizeNullableString(req.VideoQuality.Value)
		if req.VideoQuality.Value != nil && len([]rune(*req.VideoQuality.Value)) > 20 {
			return models.EpisodeVersionPatchInput{}, "video_quality ist zu lang"
		}
	}
	if req.SubtitleType.Set {
		req.SubtitleType.Value = normalizeNullableString(req.SubtitleType.Value)
		if req.SubtitleType.Value != nil {
			if _, ok := allowedSubtitleTypes[*req.SubtitleType.Value]; !ok {
				return models.EpisodeVersionPatchInput{}, "ungueltiger subtitle_type parameter"
			}
		}
	}
	if req.StreamURL.Set {
		req.StreamURL.Value = normalizeNullableString(req.StreamURL.Value)
	}

	return req, ""
}
