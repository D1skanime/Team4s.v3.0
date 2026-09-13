package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// CreateReleaseStreamGrant stellt ein zeitlich begrenztes Stream-Grant-Token für eine Release-Version aus.
func (h *FansubHandler) CreateReleaseStreamGrant(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	versionID, variantIDs, err := parseReleaseStreamSelection(c)
	if err != nil {
		badRequest(c, "ungültige release id")
		return
	}
	actor := permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	if !h.allowReleasePlayback(c, actor, versionID) {
		return
	}

	if _, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID, variantIDs...); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("release stream grant: repo error (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if h.releaseGrantTTL <= 0 || strings.TrimSpace(h.releaseGrantSecret) == "" {
		log.Printf("release stream grant: grant config unavailable (release_id=%d, user_id=%d)", versionID, identity.UserID)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "stream grant vorübergehend nicht verfügbar"}})
		return
	}

	grantToken, expiresAt, err := auth.CreateReleaseStreamGrant(versionID, identity.AppUserID, h.releaseGrantSecret, time.Now(), h.releaseGrantTTL)
	if err != nil {
		log.Printf("release stream grant: signing failed (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"release_id":  versionID,
			"grant_token": grantToken,
			"expires_at":  expiresAt,
			"ttl_seconds": int64(h.releaseGrantTTL / time.Second),
			"issued_for":  identity.AppUserID,
		},
	})
}

func (h *FansubHandler) authorizeReleaseStream(c *gin.Context, versionID int64) bool {
	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return false
	}

	if strings.TrimSpace(h.releaseGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "stream grant vorübergehend nicht verfügbar"}})
		return false
	}

	claims, err := auth.ParseAndVerifyReleaseStreamGrant(grantToken, h.releaseGrantSecret, time.Now())
	if err != nil || claims.ReleaseID != versionID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungültiger stream grant"}})
		return false
	}
	actor := permissions.Actor{AppUserID: claims.UserID, Status: "active"}
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok && identity.AppUserID == claims.UserID {
		actor = permissions.Actor{AppUserID: identity.AppUserID, Status: identity.AppUserStatus, IsPlatformAdmin: identity.IsPlatformAdmin}
	}
	return h.allowReleasePlayback(c, actor, versionID)
}

// parseReleaseStreamSelection shares the explicit contract between grant and stream.
// Legacy paths retain their parser; selectors require complete decimal IDs and no duplicates.
func parseReleaseStreamSelection(c *gin.Context) (int64, []int64, error) {
	rawVersionID := c.Param("id")
	versionID, err := parseEpisodeVersionID(rawVersionID)
	if err != nil {
		return 0, nil, err
	}
	values, present := c.Request.URL.Query()["variant_id"]
	if !present {
		return versionID, nil, nil
	}
	if len(values) != 1 {
		return 0, nil, strconv.ErrSyntax
	}
	for _, raw := range []string{rawVersionID, values[0]} {
		if raw == "" || strings.IndexFunc(raw, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
			return 0, nil, strconv.ErrSyntax
		}
	}
	variantID, err := parseEpisodeVersionID(values[0])
	if err != nil {
		return 0, nil, err
	}
	return versionID, []int64{variantID}, nil
}
