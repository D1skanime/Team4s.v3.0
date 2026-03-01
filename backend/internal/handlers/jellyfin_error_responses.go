package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func writeJellyfinErrorResponse(
	c *gin.Context,
	status int,
	message string,
	code string,
	details *string,
) {
	errorBody := gin.H{
		"message": message,
	}

	if trimmedCode := strings.TrimSpace(code); trimmedCode != "" {
		errorBody["code"] = trimmedCode
	}

	if trimmedDetails := normalizeJellyfinErrorDetails(details); trimmedDetails != nil {
		errorBody["details"] = *trimmedDetails
	}

	c.JSON(status, gin.H{
		"error": errorBody,
	})
}

func normalizeJellyfinErrorDetails(details *string) *string {
	if details == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*details)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func classifyJellyfinUpstreamError(err error, fallbackMessage string) (string, string, *string) {
	if err == nil {
		return fallbackMessage, "jellyfin_request_failed", nil
	}

	normalized := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(normalized, "returned status 401"), strings.Contains(normalized, "returned status 403"):
		details := "Jellyfin API meldet 401/403. Bitte API-Key und Berechtigungen pruefen."
		return "jellyfin token ungueltig", "jellyfin_auth_invalid", &details
	case strings.Contains(normalized, "context deadline exceeded"),
		strings.Contains(normalized, "call jellyfin:"):
		details := "Die Verbindung zu Jellyfin konnte nicht aufgebaut werden oder hat zu lange gedauert."
		return "server nicht erreichbar", "jellyfin_unreachable", &details
	case strings.Contains(normalized, "decode jellyfin response"),
		strings.Contains(normalized, "read jellyfin response"):
		details := "Die Jellyfin-Antwort konnte nicht gelesen oder ausgewertet werden."
		return "ungueltige antwort von jellyfin", "jellyfin_invalid_response", &details
	default:
		details := "Die Anfrage an Jellyfin ist fehlgeschlagen. Bitte Logs pruefen."
		return fallbackMessage, "jellyfin_request_failed", &details
	}
}

func classifyJellyfinResolutionError(status int, message string) (string, *string) {
	switch {
	case status == http.StatusNotFound && message == "jellyfin serie nicht gefunden":
		details := "Bitte einen anderen Suchbegriff testen oder eine Series ID aus der Trefferliste waehlen."
		return "jellyfin_series_not_found", &details
	case status == http.StatusConflict && message == "mehrere jellyfin serien gefunden, bitte jellyfin_series_id angeben":
		details := "Bitte einen eindeutigen Treffer aus der Jellyfin-Trefferliste auswaehlen."
		return "jellyfin_series_ambiguous", &details
	case status == http.StatusBadGateway && message == "jellyfin serie konnte nicht geladen werden":
		details := "Der ausgewaehlte Jellyfin-Treffer konnte nicht geladen werden."
		return "jellyfin_series_lookup_failed", &details
	case status == http.StatusBadGateway && message == "jellyfin serien konnten nicht gesucht werden":
		details := "Die automatische Jellyfin-Serienauflosung ist fehlgeschlagen."
		return "jellyfin_series_search_failed", &details
	default:
		return "", nil
	}
}
