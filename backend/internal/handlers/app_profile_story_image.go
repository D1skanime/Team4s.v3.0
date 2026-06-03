package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"image"
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

var storyImageAllowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

const storyImageMaxSize = 10 * 1024 * 1024 // 10 MB (D-17)

// UploadOwnProfileStoryImage implementiert POST /api/v1/me/profile/story-images.
// Pflichtfeld: multipart "image" (jpg/png/webp, max 10 MB).
// Validierungen: MIME-Allowlist (D-16), Groessenlimit (D-17), Pixel-Bomb-Guard (D-19),
// EXIF-Strip via imaging.Save (D-19), Resize auf max 1600px.
// Pfad: /media/profile/{memberID}/story/{uuid}/original.{ext} (D-08).
func (h *AppAuthHandler) UploadOwnProfileStoryImage(c *gin.Context) {
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
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "deaktivierte benutzer dürfen keine story-bilder hochladen"}})
		return
	}

	fileHeader, err := c.FormFile("image")
	if err != nil || fileHeader == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "keine bild-datei hochgeladen"}})
		return
	}

	// Groessen-Check vor MIME-Detect (D-17)
	if fileHeader.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild-datei ist leer"}})
		return
	}
	if fileHeader.Size > storyImageMaxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "story-bild ist zu groß (max 10 MB)"}})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild-Datei konnte nicht geoeffnet werden.")
		return
	}
	defer file.Close()

	// MIME-Detect via Magic-Bytes (D-16)
	detectedMime, err := mimetype.DetectReader(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild-typ konnte nicht erkannt werden"}})
		return
	}
	mimeType := strings.ToLower(strings.TrimSpace(detectedMime.String()))
	if !storyImageAllowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "nur jpg, png und webp sind erlaubt"}})
		return
	}

	// Zurueck zum Anfang fuer image.DecodeConfig
	if _, err := file.Seek(0, 0); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht vorbereitet werden.")
		return
	}

	// Pixel-Bomb-Guard: Nur Header lesen, kein vollstaendiges Decode (D-19)
	cfg, _, err := image.DecodeConfig(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild konnte nicht gelesen werden"}})
		return
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild ist ungültig (leere dimensionen)"}})
		return
	}
	if cfg.Width*cfg.Height > 40_000_000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild enthält zu viele pixel (max 40 MP)"}})
		return
	}

	// Profil laden fuer MemberID (Pfad-Konstruktion, owner_member_id)
	profile, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht vor dem Story-Bild-Upload geladen werden.")
		return
	}

	ext := imageExtFromMime(mimeType)
	mediaID := uuid.New().String()
	relativeDir := fmt.Sprintf("/media/profile/%d/story/%s", profile.MemberID, mediaID)
	filename := "original." + ext
	relativePath := relativeDir + "/" + filename
	absoluteDir := filepath.Join(h.mediaStorageDir, "profile", fmt.Sprintf("%d", profile.MemberID), "story", mediaID)
	absolutePath := filepath.Join(absoluteDir, filename)

	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild-Verzeichnis konnte nicht erstellt werden.")
		return
	}

	// Zurueck zum Anfang fuer vollstaendiges Decode
	if _, err := file.Seek(0, 0); err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht vorbereitet werden.")
		return
	}

	img, _, err := image.Decode(file)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild konnte nicht dekodiert werden"}})
		return
	}

	// Resize auf max 1600px Breite (D-19)
	if cfg.Width > 1600 {
		img = imaging.Resize(img, 1600, 0, imaging.Lanczos)
	}

	// EXIF-Strip: imaging.Save re-enkodiert ohne EXIF-Metadaten (D-19)
	if err := imaging.Save(img, absolutePath); err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht gespeichert werden.")
		return
	}

	sizeBytes, err := fileSize(absolutePath)
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild-Groesse konnte nicht bestimmt werden.")
		return
	}

	// media_assets INSERT mit owner_member_id (D-08, D-03)
	newAssetID, err := h.profileRepo.InsertStoryImageAsset(c.Request.Context(), models.StoryImageUploadInput{
		FilePath:      relativePath,
		MimeType:      mimeType,
		SizeBytes:     sizeBytes,
		Width:         cfg.Width,
		Height:        cfg.Height,
		OwnerMemberID: profile.MemberID,
	})
	if err != nil {
		_ = os.RemoveAll(absoluteDir)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht in der Datenbank gespeichert werden.")
		return
	}

	// Audit-Log (Observability)
	if h.auditLogRepo != nil {
		actorAppUserID := identity.AppUserID
		actorLegacyUserID := identity.UserID
		memberID := profile.MemberID
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    &actorAppUserID,
			ActorLegacyUserID: &actorLegacyUserID,
			EventType:         "member_profile.story_image.uploaded",
			ScopeType:         "member_profile",
			ScopeID:           &memberID,
			TargetType:        "member",
			TargetID:          &memberID,
			Action:            "member_profile.story_image.upload",
			Outcome:           "success",
			Payload: map[string]any{
				"mime_type":      mimeType,
				"size_bytes":     sizeBytes,
				"media_asset_id": newAssetID,
			},
		})
	}

	c.JSON(http.StatusCreated, gin.H{"data": gin.H{
		"media_asset_id": newAssetID,
		"public_url":     strings.TrimRight(h.mediaBaseURL, "/") + relativePath,
	}})
}

// extractStoryImageIDsFromJSON parst ein TipTap-JSON-Dokument und sammelt alle
// media_asset_id-Werte aus Nodes mit type="image".
// Gibt ein leeres Slice zurueck wenn kein Image-Node vorhanden ist.
func extractStoryImageIDsFromJSON(bodyJSON []byte) []int64 {
	if len(bodyJSON) == 0 {
		return nil
	}
	var doc map[string]interface{}
	if err := json.Unmarshal(bodyJSON, &doc); err != nil {
		return nil
	}
	var ids []int64
	collectStoryImageIDs(doc, &ids)
	return ids
}

func collectStoryImageIDs(node map[string]interface{}, ids *[]int64) {
	nodeType, _ := node["type"].(string)
	if nodeType == "image" {
		if attrs, ok := node["attrs"].(map[string]interface{}); ok {
			if rawID, ok := attrs["media_asset_id"]; ok && rawID != nil {
				switch v := rawID.(type) {
				case float64:
					if v > 0 {
						*ids = append(*ids, int64(v))
					}
				case int64:
					if v > 0 {
						*ids = append(*ids, v)
					}
				}
			}
		}
	}
	if content, ok := node["content"].([]interface{}); ok {
		for _, child := range content {
			if childMap, ok := child.(map[string]interface{}); ok {
				collectStoryImageIDs(childMap, ids)
			}
		}
	}
}

// cleanupStoryImageAsset loescht Datei und Verzeichnis fuer ein einzelnes Story-Bild-Asset.
// Wird von UpdateOwnProfile nach dem Referenz-Diff aufgerufen (Cleanup-on-Save, D-22).
// Path-Traversal-Guard: isUploadPathWithinBase wird vor os.RemoveAll geprueft.
func cleanupStoryImageAsset(mediaStorageDir string, storagePath string) {
	if strings.TrimSpace(storagePath) == "" {
		return
	}
	trimmed := strings.TrimPrefix(strings.TrimSpace(storagePath), "/")
	trimmed = strings.TrimPrefix(trimmed, "media/")
	targetDir := filepath.Dir(filepath.Join(mediaStorageDir, trimmed))
	if ok, err := isUploadPathWithinBase(mediaStorageDir, targetDir); err == nil && ok {
		_ = os.RemoveAll(targetDir)
	}
}

// Sicherstellen dass der Kontext-Import benoetigt wird
var _ context.Context
