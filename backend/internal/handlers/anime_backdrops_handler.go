package handlers

import (
	"errors"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListBackdrops verarbeitet GET /api/v1/anime/:id/backdrops und gibt das Backdrop-Manifest eines Anime zurück, bevorzugt gespeicherte Assets und greift bei Bedarf auf Jellyfin zurück.
func (h *AnimeHandler) ListBackdrops(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	result := models.AnimeBackdropManifest{
		AnimeID:     animeID,
		Provider:    "jellyfin",
		Backdrops:   []string{},
		ThemeVideos: []string{},
	}

	if h.assetRepo != nil {
		persistedAssets, assetsErr := h.assetRepo.GetResolvedAssets(c.Request.Context(), animeID)
		if errors.Is(assetsErr, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
			return
		}
		if assetsErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
			return
		}
		if persistedAssets != nil {
			if persistedAssets.Banner != nil {
				result.BannerURL = persistedAssets.Banner.URL
				result.Provider = "persisted"
			}
			if persistedAssets.Logo != nil {
				result.LogoURL = persistedAssets.Logo.URL
				result.Provider = "persisted"
			}
			if len(persistedAssets.Backgrounds) > 0 {
				result.Backdrops = make([]string, 0, len(persistedAssets.Backgrounds))
				for _, item := range persistedAssets.Backgrounds {
					trimmedURL := strings.TrimSpace(item.URL)
					if trimmedURL == "" {
						continue
					}
					result.Backdrops = append(result.Backdrops, trimmedURL)
				}
				if len(result.Backdrops) > 0 {
					result.Provider = "persisted"
				}
			}
			if len(persistedAssets.BackgroundVideos) > 0 {
				result.ThemeVideos = make([]string, 0, len(persistedAssets.BackgroundVideos))
				for _, item := range persistedAssets.BackgroundVideos {
					trimmedURL := strings.TrimSpace(item.URL)
					if trimmedURL == "" {
						continue
					}
					result.ThemeVideos = append(result.ThemeVideos, trimmedURL)
				}
				if len(result.ThemeVideos) > 0 {
					result.Provider = "persisted"
				}
			} else if persistedAssets.BackgroundVideo != nil {
				result.ThemeVideos = []string{persistedAssets.BackgroundVideo.URL}
				result.Provider = "persisted"
			}
		}
	}

	lookup, err := h.repo.GetMediaLookupByID(c.Request.Context(), animeID, false)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		c.JSON(http.StatusOK, gin.H{"data": result})
		return
	}

	seriesID := jellyfinSeriesIDFromSource(lookup.Source)
	if seriesID == "" {
		resolvedID, resolveErr := h.resolveJellyfinSeriesID(c.Request.Context(), lookup)
		if resolveErr == nil {
			seriesID = resolvedID
		}
	}

	if strings.TrimSpace(seriesID) == "" {
		c.JSON(http.StatusOK, gin.H{"data": result})
		return
	}

	result.MediaItemID = strings.TrimSpace(seriesID)
	if len(result.ThemeVideos) == 0 {
		result.ThemeVideos = h.probeJellyfinThemeVideoProxyURLs(c.Request.Context(), result.MediaItemID)
	}
	if len(result.Backdrops) == 0 {
		result.Backdrops = h.probeJellyfinBackdropProxyURLs(c.Request.Context(), result.MediaItemID)
	}
	if len(result.Backdrops) == 0 {
		result.Backdrops = buildAnimeBackdropProxyURLs(result.MediaItemID, 1)
	}
	if strings.TrimSpace(result.LogoURL) == "" {
		result.LogoURL = h.probeJellyfinLogoProxyURL(c.Request.Context(), result.MediaItemID)
	}
	if strings.TrimSpace(result.BannerURL) == "" {
		result.BannerURL = h.probeJellyfinBannerProxyURL(c.Request.Context(), result.MediaItemID)
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
