package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// UploadOwnProfileStoryImage ist ein Stub fuer den Story-Bild-Upload-Handler.
// TODO(plan-70-04): vollstaendig implementieren:
//   - POST multipart/form-data, field "image"
//   - MIME-Validierung: nur image/jpeg, image/png, image/webp (kein GIF, D-16)
//   - Groessenvalidierung: max 10 MB (D-17), max 40_000_000 Pixel W×H (D-19)
//   - EXIF-Strip via bestehender Upload-Security-Hardening-Logik (D-19, Quick-Task 260510-t7j)
//   - Speicherung unter /media/profile/{memberID}/story/{mediaID}/original.{ext}
//   - media_assets-Zeile anlegen mit Member-Owner-Bindung
//   - Response: {"data": {"media_asset_id": N, "public_url": "..."}}
func (h *AppAuthHandler) UploadOwnProfileStoryImage(c *gin.Context) {
	// Stub: gibt 501 Not Implemented zurueck bis Plan 70-04 den Handler implementiert
	c.JSON(http.StatusNotImplemented, gin.H{"error": gin.H{"message": "story-bild-upload ist noch nicht implementiert"}})
}
