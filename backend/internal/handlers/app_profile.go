package handlers

import (
	"context"
	"errors"
	"fmt"
	"image"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type memberProfileStore interface {
	GetOwnProfile(ctx context.Context, appUserID int64) (*models.MemberProfile, error)
	UpdateOwnProfile(ctx context.Context, appUserID int64, input models.MemberProfileUpdateInput) (*models.MemberProfile, error)
	AttachUploadedAvatar(ctx context.Context, appUserID int64, input models.MemberProfileAvatarUploadInput) (*models.MemberProfile, error)
}

type updateOwnProfileRequest struct {
	DisplayName       models.OptionalString `json:"display_name"`
	FansubName        models.OptionalString `json:"fansub_name"`
	Bio               models.OptionalString `json:"bio"`
	MemberStory       models.OptionalString `json:"member_story"`
	ActiveFromYear    models.OptionalInt32  `json:"active_from_year"`
	ActiveUntilYear   models.OptionalInt32  `json:"active_until_year"`
	IsCurrentlyActive models.OptionalBool   `json:"is_currently_active"`
	ProfileVisibility models.OptionalString `json:"profile_visibility"`
	Email             models.OptionalString `json:"email"`
	KeycloakSubject   models.OptionalString `json:"keycloak_subject"`
}

func (h *AppAuthHandler) GetOwnProfile(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}
	if h.profileRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	profile, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "profil wurde nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht geladen werden.")
		return
	}

	h.applyProfileCapabilities(profile, identity)
	c.JSON(http.StatusOK, gin.H{"data": profile})
}

func (h *AppAuthHandler) UpdateOwnProfile(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}
	if h.profileRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}
	if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "deaktivierte benutzer dürfen ihr profil nicht ändern"}})
		return
	}

	var req updateOwnProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige anfrage"}})
		return
	}
	if req.Email.Set || req.KeycloakSubject.Set {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "e-mail und keycloak-identität sind hier nur lesbar"}})
		return
	}

	before, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht vor dem Speichern geladen werden.")
		return
	}

	profile, err := h.profileRepo.UpdateOwnProfile(c.Request.Context(), identity.AppUserID, models.MemberProfileUpdateInput{
		DisplayName:       req.DisplayName,
		FansubName:        req.FansubName,
		Bio:               req.Bio,
		MemberStory:       req.MemberStory,
		ActiveFromYear:    req.ActiveFromYear,
		ActiveUntilYear:   req.ActiveUntilYear,
		IsCurrentlyActive: req.IsCurrentlyActive,
		ProfileVisibility: req.ProfileVisibility,
	})
	if err != nil {
		if errors.Is(err, repository.ErrValidation) {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "profilfelder sind ungültig"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht gespeichert werden.")
		return
	}

	h.applyProfileCapabilities(profile, identity)
	h.auditProfileUpdated(c, identity, before, profile)
	c.JSON(http.StatusOK, gin.H{"data": profile})
}

func (h *AppAuthHandler) UploadOwnProfileAvatar(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}
	if h.profileRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}
	if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "deaktivierte benutzer dürfen keinen avatar hochladen"}})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "keine datei hochgeladen"}})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Datei konnte nicht geöffnet werden.")
		return
	}
	defer file.Close()

	mimeType, width, height, ext, err := detectAvatarImage(file, fileHeader.Size)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	if _, err := file.Seek(0, 0); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Datei konnte nicht vorbereitet werden.")
		return
	}

	profile, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht vor dem Avatar-Upload geladen werden.")
		return
	}

	mediaID := uuid.New().String()
	relativeDir := fmt.Sprintf("/media/profile/%d/avatar/%s", profile.MemberID, mediaID)
	filename := "original." + ext
	relativePath := relativeDir + "/" + filename
	absoluteDir := filepath.Join(h.mediaStorageDir, "profile", fmt.Sprintf("%d", profile.MemberID), "avatar", mediaID)
	absolutePath := filepath.Join(absoluteDir, filename)

	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Verzeichnis konnte nicht erstellt werden.")
		return
	}

	img, _, err := image.Decode(file)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild konnte nicht gelesen werden"}})
		return
	}
	if err := imaging.Save(img, absolutePath); err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar konnte nicht gespeichert werden.")
		return
	}

	sizeBytes, err := fileSize(absolutePath)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Größe konnte nicht bestimmt werden.")
		return
	}

	updatedProfile, err := h.profileRepo.AttachUploadedAvatar(c.Request.Context(), identity.AppUserID, models.MemberProfileAvatarUploadInput{
		FilePath:  relativePath,
		PublicURL: strings.TrimRight(h.mediaBaseURL, "/") + relativePath,
		MimeType:  mimeType,
		SizeBytes: sizeBytes,
		Width:     &width,
		Height:    &height,
	})
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar konnte nicht verknüpft werden.")
		return
	}

	h.applyProfileCapabilities(updatedProfile, identity)
	if h.auditLogRepo != nil {
		actorAppUserID := identity.AppUserID
		actorLegacyUserID := identity.UserID
		memberID := updatedProfile.MemberID
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &actorAppUserID,
			ActorLegacyUserID: &actorLegacyUserID,
			EventType:         "member_profile.avatar.updated",
			ScopeType:         "member_profile",
			ScopeID:           &memberID,
			TargetType:        "member",
			TargetID:          &memberID,
			Action:            "member_profile.avatar.update",
			Outcome:           "success",
			Payload: map[string]any{
				"mime_type":  mimeType,
				"size_bytes": sizeBytes,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedProfile})
}

func (h *AppAuthHandler) applyProfileCapabilities(profile *models.MemberProfile, identity middleware.AuthIdentity) {
	if profile == nil {
		return
	}
	keycloakAccountURL := h.resolveKeycloakAccountURL(identity)
	if keycloakAccountURL != nil {
		profile.KeycloakAccountURL = keycloakAccountURL
	}
	canMutate := strings.TrimSpace(identity.AppUserStatus) != models.AppUserStatusDisabled
	profile.Capabilities = models.MemberProfileCapabilities{
		CanViewOwnProfile:      identity.AppUserID > 0,
		CanEditOwnProfile:      identity.AppUserID > 0 && canMutate,
		CanUploadOwnAvatar:     identity.AppUserID > 0 && canMutate,
		CanOpenKeycloakAccount: keycloakAccountURL != nil,
		CanViewMemberships:     true,
		CanViewHistoricalCreds: true,
	}
}

func (h *AppAuthHandler) resolveKeycloakAccountURL(identity middleware.AuthIdentity) *string {
	if strings.TrimSpace(h.keycloakAccountURL) != "" {
		value := strings.TrimSpace(h.keycloakAccountURL)
		return &value
	}
	if h.keycloakVerifier == nil {
		return nil
	}
	issuer := strings.TrimSpace(h.keycloakVerifier.IssuerURL())
	if issuer == "" {
		return nil
	}
	value := strings.TrimRight(issuer, "/") + "/account"
	return &value
}

func (h *AppAuthHandler) auditProfileUpdated(
	c *gin.Context,
	identity middleware.AuthIdentity,
	before *models.MemberProfile,
	after *models.MemberProfile,
) {
	if h.auditLogRepo == nil || after == nil {
		return
	}
	actorAppUserID := identity.AppUserID
	actorLegacyUserID := identity.UserID
	memberID := after.MemberID
	payload := map[string]any{
		"display_name":       after.DisplayName,
		"fansub_name":        after.FansubName,
		"profile_visibility": after.ProfileVisibility,
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &actorAppUserID,
		ActorLegacyUserID: &actorLegacyUserID,
		EventType:         "member_profile.updated",
		ScopeType:         "member_profile",
		ScopeID:           &memberID,
		TargetType:        "member",
		TargetID:          &memberID,
		Action:            "member_profile.update",
		Outcome:           "success",
		Payload:           payload,
	})
	if before != nil && before.ProfileVisibility != after.ProfileVisibility {
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &actorAppUserID,
			ActorLegacyUserID: &actorLegacyUserID,
			EventType:         "member_profile.visibility.changed",
			ScopeType:         "member_profile",
			ScopeID:           &memberID,
			TargetType:        "member",
			TargetID:          &memberID,
			Action:            "member_profile.visibility.update",
			Outcome:           "success",
			Payload: map[string]any{
				"before": before.ProfileVisibility,
				"after":  after.ProfileVisibility,
			},
		})
	}
}

func detectAvatarImage(file multipart.File, size int64) (string, int, int, string, error) {
	if size <= 0 {
		return "", 0, 0, "", fmt.Errorf("avatar-datei ist leer")
	}
	if size > maxImageSize {
		return "", 0, 0, "", fmt.Errorf("avatar ist zu groß")
	}

	detectedMime, err := mimetype.DetectReader(file)
	if err != nil {
		return "", 0, 0, "", fmt.Errorf("avatar-typ konnte nicht erkannt werden")
	}
	mimeType := strings.ToLower(strings.TrimSpace(detectedMime.String()))
	if !allowedImageMimeTypes[mimeType] {
		return "", 0, 0, "", fmt.Errorf("nur bilddateien sind als avatar erlaubt")
	}
	if _, err := file.Seek(0, 0); err != nil {
		return "", 0, 0, "", fmt.Errorf("avatar-datei konnte nicht vorbereitet werden")
	}

	cfg, _, err := image.DecodeConfig(file)
	if err != nil {
		return "", 0, 0, "", fmt.Errorf("avatar-bild konnte nicht gelesen werden")
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return "", 0, 0, "", fmt.Errorf("avatar-bild ist ungültig")
	}
	return mimeType, cfg.Width, cfg.Height, imageExtFromMime(mimeType), nil
}

func fileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}
