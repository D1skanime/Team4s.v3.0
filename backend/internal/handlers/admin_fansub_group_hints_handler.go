package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminHintsRepository definiert die Datenbankoperationen, die der
// AdminFansubGroupHintsHandler braucht: die Plattform-weite Liste (ListForFansubLeadRole)
// plus die Confirm/Reject-Methoden des gemeinsamen hintDecideRepository-Interfaces
// (fansub_group_hints_decide.go) — dieselben zwei Methoden, mit denen auch der Leader-Pfad
// (fansub_group_hints_review_handler.go) entscheidet, keine eigene Kopie.
type adminHintsRepository interface {
	hintDecideRepository
	ListForFansubLeadRole(ctx context.Context, filter repository.AdminHintListFilter) ([]repository.FansubGroupHintRow, int, error)
}

// AdminFansubGroupHintsHandler ist die Plattform-weite Entscheidungsflaeche fuer den
// D-01/D-07-Sonderfall: Mitgliedschaftsanfragen mit ausdruecklich gewuenschtem Rollencode
// fansub_lead. Eine Leader-Nachfolge soll nicht von der betroffenen Gruppe selbst (bzw.
// deren amtierendem Leader) im Alleingang bestaetigt werden koennen — deshalb entscheidet
// hier ausschliesslich ein Plattform-Admin, serverseitig ueber requirePlatformAdminIdentity
// erzwungen und unabhaengig von jeder gruppenbezogenen Berechtigung des Aufrufers (auch ein
// Leader der Zielgruppe selbst wird hier abgelehnt, siehe Test
// TestAdminFansubGroupHints_ConfirmHint_RejectsNonPlatformAdmin). Strukturell das Analogon
// zu AdminClaimsListHandler: eine platform-weite Liste quer ueber alle Gruppen statt einer
// gruppen-gescopten Sicht wie beim Leader-Pfad.
//
// Die Zugehoerigkeit "diese Hinweiszeile betrifft die fansub_lead-Rolle" wird ausschliesslich
// serverseitig in ListForFansubLeadRole per WHERE requested_role_code = $1 (gebunden an die
// Konstante permissions.RoleFansubLead) entschieden — niemals aus einem Client-Feld. Das ist
// der entscheidende BOLA-Schutz des D-01-Routings: ein Client kann nicht erzwingen, dass eine
// beliebige Zeile auf dieser Liste erscheint oder hier entschieden wird.
type AdminFansubGroupHintsHandler struct {
	authzRepo    capabilityAuthzRepo
	hintsRepo    adminHintsRepository
	auditLogRepo auditLogWriter
}

// NewAdminFansubGroupHintsHandler erstellt einen neuen AdminFansubGroupHintsHandler.
func NewAdminFansubGroupHintsHandler(authzRepo capabilityAuthzRepo, hintsRepo adminHintsRepository, auditLogRepo auditLogWriter) *AdminFansubGroupHintsHandler {
	return &AdminFansubGroupHintsHandler{
		authzRepo:    authzRepo,
		hintsRepo:    hintsRepo,
		auditLogRepo: auditLogRepo,
	}
}

// ListHints liefert ausschliesslich Mitgliedschaftsanfragen mit requested_role_code =
// fansub_lead, ueber ALLE Zielgruppen hinweg und mit status/fansub_group_id/from/to-Filtern
// sowie geclampter Pagination — serverseitig im Repository per WHERE erzwungen (siehe
// ListForFansubLeadRole), nicht als clientseitiger Filter auf einer generischen
// "alle Hinweise"-Liste. Filter-Parsing-Stil 1:1 von AdminClaimsListHandler.ListClaims
// uebernommen (admin_claims_list_handler.go), kein eigenes Parsing erfunden.
// GET /api/v1/admin/fansub-group-hints
func (h *AdminFansubGroupHintsHandler) ListHints(c *gin.Context) {
	if _, ok := requirePlatformAdminIdentity(c, h.authzRepo, ""); !ok {
		return
	}
	if h.hintsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	filter := repository.AdminHintListFilter{
		Limit:  parseOptionalInt(c.Query("limit")),
		Offset: parseOptionalInt(c.Query("offset")),
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filter.Status = &status
	}
	if groupID, ok := parseOptionalPositiveID(c.Query("fansub_group_id")); ok {
		filter.TargetFansubGroupID = &groupID
	}
	if from, ok := parseOptionalRFC3339(c.Query("from")); ok {
		filter.From = &from
	}
	if to, ok := parseOptionalRFC3339(c.Query("to")); ok {
		filter.To = &to
	}

	rows, total, err := h.hintsRepo.ListForFansubLeadRole(c.Request.Context(), filter)
	if err != nil {
		log.Printf("admin fansub group hints: ListForFansubLeadRole error: %v", err)
		internalError(c, "interner serverfehler")
		return
	}

	effectiveLimit, effectiveOffset := repository.ClampAdminListPage(filter.Limit, filter.Offset)
	c.JSON(http.StatusOK, gin.H{
		"data": rows,
		"meta": gin.H{
			"total":  total,
			"limit":  effectiveLimit,
			"offset": effectiveOffset,
		},
	})
}

// ConfirmHint bestaetigt eine fansub_lead-Mitgliedschaftsanfrage: status='acknowledged',
// ueber den mit dem Leader-Pfad gemeinsam genutzten decideFansubGroupHint-Helfer
// (fansub_group_hints_decide.go) — dasselbe Verhalten (keine Mitgliedschafts- oder
// Punkte-/Badge-Vergabe, D-03/D-05), nur ein anderer Autorisierungsweg
// (requirePlatformAdminIdentity statt CanForFansubGroup). Der Audit-Eintrag vermerkt
// "actor_path": "platform_admin_fansub_lead_route", damit sich im Audit-Trail nachvollziehen
// laesst, ueber welche der beiden Review-Oberflaechen ein Hinweis entschieden wurde.
// POST /api/v1/admin/fansub-group-hints/:hid/confirm
func (h *AdminFansubGroupHintsHandler) ConfirmHint(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	hintID, err := strconv.ParseInt(c.Param("hid"), 10, 64)
	if err != nil || hintID <= 0 {
		badRequest(c, "ungültige hinweis-id")
		return
	}

	if err := decideFansubGroupHint(c.Request.Context(), h.hintsRepo, hintID, identity.AppUserID, "confirm", nil); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Hinweis nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("admin fansub group hints: Confirm error (hint_id=%d): %v", hintID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_hint.confirmed",
		ScopeType:      permissions.ScopeTypeGlobal,
		TargetType:     "fansub_group_hint",
		TargetID:       &hintID,
		Action:         "platform_admin_confirm",
		Outcome:        "allowed",
		Payload:        map[string]any{"actor_path": "platform_admin_fansub_lead_route"},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Hinweis wurde bestätigt."})
}

// RejectHint lehnt eine fansub_lead-Mitgliedschaftsanfrage ab, optional mit decision_note —
// gleiches Raw-Body-Optional-JSON-Parsing-Muster wie der Leader-Pfad
// (fansub_group_hints_review_handler.go), gleicher hintRejectRequest-Typ (keine zweite
// Definition), gleicher decideFansubGroupHint-Helfer.
// POST /api/v1/admin/fansub-group-hints/:hid/reject
func (h *AdminFansubGroupHintsHandler) RejectHint(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	hintID, err := strconv.ParseInt(c.Param("hid"), 10, 64)
	if err != nil || hintID <= 0 {
		badRequest(c, "ungültige hinweis-id")
		return
	}

	var req hintRejectRequest
	body, err := c.GetRawData()
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	if len(strings.TrimSpace(string(body))) > 0 {
		if err := json.Unmarshal(body, &req); err != nil {
			badRequest(c, "ungültiger Request-Body")
			return
		}
	}

	if err := decideFansubGroupHint(c.Request.Context(), h.hintsRepo, hintID, identity.AppUserID, "reject", req.DecisionNote); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Hinweis nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("admin fansub group hints: Reject error (hint_id=%d): %v", hintID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_hint.rejected",
		ScopeType:      permissions.ScopeTypeGlobal,
		TargetType:     "fansub_group_hint",
		TargetID:       &hintID,
		Action:         "platform_admin_reject",
		Outcome:        "allowed",
		Payload:        map[string]any{"actor_path": "platform_admin_fansub_lead_route", "has_note": req.DecisionNote != nil},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Hinweis wurde abgelehnt."})
}
