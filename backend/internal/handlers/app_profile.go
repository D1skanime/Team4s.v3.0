package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
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
	DisplayName       models.OptionalString  `json:"display_name"`
	FansubName        models.OptionalString  `json:"fansub_name"`
	Bio               models.OptionalString  `json:"bio"`
	MemberStory       models.OptionalString  `json:"member_story"`
	MemberStoryJSON   models.OptionalRawJSON `json:"member_story_json"`
	MemberStoryHTML   models.OptionalString  `json:"member_story_html"`
	ActiveFromYear    models.OptionalInt32   `json:"active_from_year"`
	ActiveUntilYear   models.OptionalInt32   `json:"active_until_year"`
	IsCurrentlyActive models.OptionalBool    `json:"is_currently_active"`
	ProfileVisibility models.OptionalString  `json:"profile_visibility"`
	Email             models.OptionalString  `json:"email"`
	KeycloakSubject   models.OptionalString  `json:"keycloak_subject"`
}

var avatarAllowedImageMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
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

	input := models.MemberProfileUpdateInput{
		DisplayName:       req.DisplayName,
		FansubName:        req.FansubName,
		Bio:               req.Bio,
		MemberStory:       req.MemberStory,
		ActiveFromYear:    req.ActiveFromYear,
		ActiveUntilYear:   req.ActiveUntilYear,
		IsCurrentlyActive: req.IsCurrentlyActive,
		ProfileVisibility: req.ProfileVisibility,
	}
	if req.MemberStoryHTML.Set {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "profilgeschichte-html wird serverseitig erzeugt"}})
		return
	}
	if err := h.prepareMemberStoryRichText(&input, req.MemberStoryJSON, req.MemberStory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	profile, err := h.profileRepo.UpdateOwnProfile(c.Request.Context(), identity.AppUserID, input)
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

func (h *AppAuthHandler) prepareMemberStoryRichText(
	input *models.MemberProfileUpdateInput,
	storyJSON models.OptionalRawJSON,
	plainStory models.OptionalString,
) error {
	if input == nil {
		return nil
	}
	if storyJSON.Set {
		input.MemberStoryJSON = storyJSON
		return h.renderMemberStoryRichText(input, storyJSON.Value)
	}
	if !plainStory.Set {
		return nil
	}

	var raw *json.RawMessage
	if plainStory.Value != nil {
		doc, err := plainTextToTipTapDoc(*plainStory.Value)
		if err != nil {
			return fmt.Errorf("profilgeschichte konnte nicht vorbereitet werden")
		}
		if len(doc) > 0 {
			raw = &doc
		}
	}
	input.MemberStoryJSON = models.OptionalRawJSON{Set: true, Value: raw}
	return h.renderMemberStoryRichText(input, raw)
}

func (h *AppAuthHandler) renderMemberStoryRichText(input *models.MemberProfileUpdateInput, raw *json.RawMessage) error {
	if input == nil {
		return nil
	}
	text := ""
	if raw == nil {
		input.MemberStoryHTML = models.OptionalString{Set: true, Value: nil}
		input.MemberStoryText = models.OptionalString{Set: true, Value: &text}
		input.MemberStoryEditorType = models.OptionalString{Set: true, Value: profileStringPtr("tiptap")}
		input.MemberStoryContentSchemaVersion = models.OptionalInt32{Set: true, Value: profileInt32Ptr(1)}
		return nil
	}
	if h.tiptapSvc == nil {
		return fmt.Errorf("profilgeschichte-service ist nicht verfügbar")
	}
	bodyJSON := strings.TrimSpace(string(*raw))
	if err := h.tiptapSvc.ValidateJSON(bodyJSON); err != nil {
		return fmt.Errorf("nicht erlaubter Editor-Inhalt: %w", err)
	}
	html, err := h.tiptapSvc.RenderHTML(bodyJSON)
	if err != nil {
		return fmt.Errorf("profilgeschichte konnte nicht gerendert werden")
	}
	extracted, err := h.tiptapSvc.ExtractText(bodyJSON)
	if err != nil {
		return fmt.Errorf("profilgeschichte-text konnte nicht extrahiert werden")
	}
	text = extracted
	input.MemberStoryHTML = models.OptionalString{Set: true, Value: &html}
	input.MemberStoryText = models.OptionalString{Set: true, Value: &text}
	input.MemberStoryEditorType = models.OptionalString{Set: true, Value: profileStringPtr("tiptap")}
	input.MemberStoryContentSchemaVersion = models.OptionalInt32{Set: true, Value: profileInt32Ptr(1)}
	if input.MemberStory.Value == nil || strings.TrimSpace(*input.MemberStory.Value) == "" {
		input.MemberStory = models.OptionalString{Set: true, Value: &text}
	}
	return nil
}

func plainTextToTipTapDoc(value string) (json.RawMessage, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	doc := map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{
				"type": "paragraph",
				"content": []map[string]any{
					{"type": "text", "text": trimmed},
				},
			},
		},
	}
	data, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(data), nil
}

func profileStringPtr(value string) *string {
	return &value
}

func profileInt32Ptr(value int32) *int32 {
	return &value
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

	sourceHeader, croppedHeader, err := readAvatarUploadFileHeaders(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "keine datei hochgeladen"}})
		return
	}

	croppedFile, err := croppedHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Datei konnte nicht geöffnet werden.")
		return
	}
	defer croppedFile.Close()

	mimeType, width, height, ext, err := detectAvatarImage(croppedFile, croppedHeader.Size)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	if _, err := croppedFile.Seek(0, 0); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Datei konnte nicht vorbereitet werden.")
		return
	}

	sourceFile, err := sourceHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Original konnte nicht geöffnet werden.")
		return
	}
	defer sourceFile.Close()

	sourceMimeType, _, _, sourceExt, err := detectAvatarImage(sourceFile, sourceHeader.Size)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	sourceExt = avatarSourceExtFromMime(sourceMimeType)
	if _, err := sourceFile.Seek(0, 0); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Original konnte nicht vorbereitet werden.")
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
	sourceFilename := "source_original." + sourceExt
	relativePath := relativeDir + "/" + filename
	relativeSourcePath := relativeDir + "/" + sourceFilename
	absoluteDir := filepath.Join(h.mediaStorageDir, "profile", fmt.Sprintf("%d", profile.MemberID), "avatar", mediaID)
	absolutePath := filepath.Join(absoluteDir, filename)
	absoluteSourcePath := filepath.Join(absoluteDir, sourceFilename)

	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Verzeichnis konnte nicht erstellt werden.")
		return
	}

	img, _, err := image.Decode(croppedFile)
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
	if err := copyMultipartFileToPath(sourceFile, absoluteSourcePath); err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Original konnte nicht gespeichert werden.")
		return
	}

	sizeBytes, err := fileSize(absolutePath)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Größe konnte nicht bestimmt werden.")
		return
	}

	sourceSizeBytes, err := fileSize(absoluteSourcePath)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar-Originalgröße konnte nicht bestimmt werden.")
		return
	}

	updatedProfile, err := h.profileRepo.AttachUploadedAvatar(c.Request.Context(), identity.AppUserID, models.MemberProfileAvatarUploadInput{
		FilePath:        relativePath,
		SourceFilePath:  relativeSourcePath,
		PublicURL:       strings.TrimRight(h.mediaBaseURL, "/") + relativePath,
		MimeType:        mimeType,
		SourceMimeType:  sourceMimeType,
		SizeBytes:       sizeBytes,
		SourceSizeBytes: sourceSizeBytes,
		Width:           &width,
		Height:          &height,
	})
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Avatar konnte nicht verknüpft werden.")
		return
	}

	cleanupPreviousAvatarFiles(h.mediaStorageDir, profile.Avatar)

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

func readAvatarUploadFileHeaders(c *gin.Context) (*multipart.FileHeader, *multipart.FileHeader, error) {
	croppedHeader, err := c.FormFile("cropped_file")
	if err == nil {
		sourceHeader, sourceErr := c.FormFile("source_file")
		if sourceErr != nil {
			return nil, nil, sourceErr
		}
		return sourceHeader, croppedHeader, nil
	}

	fileHeader, fallbackErr := c.FormFile("file")
	if fallbackErr != nil {
		return nil, nil, fallbackErr
	}
	return fileHeader, fileHeader, nil
}

func copyMultipartFileToPath(file multipart.File, targetPath string) error {
	target, err := os.Create(targetPath)
	if err != nil {
		return err
	}
	defer target.Close()

	_, err = io.Copy(target, file)
	return err
}

func cleanupPreviousAvatarFiles(mediaStorageDir string, avatar *models.MediaAsset) {
	if avatar == nil || strings.TrimSpace(avatar.StoragePath) == "" {
		return
	}
	trimmed := strings.TrimPrefix(strings.TrimSpace(avatar.StoragePath), "/")
	trimmed = strings.TrimPrefix(trimmed, "media/")
	targetDir := filepath.Dir(filepath.Join(mediaStorageDir, trimmed))
	if ok, err := isUploadPathWithinBase(mediaStorageDir, targetDir); err == nil && ok {
		_ = os.RemoveAll(targetDir)
	}
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
	if !avatarAllowedImageMimeTypes[mimeType] {
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

func avatarSourceExtFromMime(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func fileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}
