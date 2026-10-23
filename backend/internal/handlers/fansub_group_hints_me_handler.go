package handlers

// FansubGroupHintsMeHandler stellt den Member-seitigen Endpunkt zum Versenden eines
// Hinweises an eine EIGENE ODER FREMDE Fansub-Gruppe bereit:
// POST /api/v1/me/fansub-group-hints
//
// Ein Hinweis ist nur eine Information an die Zielgruppe (Korrektur an einem bestehenden
// Projekt-Eintrag ODER Anfrage auf Mitgliedschaft mit optionalem Rollenwunsch) — keine
// Behauptung tatsächlicher Mitwirkung. Deshalb gibt es hier, anders als beim regulären
// Beitrags-Vorschlag (contribution_proposals_me_handler.go), bewusst KEINEN
// Mitgliedschafts-/Ownership-Check: ein Mitglied darf an JEDE Fansub-Gruppe einen Hinweis
// schicken.

import (
	"context"
	"errors"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	fansubGroupHintTypeCorrection         = "correction"
	fansubGroupHintTypeMembershipRequest  = "membership_request"
	fansubGroupHintRoleContext            = "fansub_group"
	fansubGroupHintConflictMessage        = "Du hast dazu bereits einen offenen Hinweis."
	fansubGroupHintUnknownTypeMessage     = "Unbekannter Hinweis-Typ. Erlaubt sind 'correction' oder 'membership_request'."
	fansubGroupHintMissingAnimeMessage    = "Bei einem Korrektur-Hinweis muss ein Projekt angegeben werden."
	fansubGroupHintUnexpectedAnimeMessage = "Eine Mitgliedschaftsanfrage darf kein Projekt enthalten."
	fansubGroupHintUnexpectedRoleMessage  = "Ein Korrektur-Hinweis kann keine gewünschte Rolle enthalten."
)

// HintRepository ist das Interface, das FansubGroupHintsMeHandler für die Persistenz
// neuer Hinweise nutzt. Ermöglicht Stub-Tests ohne echte DB-Verbindung.
type HintRepository interface {
	CreateHint(ctx context.Context, input repository.HintInput) (*repository.FansubGroupHintRow, error)
}

// FansubGroupHintsMeHandler verwaltet den Member-seitigen "Hinweis senden"-Endpunkt.
//
// Rate-Limiting läuft als vorgeschaltete Middleware (FansubGroupHintDailyLimitMiddleware
// in main.go), nicht hier im Handler-Code. Die Dopplungssperre (D-04(1)) wird nicht hier,
// sondern ausschließlich über den Partial-Unique-Index der Migration erzwungen — der
// Handler reicht nur den gemappten repository.ErrConflict weiter.
type FansubGroupHintsMeHandler struct {
	hintRepo       HintRepository
	rolesRepo      RolesRepository
	memberResolver MemberResolver
}

// NewFansubGroupHintsMeHandler erstellt einen neuen Handler mit echter DB-Anbindung.
// rolesRepo wird wiederverwendet (histGroupMemberRolesRepo in main.go, implementiert
// bereits RoleCodeIsAssignableForContext für den anime_contribution-Kontext) — keine
// zweite, parallele Rollen-Validierungslogik.
func NewFansubGroupHintsMeHandler(hintRepo HintRepository, rolesRepo RolesRepository, db *pgxpool.Pool) *FansubGroupHintsMeHandler {
	return &FansubGroupHintsMeHandler{
		hintRepo:       hintRepo,
		rolesRepo:      rolesRepo,
		memberResolver: &dbMemberResolver{db: db},
	}
}

// createFansubGroupHintRequest ist der Request-Body für POST /api/v1/me/fansub-group-hints.
// Bewusst KEIN sender_app_user_id-Feld — die Absenderidentität kommt ausschließlich aus
// der verifizierten Auth-Identität (identity.AppUserID), niemals aus dem Request-Body
// (BOLA-Schutz: ein Client kann sich so niemals als ein anderer App-User ausgeben).
type createFansubGroupHintRequest struct {
	HintType            string  `json:"hint_type"`
	TargetFansubGroupID int64   `json:"target_fansub_group_id"`
	RelatedAnimeID      *int64  `json:"related_anime_id"`
	RequestedRoleCode   *string `json:"requested_role_code"`
	Note                *string `json:"note"`
}

// CreateHint verarbeitet POST /api/v1/me/fansub-group-hints.
// Sicherheitskette: Auth → Pflichtfelder (je Hinweistyp) → kein Ownership-Check (bewusste
// Abweichung von contribution_proposals_me_handler.go, siehe D-02) → Rollenvalidierung
// (nur bei Mitgliedschaftsanfrage mit Rollenwunsch) → Rate-Limit lief bereits als
// Middleware vor diesem Handler → DB-Insert mit 409/404-Mapping.
func (h *FansubGroupHintsMeHandler) CreateHint(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok {
		return
	}

	var req createFansubGroupHintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger Request-Body")
		return
	}

	if req.HintType != fansubGroupHintTypeCorrection && req.HintType != fansubGroupHintTypeMembershipRequest {
		badRequest(c, fansubGroupHintUnknownTypeMessage)
		return
	}

	// Pflichtfeld-Check je Hinweistyp spiegelt exakt die DB-CHECK-Constraints der
	// Migration (chk_fansub_group_hints_anime_scope/chk_fansub_group_hints_role_scope) —
	// hier als saubere 422-Antwort statt einer rohen DB-Constraint-Verletzung (500).
	if req.HintType == fansubGroupHintTypeCorrection {
		if req.RelatedAnimeID == nil {
			unprocessable(c, fansubGroupHintMissingAnimeMessage)
			return
		}
		if req.RequestedRoleCode != nil {
			unprocessable(c, fansubGroupHintUnexpectedRoleMessage)
			return
		}
	} else {
		if req.RelatedAnimeID != nil {
			unprocessable(c, fansubGroupHintUnexpectedAnimeMessage)
			return
		}
	}

	memberID, err := h.memberResolver.ResolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}
	_ = memberID // nur Identitäts-Nachweis — kein Ownership-Check, siehe D-02.

	if req.RequestedRoleCode != nil {
		assignable, err := h.rolesRepo.RoleCodeIsAssignableForContext(c.Request.Context(), *req.RequestedRoleCode, fansubGroupHintRoleContext)
		if err != nil {
			internalError(c, "interner Serverfehler")
			return
		}
		if !assignable {
			badRequest(c, "Diese Rolle kann nicht zugewiesen werden: "+*req.RequestedRoleCode)
			return
		}
	}

	input := repository.HintInput{
		SenderAppUserID:     identity.AppUserID,
		TargetFansubGroupID: req.TargetFansubGroupID,
		HintType:            req.HintType,
		RelatedAnimeID:      req.RelatedAnimeID,
		RequestedRoleCode:   req.RequestedRoleCode,
		Note:                req.Note,
	}

	row, err := h.hintRepo.CreateHint(c.Request.Context(), input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": fansubGroupHintConflictMessage}})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, "Zielgruppe, Projekt oder Rolle nicht gefunden")
		return
	}
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": row})
}

// unprocessable schreibt eine 422-Antwort mit dem einheitlichen Fehler-Envelope.
func unprocessable(c *gin.Context, message string) {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": message}})
}
