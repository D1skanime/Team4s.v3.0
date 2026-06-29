package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Kanonische Enum-Wert-Sets (identisch zu 78-RESEARCH.md "Offene Fragen RESOLVED") ---

// validVisibilityValues enthält die erlaubten API-seitigen Sichtbarkeitswerte.
var validVisibilityValues = map[string]struct{}{
	"intern":      {},
	"oeffentlich": {},
}

// validReviewStatusValues enthält die erlaubten API-seitigen Reviewstatus-Werte.
var validReviewStatusValues = map[string]struct{}{
	"in_pruefung": {},
	"freigegeben": {},
	"abgelehnt":   {},
	"archiviert":  {},
	"entfernt":    {},
}

var validFansubGroupMediaCategories = map[string]struct{}{
	"gallery":            {},
	"history_screenshot": {},
	"old_website":        {},
	"forum":              {},
	"irc_chat":           {},
	"event_meeting":      {},
	"artwork_fanart":     {},
	"other":              {},
}

// --- Interfaces ---

// FansubMediaReviewRepository definiert die Mutations-Operationen für den PATCH-Handler.
// Das Interface ermöglicht Stub-Tests ohne Datenbankverbindung.
// Enthält bewusst nur die Methoden, die für PatchFansubMediaReview benötigt werden.
// WICHTIG: Methodennamen sind identisch zu den Stub-Signaturen in fansub_media_review_handler_test.go.
type FansubMediaReviewRepository interface {
	// UpdateFansubMediaReview setzt ausschließlich visibility/review_status eines Mediums.
	// Die WHERE-Klausel erzwingt fansubID-Zugehörigkeit (Tampering-Mitigation T-78-08).
	// Ändert NIEMALS owner_type/owner_id (D-05).
	UpdateFansubMediaReview(ctx context.Context, fansubGroupID, mediaID int64, patch repository.FansubMediaReviewPatch) error

	// GetFansubMediaOwner gibt zurück, welcher Gruppe das Medium gehört (Cross-Group-Prüfung T-78-03).
	GetFansubMediaOwner(ctx context.Context, mediaID int64) (int64, error)
	UpdateFansubGroupMediaMetadata(ctx context.Context, fansubGroupID, mediaID int64, patch repository.FansubGroupMediaMetadataPatch) error
	ReorderFansubGroupMedia(ctx context.Context, fansubGroupID int64, mediaIDs []int64) error
	GetFansubGroupMediaPermissionsForAppUser(ctx context.Context, fansubGroupID int64, appUserID int64) (models.FansubGroupMediaPermissions, error)
}

// FansubMediaListRepository definiert die Lese-Operation für den GET-Listen-Handler.
// Separates Interface — ermöglicht unabhängige Stub-Tests für List vs. Patch.
type FansubMediaListRepository interface {
	// ListFansubGroupMediaForReview liest alle Medienassets einer Gruppe mit
	// Sichtbarkeit/Reviewstatus/Owner-Info. Scoped strikt auf fansubGroupID (IDOR-Schutz D-04).
	ListFansubGroupMediaForReview(ctx context.Context, fansubGroupID int64, actorAppUserID *int64) ([]repository.FansubGroupMediaReviewRow, error)
}

// mediaReviewPermChecker abstrahiert den Permission-Service für den Handler.
type mediaReviewPermChecker interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubID int64) (permissions.Result, error)
}

// --- Handler ---

// FansubMediaReviewHandler liefert GET-Liste + PATCH für Sichtbarkeit/Reviewstatus
// von Gruppenmedien (Lock G: korrekte Owner-Tabelle fansub_group_media / media_assets).
type FansubMediaReviewHandler struct {
	repo          FansubMediaReviewRepository
	listRepo      FansubMediaListRepository
	permissionSvc mediaReviewPermChecker
	auditLogRepo  auditLogWriter
}

// NewFansubMediaReviewHandler erstellt einen FansubMediaReviewHandler mit den erforderlichen Abhängigkeiten.
// repo muss sowohl FansubMediaReviewRepository als auch FansubMediaListRepository implementieren.
func NewFansubMediaReviewHandler(
	repo FansubMediaReviewRepository,
	permissionSvc mediaReviewPermChecker,
	auditLogRepo auditLogWriter,
) *FansubMediaReviewHandler {
	// Versuche, das optionale List-Interface zu extrahieren
	var listRepo FansubMediaListRepository
	if lr, ok := repo.(FansubMediaListRepository); ok {
		listRepo = lr
	}
	return &FansubMediaReviewHandler{
		repo:          repo,
		listRepo:      listRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
	}
}

// fansubGroupMediaItemResponse ist die API-Antwortstruktur für einen Medieneintrag.
type fansubGroupMediaItemResponse struct {
	ID                    int64   `json:"id"`
	PreviewURL            string  `json:"preview_url,omitempty"`
	ThumbnailURL          string  `json:"thumbnail_url,omitempty"`
	OriginalURL           string  `json:"original_url,omitempty"`
	Visibility            *string `json:"visibility"`
	ReviewStatus          *string `json:"review_status"`
	Title                 *string `json:"title"`
	Description           *string `json:"description"`
	AltText               *string `json:"alt_text"`
	Category              string  `json:"category"`
	SortOrder             int     `json:"sort_order"`
	UploadedByName        *string `json:"uploaded_by_display_name"`
	UploadedByCurrentUser bool    `json:"uploaded_by_current_user"`
	CreatedAt             string  `json:"created_at"`
	UpdatedAt             *string `json:"updated_at,omitempty"`
	OwnerType             string  `json:"owner_type"`
	OwnerID               int64   `json:"owner_id"`
	OwnerConsistent       bool    `json:"owner_consistent"`
}

// fansubGroupMediaListResponse ist die Listenstruktur.
type fansubGroupMediaListResponse struct {
	Data []fansubGroupMediaItemResponse `json:"data"`
}

type fansubGroupMediaReorderBody struct {
	MediaIDs []int64 `json:"mediaIds"`
}

// ListFansubGroupMedia gibt alle Gruppenmedien für den Review-Tab zurück.
// GET /api/v1/admin/fansubs/:id/media
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupEdit (D-08).
// Deny-Audit: "fansub_group_media.list.denied" (D-09).
func (h *FansubMediaReviewHandler) ListFansubGroupMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für Medien-Liste konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		customPerms, permErr := h.repo.GetFansubGroupMediaPermissionsForAppUser(c.Request.Context(), fansubID, identity.AppUserID)
		if permErr != nil {
			writePermissionInternalError(c, permErr, "Berechtigung für Medien-Liste konnte nicht geprüft werden.")
			return
		}
		if !customPerms.CanUpload && !customPerms.CanDeleteOwn && !customPerms.CanDeleteAll && !customPerms.CanReorder {
			auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.list.denied", &fansubID, "fansub_group_media", nil, permissions.ActionFansubGroupMediaView, result)
			writePermissionDenied(c, result)
			return
		}
	}

	if h.listRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}
	rows, err := h.listRepo.ListFansubGroupMediaForReview(c.Request.Context(), fansubID, &identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "gruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub media review: ListFansubGroupMediaForReview error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	items := make([]fansubGroupMediaItemResponse, 0, len(rows))
	for _, row := range rows {
		var updatedAt *string
		if row.UpdatedAt != nil {
			value := row.UpdatedAt.Format(time.RFC3339)
			updatedAt = &value
		}
		item := fansubGroupMediaItemResponse{
			ID:                    row.MediaAssetID,
			PreviewURL:            row.PreviewURL,
			ThumbnailURL:          row.ThumbnailURL,
			OriginalURL:           row.OriginalURL,
			Visibility:            row.Visibility,
			ReviewStatus:          row.ReviewStatus,
			Title:                 row.Title,
			Description:           row.Description,
			AltText:               row.AltText,
			Category:              row.Category,
			SortOrder:             row.SortOrder,
			UploadedByName:        row.UploadedByName,
			UploadedByCurrentUser: row.UploadedByCurrentUser,
			CreatedAt:             row.CreatedAt.Format(time.RFC3339),
			UpdatedAt:             updatedAt,
			OwnerType:             row.OwnerType,
			OwnerID:               row.OwnerID,
			OwnerConsistent:       row.OwnerConsistent,
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, fansubGroupMediaListResponse{Data: items})
}

func (h *FansubMediaReviewHandler) ReorderFansubGroupMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungÃ¼ltige fansub-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaUpdate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung fÃ¼r Medien-Reihenfolge konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		customPerms, permErr := h.repo.GetFansubGroupMediaPermissionsForAppUser(c.Request.Context(), fansubID, identity.AppUserID)
		if permErr != nil {
			writePermissionInternalError(c, permErr, "Berechtigung für Medien-Reihenfolge konnte nicht geprüft werden.")
			return
		}
		if !customPerms.CanReorder {
			auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.reorder.denied", &fansubID, "fansub_group_media", nil, permissions.ActionFansubGroupMediaUpdate, result)
			writePermissionDenied(c, result)
			return
		}
	}

	var body fansubGroupMediaReorderBody
	if err := c.ShouldBindJSON(&body); err != nil || len(body.MediaIDs) == 0 {
		badRequest(c, "mediaIds array fehlt oder ist leer")
		return
	}
	seen := make(map[int64]struct{}, len(body.MediaIDs))
	for _, mediaID := range body.MediaIDs {
		if mediaID <= 0 {
			badRequest(c, "mediaIds enthÃ¤lt eine ungÃ¼ltige media-id")
			return
		}
		if _, exists := seen[mediaID]; exists {
			badRequest(c, "mediaIds enthÃ¤lt doppelte media-ids")
			return
		}
		seen[mediaID] = struct{}{}
	}

	if err := h.repo.ReorderFansubGroupMedia(c.Request.Context(), fansubID, body.MediaIDs); err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere medien gehÃ¶ren nicht zu dieser gruppe"}})
			return
		}
		log.Printf("fansub media review: ReorderFansubGroupMedia error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "fansub_group_media.reordered",
		ScopeType:         permissions.ScopeTypeGroup,
		ScopeID:           &fansubID,
		TargetType:        "fansub_group_media",
		Action:            string(permissions.ActionFansubGroupMediaUpdate),
		Outcome:           "allowed",
		Payload:           map[string]any{"items": len(body.MediaIDs)},
	})

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// PatchFansubMediaReview aktualisiert Sichtbarkeit und/oder Reviewstatus eines Gruppenmediums.
// PATCH /api/v1/admin/fansubs/:id/media/:mediaId
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupEdit (D-08).
// Enum-Validierung: ungültige Werte → 400 ohne Mutation (V5).
// Owner-Mismatch: Medium gehört fremder Gruppe → 403 ohne Mutation (T-78-03).
// Erfolgs-Audit: "fansub_group_media.visibility_updated" (D-09).
// Deny-Audit: "fansub_group_media.review.denied" (D-09).
// Ändert NIEMALS owner_type/owner_id (D-05).
func (h *FansubMediaReviewHandler) PatchFansubMediaReview(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub-id")
		return
	}

	mediaIDRaw := c.Param("mediaId")
	mediaID, err := strconv.ParseInt(mediaIDRaw, 10, 64)
	if err != nil || mediaID <= 0 {
		badRequest(c, "ungültige media-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaUpdate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für Medien-Review konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.review.denied", &fansubID, "fansub_group_media", &mediaID, permissions.ActionFansubGroupMediaUpdate, result)
		writePermissionDenied(c, result)
		return
	}

	// Body parsen
	rawBody, err := c.GetRawData()
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rawBody, &body); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	// Enum-Validierung (V5 Input Validation) — ungültige Werte → 400 ohne Mutation
	var patch repository.FansubMediaReviewPatch
	if visRaw, ok := body["visibility"]; ok {
		vis, isStr := visRaw.(string)
		if !isStr {
			badRequest(c, "visibility muss ein Zeichenkettenwert sein")
			return
		}
		if _, valid := validVisibilityValues[vis]; !valid {
			badRequest(c, "ungültiger Sichtbarkeitswert: erlaubt sind intern, oeffentlich")
			return
		}
		patch.Visibility = &vis
	}
	if statusRaw, ok := body["review_status"]; ok {
		status, isStr := statusRaw.(string)
		if !isStr {
			badRequest(c, "review_status muss ein Zeichenkettenwert sein")
			return
		}
		if _, valid := validReviewStatusValues[status]; !valid {
			badRequest(c, "ungültiger Prüfstatus: erlaubt sind in_pruefung, freigegeben, abgelehnt, archiviert, entfernt")
			return
		}
		patch.ReviewStatus = &status
	}

	// Leerer Patch (CR-02): weder visibility noch review_status vorhanden → 400 vor
	// Owner-Prüfung/Mutation/Audit. Verhindert Phantom-Erfolgsaudits für No-op-Writes
	// und Cross-Group-Probe-Spuren über einen leeren Body.
	metadataPatch, err := parseFansubGroupMediaMetadataPatch(body)
	if err != nil {
		badRequest(c, err.Error())
		return
	}
	if patch.Visibility == nil && patch.ReviewStatus == nil && metadataPatch.IsEmpty() {
		badRequest(c, "kein Feld zum Aktualisieren")
		return
	}

	// Owner-Mismatch-Prüfung (T-78-03): Medium muss zur angegebenen Gruppe gehören
	ownerGroupID, err := h.repo.GetFansubMediaOwner(c.Request.Context(), mediaID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "media nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub media review: GetFansubMediaOwner error (media_id=%d): %v", mediaID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if ownerGroupID != fansubID {
		// Tampering-Mitigation: Medium gehört einer anderen Gruppe → 403
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "medium gehört nicht zu dieser gruppe"}})
		return
	}

	// Mutation ausführen (schreibt nur visibility/review_status — NIEMALS owner_type/owner_id)
	if patch.Visibility != nil || patch.ReviewStatus != nil {
		if err := h.repo.UpdateFansubMediaReview(c.Request.Context(), fansubID, mediaID, patch); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "medium nicht gefunden oder nicht in dieser gruppe"}})
				return
			}
			log.Printf("fansub media review: UpdateFansubGroupMediaReview error (fansub_id=%d, media_id=%d): %v", fansubID, mediaID, err)
			internalError(c, "interner serverfehler")
			return
		}
	}
	if !metadataPatch.IsEmpty() {
		if err := h.repo.UpdateFansubGroupMediaMetadata(c.Request.Context(), fansubID, mediaID, metadataPatch); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "medium nicht gefunden oder nicht in dieser gruppe"}})
				return
			}
			log.Printf("fansub media review: UpdateFansubGroupMediaMetadata error (fansub_id=%d, media_id=%d): %v", fansubID, mediaID, err)
			internalError(c, "interner serverfehler")
			return
		}
	}

	// D-09 Pflicht: Erfolgs-Audit nach Mutation
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_media.visibility_updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_media",
		TargetID:       &mediaID,
		Action:         string(permissions.ActionFansubGroupMediaUpdate),
		Outcome:        "allowed",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Medien-Review wurde aktualisiert."})
}

func parseFansubGroupMediaMetadataPatch(body map[string]interface{}) (repository.FansubGroupMediaMetadataPatch, error) {
	var patch repository.FansubGroupMediaMetadataPatch
	if value, set, err := parseNullableTrimmedString(body, "title", 160); err != nil {
		return patch, err
	} else if set {
		patch.Title = value
		patch.TitleSet = true
	}
	if value, set, err := parseNullableTrimmedString(body, "description", 2000); err != nil {
		return patch, err
	} else if set {
		patch.Description = value
		patch.DescriptionSet = true
	}
	if value, set, err := parseNullableTrimmedString(body, "alt_text", 240); err != nil {
		return patch, err
	} else if set {
		patch.AltText = value
		patch.AltTextSet = true
	}
	if raw, ok := body["category"]; ok {
		value, ok := raw.(string)
		if !ok {
			return patch, errors.New("category muss ein Zeichenkettenwert sein")
		}
		category := strings.TrimSpace(value)
		if _, valid := validFansubGroupMediaCategories[category]; !valid {
			return patch, errors.New("ungültige Medienkategorie")
		}
		patch.Category = &category
	}
	if raw, ok := body["sort_order"]; ok {
		value, ok := raw.(float64)
		if !ok {
			return patch, errors.New("sort_order muss eine Zahl sein")
		}
		order := int(value)
		if value != float64(order) || order < 0 || order > 100000 {
			return patch, errors.New("sort_order muss eine ganze Zahl zwischen 0 und 100000 sein")
		}
		patch.SortOrder = &order
	}
	return patch, nil
}

func parseNullableTrimmedString(body map[string]interface{}, key string, maxLength int) (*string, bool, error) {
	raw, ok := body[key]
	if !ok {
		return nil, false, nil
	}
	if raw == nil {
		return nil, true, nil
	}
	value, ok := raw.(string)
	if !ok {
		return nil, false, errors.New(key + " muss ein Zeichenkettenwert oder null sein")
	}
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, true, nil
	}
	if len([]rune(trimmed)) > maxLength {
		return nil, false, errors.New(key + " ist zu lang")
	}
	return &trimmed, true, nil
}
