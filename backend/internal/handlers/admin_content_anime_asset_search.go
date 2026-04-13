package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) SearchAnimeCreateAssetCandidates(c *gin.Context) {
	slot := strings.TrimSpace(c.Query("slot"))
	if !isSupportedAdminAnimeAssetSearchKind(slot) {
		badRequest(c, "slot ist ungueltig")
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "q ist erforderlich")
		return
	}

	limit := 12
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 {
			badRequest(c, "limit muss eine positive Zahl sein")
			return
		}
		if parsedLimit > 50 {
			parsedLimit = 50
		}
		limit = parsedLimit
	}

	page := 1
	if rawPage := strings.TrimSpace(c.Query("page")); rawPage != "" {
		parsedPage, err := strconv.Atoi(rawPage)
		if err != nil || parsedPage <= 0 {
			badRequest(c, "page muss eine positive Zahl sein")
			return
		}
		page = parsedPage
	}

	sources, err := parseAdminAnimeAssetSearchSources(c.Query("sources"))
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	if h.assetSearchService == nil {
		c.JSON(http.StatusNotImplemented, gin.H{
			"error": gin.H{
				"message": "asset-suche ist noch nicht verfuegbar",
				"code":    "asset_search_not_implemented",
				"details": "Die Asset-Suchquellen werden im naechsten Phase-15-Schritt verdrahtet.",
			},
		})
		return
	}

	results, err := h.assetSearchService.SearchAssetCandidates(c.Request.Context(), models.AdminAnimeAssetSearchRequest{
		AssetKind: slot,
		Query:     query,
		Limit:     limit,
		Page:      page,
		Sources:   sources,
	})
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Asset-Treffer konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, models.AdminAnimeAssetSearchResponse{Data: results})
}

func isSupportedAdminAnimeAssetSearchKind(kind string) bool {
	switch strings.TrimSpace(kind) {
	case "cover", "banner", "logo", "background":
		return true
	default:
		return false
	}
}

func parseAdminAnimeAssetSearchSources(raw string) ([]models.AdminAnimeAssetSearchSource, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	parts := strings.Split(trimmed, ",")
	result := make([]models.AdminAnimeAssetSearchSource, 0, len(parts))
	seen := make(map[models.AdminAnimeAssetSearchSource]struct{}, len(parts))
	for _, part := range parts {
		switch source := models.AdminAnimeAssetSearchSource(strings.TrimSpace(part)); source {
		case models.AdminAnimeAssetSearchSourceTMDB, models.AdminAnimeAssetSearchSourceFanartTV, models.AdminAnimeAssetSearchSourceZerochan, models.AdminAnimeAssetSearchSourceKonachan, models.AdminAnimeAssetSearchSourceAniList, models.AdminAnimeAssetSearchSourceSafebooru:
			if _, ok := seen[source]; ok {
				continue
			}
			seen[source] = struct{}{}
			result = append(result, source)
		default:
			return nil, fmt.Errorf("sources enthaelt einen ungueltigen wert")
		}
	}

	if len(result) == 0 {
		return nil, nil
	}
	return result, nil
}
