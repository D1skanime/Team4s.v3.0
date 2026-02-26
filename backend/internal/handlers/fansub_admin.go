package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

var allowedFansubStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"dissolved": {},
}

type FansubHandler struct {
	fansubRepo         *repository.FansubRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	authzRepo          *repository.AuthzRepository
	mediaRepo          *repository.MediaRepository
	mediaService       *services.MediaService
	adminRoleName      string
	embyAPIKey         string
	embyBaseURL        string
	embyStreamPath     string
	jellyfinAPIKey     string
	jellyfinBaseURL    string
	jellyfinStreamPath string
	releaseGrantSecret string
	releaseGrantTTL    time.Duration
	httpClient         *http.Client
}

type FansubProxyConfig struct {
	EmbyAPIKey             string
	EmbyBaseURL            string
	EmbyStreamPathTemplate string
	JellyfinAPIKey         string
	JellyfinBaseURL        string
	JellyfinStreamPath     string
	ReleaseGrantSecret     string
	ReleaseGrantTTLSeconds int
}

func NewFansubHandler(
	fansubRepo *repository.FansubRepository,
	episodeVersionRepo *repository.EpisodeVersionRepository,
	authzRepo *repository.AuthzRepository,
	adminRoleName string,
	proxyCfg FansubProxyConfig,
) *FansubHandler {
	return &FansubHandler{
		fansubRepo:         fansubRepo,
		episodeVersionRepo: episodeVersionRepo,
		authzRepo:          authzRepo,
		adminRoleName:      strings.TrimSpace(adminRoleName),
		embyAPIKey:         strings.TrimSpace(proxyCfg.EmbyAPIKey),
		embyBaseURL:        strings.TrimSpace(proxyCfg.EmbyBaseURL),
		embyStreamPath:     normalizeStreamPathTemplate(proxyCfg.EmbyStreamPathTemplate),
		jellyfinAPIKey:     strings.TrimSpace(proxyCfg.JellyfinAPIKey),
		jellyfinBaseURL:    strings.TrimSpace(proxyCfg.JellyfinBaseURL),
		jellyfinStreamPath: normalizeStreamPathTemplate(proxyCfg.JellyfinStreamPath),
		releaseGrantSecret: strings.TrimSpace(proxyCfg.ReleaseGrantSecret),
		releaseGrantTTL:    time.Duration(proxyCfg.ReleaseGrantTTLSeconds) * time.Second,
		httpClient: &http.Client{
			Timeout: 0,
		},
	}
}

func (h *FansubHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	if h.authzRepo == nil {
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
		log.Printf("fansub require_admin: authz check failed (user_id=%d, role=%q): %v", identity.UserID, roleName, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"message": "keine berechtigung",
			},
		})
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}

func parseFansubID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}

func parseFansubMemberID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}

func parseFansubAliasID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}

func parseEpisodeVersionID(raw string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || id <= 0 {
		return 0, strconv.ErrSyntax
	}
	return id, nil
}

func parseEpisodeNumber(raw string) (int32, error) {
	value, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 32)
	if err != nil || value <= 0 {
		return 0, strconv.ErrSyntax
	}
	return int32(value), nil
}

func readBodyForOptionalJSON(c *gin.Context) string {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}
	trimmed := strings.TrimSpace(string(body))
	c.Request.Body = io.NopCloser(strings.NewReader(trimmed))
	return trimmed
}

func normalizeStreamPathTemplate(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || !strings.Contains(trimmed, "%s") {
		return "/Videos/%s/stream"
	}
	return trimmed
}

func (h *FansubHandler) buildProviderStreamURL(provider, itemID string, fallbackURL *string) (string, error) {
	if fallbackURL != nil {
		if trimmed := strings.TrimSpace(*fallbackURL); trimmed != "" {
			return trimmed, nil
		}
	}

	normalizedProvider := strings.ToLower(strings.TrimSpace(provider))
	switch normalizedProvider {
	case "jellyfin":
		return buildProviderStreamURL(h.jellyfinBaseURL, h.jellyfinStreamPath, h.jellyfinAPIKey, itemID)
	case "emby":
		return buildProviderStreamURL(h.embyBaseURL, h.embyStreamPath, h.embyAPIKey, itemID)
	default:
		return "", fmt.Errorf("unknown media provider %q", provider)
	}
}

func buildProviderStreamURL(baseURL, pathTemplate, apiKey, itemID string) (string, error) {
	base := strings.TrimSpace(baseURL)
	if base == "" {
		return "", fmt.Errorf("media base url is missing")
	}
	if strings.TrimSpace(apiKey) == "" {
		return "", fmt.Errorf("media api key is missing")
	}
	if strings.TrimSpace(itemID) == "" {
		return "", fmt.Errorf("media item id is missing")
	}

	parsedBase, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("parse media base url: %w", err)
	}

	streamPath := fmt.Sprintf(pathTemplate, strings.TrimSpace(itemID))
	parsedBase.Path = path.Clean("/" + strings.TrimPrefix(streamPath, "/"))

	query := parsedBase.Query()
	query.Set("api_key", strings.TrimSpace(apiKey))
	query.Set("static", "true")
	parsedBase.RawQuery = query.Encode()

	return parsedBase.String(), nil
}

func (h *FansubHandler) buildProviderImageURL(
	provider,
	itemID,
	kind string,
	width,
	quality,
	index *int,
) (string, error) {
	normalizedProvider := strings.ToLower(strings.TrimSpace(provider))
	baseURL := ""
	apiKey := ""

	switch normalizedProvider {
	case "jellyfin":
		baseURL = h.jellyfinBaseURL
		apiKey = h.jellyfinAPIKey
	case "emby":
		baseURL = h.embyBaseURL
		apiKey = h.embyAPIKey
	default:
		return "", fmt.Errorf("unknown media provider %q", provider)
	}

	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		return "", fmt.Errorf("media base url is missing")
	}
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return "", fmt.Errorf("media api key is missing")
	}
	itemID = strings.TrimSpace(itemID)
	if itemID == "" {
		return "", fmt.Errorf("media item id is missing")
	}

	imageType := "Primary"
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "primary":
		imageType = "Primary"
	case "backdrop":
		imageType = "Backdrop"
	case "logo":
		imageType = "Logo"
	case "banner":
		imageType = "Banner"
	case "thumb":
		imageType = "Thumb"
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse media base url: %w", err)
	}

	imagePath := fmt.Sprintf("/Items/%s/Images/%s", itemID, imageType)
	if strings.EqualFold(imageType, "Backdrop") && index != nil {
		imagePath = fmt.Sprintf("/Items/%s/Images/%s/%d", itemID, imageType, *index)
	}

	parsedBase.Path = path.Clean("/" + strings.TrimPrefix(imagePath, "/"))

	query := parsedBase.Query()
	query.Set("api_key", apiKey)
	if width != nil {
		query.Set("maxWidth", strconv.Itoa(*width))
	}
	if quality != nil {
		query.Set("quality", strconv.Itoa(*quality))
	}
	parsedBase.RawQuery = query.Encode()

	return parsedBase.String(), nil
}
