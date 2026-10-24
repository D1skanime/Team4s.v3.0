package handlers

// FansubGroupHintsMeHandler stellt den Member-seitigen Endpunkt zum Versenden eines
// Hinweises an eine EIGENE ODER FREMDE Fansub-Gruppe bereit:
// POST /api/v1/me/fansub-group-hints
//
// Nach D-09 ist ein Hinweis ausschließlich ein Korrektur-Hinweis an einem bestehenden
// Projekt-Eintrag ("hier ist etwas falsch/fehlt") — die frühere zweite Hinweisart
// "Anfrage auf Mitgliedschaft" entfiel ersatzlos, weil "Hinweis senden" ohnehin nur
// Mitgliedern mit Mitgliedsprofil UND Projekt-Zuordnung offensteht und der bereits
// bestehende Mitglieds-Claim-Weg (member_claims, Phase 81/135) diesen Fall längst abdeckt.
// Ein Hinweis ist nur eine Information an die Zielgruppe, keine Behauptung tatsächlicher
// Mitwirkung. Deshalb gibt es hier, anders als beim regulären Beitrags-Vorschlag
// (contribution_proposals_me_handler.go), bewusst KEINEN Mitgliedschafts-/Ownership-Check:
// ein Mitglied darf an JEDE Fansub-Gruppe einen Hinweis schicken.

import (
	"context"
	"errors"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	fansubGroupHintConflictMessage     = "Du hast dazu bereits einen offenen Hinweis."
	fansubGroupHintMissingAnimeMessage = "Bei einem Korrektur-Hinweis muss ein Projekt angegeben werden."
	// fansubGroupHintInvalidContextMessage wird zurückgegeben, wenn die gewählte
	// (target_fansub_group_id, related_anime_id)-Paarung laut anime_fansub_groups gar
	// nicht existiert (D-23) -- die Zielgruppe ist diesem Projekt serverseitig nachweislich
	// nicht zugeordnet, unabhängig davon, ob Gruppe und Projekt für sich genommen real sind.
	fansubGroupHintInvalidContextMessage = "Anime-Fansub-Zuordnung nicht gefunden"
)

// HintRepository ist das Interface, das FansubGroupHintsMeHandler für die Persistenz
// neuer Hinweise UND für die D-18-Absenderansicht ("Eingereichte Hinweise") nutzt.
// Ermöglicht Stub-Tests ohne echte DB-Verbindung.
type HintRepository interface {
	CreateHint(ctx context.Context, input repository.HintInput) (*repository.FansubGroupHintRow, error)
	ListBySender(ctx context.Context, senderAppUserID int64) ([]repository.FansubGroupHintRow, error)
}

// FansubGroupHintsMeHandler verwaltet den Member-seitigen "Hinweis senden"-Endpunkt.
//
// Rate-Limiting läuft als vorgeschaltete Middleware (FansubGroupHintDailyLimitMiddleware
// in main.go), nicht hier im Handler-Code. Die Dopplungssperre (D-04(1)) wird nicht hier,
// sondern ausschließlich über den Partial-Unique-Index der Migration erzwungen — der
// Handler reicht nur den gemappten repository.ErrConflict weiter.
type FansubGroupHintsMeHandler struct {
	hintRepo       HintRepository
	memberResolver MemberResolver
}

// NewFansubGroupHintsMeHandler erstellt einen neuen Handler mit echter DB-Anbindung.
// Seit D-09 gibt es keine Rollenvalidierung mehr in diesem Handler (das war nur für die
// gestrichene Mitgliedschaftsanfrage mit Rollenwunsch nötig) — der Konstruktor braucht
// deshalb kein RolesRepository mehr.
func NewFansubGroupHintsMeHandler(hintRepo HintRepository, db *pgxpool.Pool) *FansubGroupHintsMeHandler {
	return &FansubGroupHintsMeHandler{
		hintRepo:       hintRepo,
		memberResolver: &dbMemberResolver{db: db},
	}
}

// createFansubGroupHintRequest ist der Request-Body für POST /api/v1/me/fansub-group-hints.
// Bewusst KEIN sender_app_user_id-Feld — die Absenderidentität kommt ausschließlich aus
// der verifizierten Auth-Identität (identity.AppUserID), niemals aus dem Request-Body
// (BOLA-Schutz: ein Client kann sich so niemals als ein anderer App-User ausgeben). Seit
// D-09 gibt es nur noch einen Hinweistyp (Korrektur-Hinweis), deshalb entfielen
// `hint_type` und `requested_role_code` komplett aus diesem DTO.
type createFansubGroupHintRequest struct {
	TargetFansubGroupID int64   `json:"target_fansub_group_id"`
	RelatedAnimeID      *int64  `json:"related_anime_id"`
	Note                *string `json:"note"`
}

// CreateHint verarbeitet POST /api/v1/me/fansub-group-hints.
// Sicherheitskette: Auth → Pflichtfeld related_anime_id → kein Ownership-Check (bewusste
// Abweichung von contribution_proposals_me_handler.go, siehe D-02) → Rate-Limit lief
// bereits als Middleware vor diesem Handler → DB-Insert mit 409/404-Mapping.
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

	// Pflichtfeld-Check spiegelt die DB-NOT-NULL-Constraint der Migration 0188 — hier als
	// saubere 422-Antwort statt einer rohen DB-Constraint-Verletzung (500). Jeder
	// verbleibende Hinweis ist nach D-09 ein Korrektur-Hinweis mit Projektbezug, daher ist
	// related_anime_id ausnahmslos Pflicht.
	if req.RelatedAnimeID == nil {
		unprocessable(c, fansubGroupHintMissingAnimeMessage)
		return
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
	// ResolveVerifiedMemberID läuft hier NUR als Identitäts-Nachweis (beweist, dass der
	// Absender einen echten, verifizierten Member-Account hat und damit kein
	// unverifizierter Account Hinweise spammen kann) — bewusst OHNE anschließenden
	// Ownership-Check gegen die Zielgruppe. Das ist exakt der fachliche Kernpunkt von
	// D-02: ein Hinweis darf an JEDE Fansub-Gruppe gehen, nicht nur an die eigene(n), also
	// darf memberID hier nicht gegen TargetFansubGroupID geprüft werden.
	_ = memberID

	input := repository.HintInput{
		SenderAppUserID:     identity.AppUserID,
		TargetFansubGroupID: req.TargetFansubGroupID,
		RelatedAnimeID:      req.RelatedAnimeID,
		Note:                req.Note,
	}

	row, err := h.hintRepo.CreateHint(c.Request.Context(), input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": fansubGroupHintConflictMessage}})
		return
	}
	// D-23: die Repository-Prüfung ensureHintAnimeFansubContext hat festgestellt, dass
	// (target_fansub_group_id, related_anime_id) keine reale anime_fansub_groups-Zeile
	// hat -- derselbe 404-Fehlerstil wie das etablierte Präzedenzmuster in
	// admin_content_anime_project_timeline.go, hier mit eigener Nachricht für diesen
	// Endpunkt.
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": fansubGroupHintInvalidContextMessage}})
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

// ListSentHints verarbeitet GET /api/v1/me/fansub-group-hints (D-18): zeigt dem Absender
// alle Hinweise, die er selbst jemals verschickt hat -- an die eigene(n) UND an fremde
// Gruppen, über alle Status hinweg. Sicherheits-Kernregel (T-191-28, IDOR/BOLA-Schutz):
// die Absender-ID stammt AUSSCHLIESSLICH aus der verifizierten Auth-Identität
// (identity.AppUserID) -- der Handler liest dafür keinen Pfad-, Query- oder
// Body-Parameter, es existiert hier also strukturell kein Feld, über das ein Client die
// Hinweise eines anderen Absenders anfordern könnte. Kein Rate-Limit nötig (das
// Tageslimit bremst nur das ERSTELLEN neuer Hinweise, nicht das Lesen eigener).
func (h *FansubGroupHintsMeHandler) ListSentHints(c *gin.Context) {
	identity, ok := requireMeIdentityForProposals(c)
	if !ok {
		return
	}

	rows, err := h.hintRepo.ListBySender(c.Request.Context(), identity.AppUserID)
	if err != nil {
		internalError(c, "interner Serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

// unprocessable schreibt eine 422-Antwort mit dem einheitlichen Fehler-Envelope.
func unprocessable(c *gin.Context, message string) {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": message}})
}
