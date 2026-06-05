package handlers

// MemberCorrectionHandler implementiert POST /api/v1/me/members/:id/correction.
// Registrierte User (requireMeIdentity) reichen einen review-gebundenen Korrektur-Vorschlag ein.
// Der Vorschlag wird NIE direkt veröffentlicht (D-18); status bleibt 'in_review'.
// SubmitterAppUserID kommt server-seitig aus der Identität, NICHT aus dem Body (T-74-03-SPOOF).
// Schreibt audit_logs (D-15, EventType "member_correction.submitted").

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// MemberCorrectionHandlerCorrectionRepo ist das Interface für den Handler.
// Ermöglicht DB-freie Tests via Stub (Muster: contribution_proposals_me_handler.go Z. 25-29).
type MemberCorrectionHandlerCorrectionRepo interface {
	CreateCorrectionReport(ctx context.Context, input repository.CorrectionReportInput) (*repository.CorrectionReportRow, error)
}

// MemberCorrectionHandler verwaltet den Korrektur-Melden-Endpunkt.
type MemberCorrectionHandler struct {
	correctionRepo MemberCorrectionHandlerCorrectionRepo
	auditLogRepo   *repository.AuditLogRepository
}

// NewMemberCorrectionHandler erstellt einen neuen Handler mit interface-getriebenem Repo.
func NewMemberCorrectionHandler(
	correctionRepo MemberCorrectionHandlerCorrectionRepo,
	auditLogRepo *repository.AuditLogRepository,
) *MemberCorrectionHandler {
	return &MemberCorrectionHandler{
		correctionRepo: correctionRepo,
		auditLogRepo:   auditLogRepo,
	}
}

// submitCorrectionRequest ist der Request-Body für POST /me/members/:id/correction.
type submitCorrectionRequest struct {
	TargetType string `json:"target_type"`
	TargetID   *int64 `json:"target_id,omitempty"`
	ReasonText string `json:"reason_text"`
}

// gültige target_type-Werte (Lock K — Enum dokumentiert in OpenAPI + DB CHECK)
var validCorrectionTargetTypes = map[string]bool{
	"profile":      true,
	"contribution": true,
	"role":         true,
}

// SubmitCorrection verarbeitet POST /api/v1/me/members/:id/correction.
// Sicherheitskette: requireMeIdentity → ShouldBindJSON → 422-Validierung →
// CreateCorrectionReport (status 'in_review') → auditLogRepo.Write → 201.
func (h *MemberCorrectionHandler) SubmitCorrection(c *gin.Context) {
	// Nur registrierte User dürfen Vorschläge einreichen (D-18, Decision 6).
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	// Member-ID aus URL-Parameter lesen.
	memberIDStr := c.Param("id")
	memberID, err := strconv.ParseInt(memberIDStr, 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige Member-ID")
		return
	}

	var req submitCorrectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	// 422-Validierung: reason_text ist Pflichtfeld.
	if req.ReasonText == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "Bitte gib eine Begründung für die Korrektur an."},
		})
		return
	}

	// 422-Validierung: target_type muss gültig sein (Lock K, T-74-03-INPUT).
	if !validCorrectionTargetTypes[req.TargetType] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "Ungültiger Zieltyp. Erlaubt: profile, contribution, role."},
		})
		return
	}

	// SubmitterAppUserID kommt server-seitig aus der Identität (T-74-03-SPOOF).
	input := repository.CorrectionReportInput{
		SubmitterAppUserID: identity.AppUserID,
		MemberID:           memberID,
		TargetType:         req.TargetType,
		TargetID:           req.TargetID,
		ReasonText:         req.ReasonText,
	}

	row, err := h.correctionRepo.CreateCorrectionReport(c.Request.Context(), input)
	if err != nil {
		log.Printf("member correction: CreateCorrectionReport (member_id=%d, submitter=%d): %v", memberID, identity.AppUserID, err)
		internalError(c, "interner Serverfehler")
		return
	}

	// Audit-Schreibung (D-15, T-74-03-REP). Fehlertolerant — Audit-Fehler blockiert
	// den Haupt-Write nicht (Muster: contribution_proposals_me_handler.go Z. 352-358).
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "member_correction.submitted",
		TargetType:     "member",
		TargetID:       &memberID,
		Action:         "submit_correction",
		Outcome:        "allowed",
		Payload: map[string]any{
			"target_type": req.TargetType,
			"target_id":   req.TargetID,
		},
	})

	// 201 — ausschließlich review-gebundener in_review-Vorschlag, keine öffentliche Mutation (D-18).
	c.JSON(http.StatusCreated, gin.H{"data": row})
}
