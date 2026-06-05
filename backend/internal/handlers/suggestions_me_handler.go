package handlers

// SuggestionsMeHandler liefert Member-seitige Endpunkte für Vorschläge (Phase 76, D-06/D-07).
// POST /api/v1/me/suggestions       — Vorschlag einreichen (error_report, story, media)
// GET  /api/v1/me/suggestions       — eigene Vorschläge abrufen
// POST /api/v1/me/suggestions/media — Medien-Upload-Vorschlag einreichen

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// SuggestionsMeHandler verwaltet Member-seitige Endpunkte für Vorschläge.
type SuggestionsMeHandler struct {
	suggestionsRepo *repository.MemberSuggestionsRepository
	auditLogRepo    *repository.AuditLogRepository
}

// NewSuggestionsMeHandler erstellt einen neuen SuggestionsMeHandler.
func NewSuggestionsMeHandler(
	suggestionsRepo *repository.MemberSuggestionsRepository,
	auditLogRepo *repository.AuditLogRepository,
) *SuggestionsMeHandler {
	return &SuggestionsMeHandler{
		suggestionsRepo: suggestionsRepo,
		auditLogRepo:    auditLogRepo,
	}
}

// createSuggestionRequest ist der Request-Body für POST /me/suggestions.
type createSuggestionRequest struct {
	SuggestionType string  `json:"suggestion_type" binding:"required"`
	TargetType     string  `json:"target_type" binding:"required"`
	TargetID       int64   `json:"target_id" binding:"required,min=1"`
	ContentText    *string `json:"content_text"`
}

// validSuggestionTypes definiert die erlaubten Vorschlags-Typen (Lock H: kein Write in Contribution-Domäne).
var validSuggestionTypes = map[string]bool{
	"error_report": true,
	"story":        true,
	"media":        true,
}

// validTargetTypes definiert die erlaubten Ziel-Typen für Vorschläge.
var validTargetTypes = map[string]bool{
	"anime":         true,
	"contribution":  true,
	"fansub_group":  true,
	"member":        true,
}

// CreateSuggestion handles POST /api/v1/me/suggestions
func (h *SuggestionsMeHandler) CreateSuggestion(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	var req createSuggestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	// Typ-Validierung (Lock H: kein Schreiben in Contributions-Domäne)
	if !validSuggestionTypes[req.SuggestionType] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "ungültiger Vorschlagstyp"},
		})
		return
	}

	// Ziel-Typ-Validierung
	if !validTargetTypes[req.TargetType] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "ungültiger Zieltyp"},
		})
		return
	}

	row, err := h.suggestionsRepo.Create(c.Request.Context(), repository.SuggestionInput{
		SubmitterAppUserID: identity.AppUserID,
		SuggestionType:     req.SuggestionType,
		TargetType:         req.TargetType,
		TargetID:           req.TargetID,
		ContentText:        req.ContentText,
	})
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Ziel nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// Audit-Log-Eintrag (D-07)
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "member_suggestion.submitted",
		TargetType:     req.TargetType,
		TargetID:       &req.TargetID,
		Action:         "submit",
		Outcome:        "allowed",
	})

	c.JSON(http.StatusCreated, gin.H{"data": row})
}

// ListSuggestions handles GET /api/v1/me/suggestions
func (h *SuggestionsMeHandler) ListSuggestions(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	rows, err := h.suggestionsRepo.ListBySubmitter(c.Request.Context(), identity.AppUserID)
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

// UploadMediaSuggestion handles POST /api/v1/me/suggestions/media
// Liest einen Multipart-Request mit target_type, target_id und category;
// speichert den Vorschlag mit suggestion_type='media' in member_suggestions.
// Die eigentliche Medien-Pipeline (Datei-Persistenz) wird in einer späteren Phase
// über den MediaUploadHandler integriert (Decision 8).
func (h *SuggestionsMeHandler) UploadMediaSuggestion(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	if err := c.Request.ParseMultipartForm(50 << 20); err != nil {
		badRequest(c, "Multipart-Formular konnte nicht gelesen werden")
		return
	}

	targetType := c.Request.FormValue("target_type")
	targetIDStr := c.Request.FormValue("target_id")
	category := c.Request.FormValue("category")

	// Pflichtfelder prüfen
	if targetType == "" {
		badRequest(c, "target_type ist erforderlich")
		return
	}
	if targetIDStr == "" {
		badRequest(c, "target_id ist erforderlich")
		return
	}
	if category == "" {
		badRequest(c, "category ist erforderlich")
		return
	}

	// Ziel-Typ-Validierung
	if !validTargetTypes[targetType] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "ungültiger Zieltyp"},
		})
		return
	}

	targetID, err := strconv.ParseInt(targetIDStr, 10, 64)
	if err != nil || targetID <= 0 {
		badRequest(c, "ungültige target_id")
		return
	}

	// Vorschlag anlegen (suggestion_type='media', Decision 8: review_status='in_review' liegt auf DB-Ebene)
	contentText := category // Kategorie als content_text speichern für Rückverfolg­barkeit
	row, createErr := h.suggestionsRepo.Create(c.Request.Context(), repository.SuggestionInput{
		SubmitterAppUserID: identity.AppUserID,
		SuggestionType:     "media",
		TargetType:         targetType,
		TargetID:           targetID,
		ContentText:        &contentText,
	})
	if errors.Is(createErr, repository.ErrNotFound) {
		notFound(c, "Ziel nicht gefunden")
		return
	}
	if createErr != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	// Audit-Log-Eintrag (D-07)
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "member_suggestion.media.submitted",
		TargetType:     targetType,
		TargetID:       &targetID,
		Action:         "submit",
		Outcome:        "allowed",
	})

	c.JSON(http.StatusCreated, gin.H{"data": row})
}
