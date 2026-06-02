package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// validContributionStatuses sind die erlaubten Werte für das Status-Feld.
var validContributionStatuses = map[string]struct{}{
	"draft":     {},
	"proposed":  {},
	"confirmed": {},
	"disputed":  {},
	"hidden":    {},
}

type animeContributionCreateRequest struct {
	FansubGroupMemberID     int64    `json:"fansub_group_member_id"`
	RoleCodes               []string `json:"role_codes"`
	Status                  string   `json:"status"`
	StartedYear             *int     `json:"started_year"`
	EndedYear               *int     `json:"ended_year"`
	Note                    *string  `json:"note"`
	IsPublicOnAnimePage     bool     `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool     `json:"is_public_on_member_profile"`
	ReleaseVersionID        *int64   `json:"release_version_id"`
}

type animeContributionPatchRequest struct {
	RoleCodes               *[]string `json:"role_codes"`
	StartedYear             **int     `json:"started_year"`
	EndedYear               **int     `json:"ended_year"`
	Note                    **string  `json:"note"`
	IsPublicOnAnimePage     *bool     `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile *bool     `json:"is_public_on_member_profile"`
	ReleaseVersionID        **int64   `json:"release_version_id"`
	Status                  *string   `json:"status"`
}

// validateReleaseVersionParticipation prueft die Versions-Beteiligung der Gruppe (D-03,
// T-67-02-CG). Ist releaseVersionID nil, findet kein Check statt und es wird true
// zurueckgegeben (anime-weiter Eintrag, unveraendertes Verhalten).
//
// Bei gesetztem release_version_id wird GroupParticipatesInReleaseVersion aufgerufen.
// Auf Repo-Fehler schreibt die Funktion 500 und gibt false zurueck; ist die Gruppe nicht
// beteiligt, schreibt sie HTTP 422 mit deutscher Meldung und gibt false zurueck. Der
// aufrufende Handler darf nur bei true fortfahren. Wird von Create UND Update genutzt.
func (h *FansubAnimeContributionsHandler) validateReleaseVersionParticipation(
	c *gin.Context,
	fansubID int64,
	releaseVersionID *int64,
) bool {
	if releaseVersionID == nil {
		return true
	}

	participates, err := h.contributionsRepo.GroupParticipatesInReleaseVersion(c.Request.Context(), fansubID, *releaseVersionID)
	if err != nil {
		log.Printf("anime contributions: release version participation check error (fansub_id=%d, release_version_id=%d): %v", fansubID, *releaseVersionID, err)
		internalError(c, "interner serverfehler")
		return false
	}
	if !participates {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "Diese Gruppe war an der gewählten Release-Version nicht beteiligt.",
			},
		})
		return false
	}
	return true
}

var historicalContributionStatuses = map[string]struct{}{
	"draft":      {},
	"historical": {},
	"confirmed":  {},
	"disputed":   {},
}

var historicalContributionVisibilities = map[string]struct{}{
	"internal": {},
	"public":   {},
}

func normalizeHistoricalContributionStatus(value string) (string, bool) {
	if value == "" {
		return "historical", true
	}
	_, ok := historicalContributionStatuses[value]
	return value, ok
}

func validHistoricalContributionStatus(value string) bool {
	_, ok := historicalContributionStatuses[value]
	return ok
}

func normalizeHistoricalContributionVisibility(value string) (string, bool) {
	if value == "" {
		return "internal", true
	}
	_, ok := historicalContributionVisibilities[value]
	return value, ok
}

func validHistoricalContributionVisibility(value string) bool {
	_, ok := historicalContributionVisibilities[value]
	return ok
}
