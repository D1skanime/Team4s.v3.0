package handlers

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

var allowedAnimeStatuses = map[string]struct{}{
	"disabled": {},
	"ongoing":  {},
	"done":     {},
	"aborted":  {},
	"licensed": {},
}

var allowedContentTypes = map[string]struct{}{
	"anime":  {},
	"hentai": {},
}

// AnimeHandler enthält alle Abhängigkeiten für die öffentlichen und internen Anime-Endpunkte.
type AnimeHandler struct {
	repo            *repository.AnimeRepository
	assetRepo       *repository.AnimeAssetRepository
	jellyfinAPIKey  string
	jellyfinBaseURL string
	httpClient      *http.Client
}

// AnimeMediaConfig hält die Konfigurationswerte für den Jellyfin-Medienzugriff des AnimeHandlers.
type AnimeMediaConfig struct {
	JellyfinAPIKey  string
	JellyfinBaseURL string
}

// NewAnimeHandler erstellt einen neuen AnimeHandler mit den übergebenen Repository- und Medienkonfigurationsabhängigkeiten.
func NewAnimeHandler(
	repo *repository.AnimeRepository,
	assetRepo *repository.AnimeAssetRepository,
	mediaConfig AnimeMediaConfig,
) *AnimeHandler {
	return &AnimeHandler{
		repo:            repo,
		assetRepo:       assetRepo,
		jellyfinAPIKey:  strings.TrimSpace(mediaConfig.JellyfinAPIKey),
		jellyfinBaseURL: strings.TrimSpace(mediaConfig.JellyfinBaseURL),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// List verarbeitet GET /api/v1/anime und gibt eine paginierte, gefilterte Anime-Liste zurück.
func (h *AnimeHandler) List(c *gin.Context) {
	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungueltiger page parameter")
		return
	}

	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "24"))
	if err != nil {
		badRequest(c, "ungueltiger per_page parameter")
		return
	}
	if perPage > 100 {
		perPage = 100
	}

	q := strings.TrimSpace(c.Query("q"))
	if len(q) > 100 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	letter := strings.ToUpper(strings.TrimSpace(c.Query("letter")))
	if !isValidLetter(letter) {
		badRequest(c, "ungueltiger letter parameter")
		return
	}

	contentType := strings.TrimSpace(c.Query("content_type"))
	if contentType != "" {
		if _, ok := allowedContentTypes[contentType]; !ok {
			badRequest(c, "ungueltiger content_type parameter")
			return
		}
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		if _, ok := allowedAnimeStatuses[status]; !ok {
			badRequest(c, "ungueltiger status parameter")
			return
		}
	}

	var fansubGroupID *int64
	fansubIDRaw := strings.TrimSpace(c.Query("fansub_id"))
	if fansubIDRaw != "" {
		parsedFansubID, err := strconv.ParseInt(fansubIDRaw, 10, 64)
		if err != nil || parsedFansubID <= 0 {
			badRequest(c, "ungueltiger fansub_id parameter")
			return
		}
		fansubGroupID = &parsedFansubID
	}

	includeDisabled, err := parseOptionalBoolQuery(c.Query("include_disabled"))
	if err != nil {
		badRequest(c, "ungueltiger include_disabled parameter")
		return
	}

	var hasCover *bool
	hasCoverRaw := strings.TrimSpace(c.Query("has_cover"))
	if hasCoverRaw != "" {
		value, err := strconv.ParseBool(hasCoverRaw)
		if err != nil {
			badRequest(c, "ungueltiger has_cover parameter")
			return
		}
		hasCover = &value
	}

	filter := models.AnimeFilter{
		Page:            page,
		PerPage:         perPage,
		Letter:          letter,
		Q:               q,
		ContentType:     contentType,
		Status:          status,
		FansubGroupID:   fansubGroupID,
		HasCover:        hasCover,
		IncludeDisabled: includeDisabled,
	}

	items, total, err := h.repo.List(c.Request.Context(), filter)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Liste konnte nicht geladen werden.")
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(perPage)))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": models.PaginationMeta{
			Total:      total,
			Page:       page,
			PerPage:    perPage,
			TotalPages: totalPages,
		},
	})
}

// GetByID verarbeitet GET /api/v1/anime/:id und gibt die Detaildaten eines einzelnen Anime zurück.
func (h *AnimeHandler) GetByID(c *gin.Context) {
	id, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	includeDisabled, err := parseOptionalBoolQuery(c.Query("include_disabled"))
	if err != nil {
		badRequest(c, "ungueltiger include_disabled parameter")
		return
	}

	anime, err := h.repo.GetByID(c.Request.Context(), id, includeDisabled)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Detaildaten konnten nicht geladen werden. Falls v2 aktiv ist, pruefe bitte, ob die Runtime-Migrationen bereits angewendet wurden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": anime,
	})
}

// GetAnimeRelations verarbeitet GET /api/v1/anime/:id/relations und gibt alle Relationen eines Anime zurück.
func (h *AnimeHandler) GetAnimeRelations(c *gin.Context) {
	idStr := c.Param("id")
	animeID, err := parseAnimeID(idStr)
	if err != nil {
		badRequest(c, "ungueltige anime-id")
		return
	}

	// Optional: Check if anime exists (can be disabled for performance)
	_, err = h.repo.GetByID(c.Request.Context(), animeID, false)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"message": "anime nicht gefunden"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner fehler"},
		})
		return
	}

	relations, err := h.repo.GetAnimeRelations(c.Request.Context(), animeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "relationen konnten nicht geladen werden"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": relations,
	})
}

// parsePositiveInt konvertiert eine Zeichenkette in eine positive Ganzzahl und gibt einen Fehler zurück, wenn der Wert ungültig oder nicht positiv ist.
func parsePositiveInt(raw string) (int, error) {
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}
	if value <= 0 {
		return 0, strconv.ErrSyntax
	}

	return value, nil
}

// parseAnimeID konvertiert einen URL-Parameter in eine positive int64-Anime-ID und gibt einen Fehler bei ungültigem Wert zurück.
func parseAnimeID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}

	return id, nil
}

// parseOptionalBoolQuery konvertiert einen optionalen Query-Parameter in einen booleschen Wert und gibt false zurück, wenn der Parameter leer ist.
func parseOptionalBoolQuery(raw string) (bool, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return false, nil
	}

	value, err := strconv.ParseBool(trimmed)
	if err != nil {
		return false, err
	}
	return value, nil
}

// isValidLetter prüft, ob ein Buchstabenfilter-Parameter leer, "0" oder ein einzelner Großbuchstabe A–Z ist.
func isValidLetter(letter string) bool {
	if letter == "" || letter == "0" {
		return true
	}
	if len(letter) != 1 {
		return false
	}

	ch := letter[0]
	return ch >= 'A' && ch <= 'Z'
}

// badRequest schreibt eine HTTP-400-Antwort mit der übergebenen Fehlermeldung in das Response-Objekt.
func badRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, gin.H{
		"error": gin.H{
			"message": message,
		},
	})
}
