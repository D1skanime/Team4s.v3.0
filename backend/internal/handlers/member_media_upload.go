package handlers

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// parseMemberMediaVisibilityReview liest visibility_code und review_status_code aus
// dem FormData einer Member-Media-Upload-Anfrage und validiert sie gegen die Whitelist.
// owner_member_id wird NIEMALS aus dem Request gelesen — ausschließlich aus dem
// authentifizierten Session-Context (Lock I, T-79-02-05).
//
// Rückgabe: (visibilityCode, reviewStatusCode, ok).
// Bei ok=false wurde bereits ein Fehler-Response geschrieben.
func parseMemberMediaVisibilityReview(c *gin.Context) (string, string, bool) {
	visibilityCode := strings.TrimSpace(c.PostForm("visibility_code"))
	reviewStatusCode := strings.TrimSpace(c.PostForm("review_status_code"))

	// Whitelist-Validierung (T-79-02-01)
	if visibilityCode != "" && !validVisibilityCodes[visibilityCode] {
		badRequest(c, "ungültiger visibility_code")
		return "", "", false
	}
	if reviewStatusCode != "" && !validReviewStatusCodes[reviewStatusCode] {
		badRequest(c, "ungültiger review_status_code")
		return "", "", false
	}

	return visibilityCode, reviewStatusCode, true
}

// applyBrandingDefaults setzt Branding-Defaults (public/approved) wenn die Codes leer sind.
// Gilt für Identity-/Branding-Slots: Avatar, Profil-Hintergrund (D-09).
func applyBrandingDefaults(visibilityCode, reviewStatusCode string) (string, string) {
	if visibilityCode == "" {
		visibilityCode = "public"
	}
	if reviewStatusCode == "" {
		reviewStatusCode = "approved"
	}
	return visibilityCode, reviewStatusCode
}

// applyProzessmedienDefaults setzt Prozessmedien-Defaults (private/in_review) wenn die Codes leer sind.
// Gilt für Prozessmedien: Story-Bilder (D-03).
func applyProzessmedienDefaults(visibilityCode, reviewStatusCode string) (string, string) {
	if visibilityCode == "" {
		visibilityCode = "private"
	}
	if reviewStatusCode == "" {
		reviewStatusCode = "in_review"
	}
	return visibilityCode, reviewStatusCode
}
