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

// HintReviewRepository definiert die Datenbankoperationen, die der
// FansubGroupHintsReviewHandler benötigt. Das Interface ermöglicht Stub-Tests ohne
// Datenbankverbindung.
type HintReviewRepository interface {
	ListByTargetGroup(ctx context.Context, targetGroupID int64) ([]repository.FansubGroupHintRow, error)
	Confirm(ctx context.Context, hintID, actorAppUserID int64) error
	Reject(ctx context.Context, hintID, actorAppUserID int64, decisionNote *string) error
}

// FansubGroupHintsReviewHandler gibt dem Leader der ZIELGRUPPE (nicht der Gruppe des
// Absenders) eine undifferenzierte Entscheidungsoberfläche über JEDEN Korrektur-Hinweis, der
// an diese Gruppe geschickt wurde — ohne jede Sonderfall-Ausnahme. Ob ein Hinweis stattdessen
// auf der plattform-weiten Liste (`AdminFansubGroupHintsHandler`,
// GET /api/v1/admin/fansub-group-hints) erscheint, entscheidet sich NICHT hier durch einen
// Filter dieses Handlers, sondern ist eine strukturelle Eigenschaft der ZIELGRUPPE selbst
// (D-11: hat die Gruppe aktuell eine aktive `fansub_lead`-Rolle oder nicht) — berechnet
// vollständig serverseitig in Plan 191-11s Repository-Query (`ListWithoutActiveLead`). Dieser
// Handler filtert also grundsätzlich nichts selbst aus seiner Liste heraus. Confirm ist eine
// reine Status-Änderung ohne jeden Mitgliedschafts-, Rollen- oder Punkte-/Badge-Seiteneffekt:
// ein Hinweis ist laut Produktentscheidung nur Information, keine automatische Zuweisung —
// der Leader entscheidet nach einem Confirm separat und über die bestehenden, unveränderten
// Wege (Mitglied hinzufügen, Projekt-/Release-Crew zuweisen), ob und wie er reagiert.
type FansubGroupHintsReviewHandler struct {
	reviewRepo    HintReviewRepository
	permissionSvc reviewPermissionChecker
	auditLogRepo  auditLogWriter
}

// NewFansubGroupHintsReviewHandler erstellt einen neuen FansubGroupHintsReviewHandler.
func NewFansubGroupHintsReviewHandler(
	reviewRepo HintReviewRepository,
	permissionSvc reviewPermissionChecker,
	auditLogRepo auditLogWriter,
) *FansubGroupHintsReviewHandler {
	return &FansubGroupHintsReviewHandler{
		reviewRepo:    reviewRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
	}
}

// hintRejectRequest enthält den optionalen Ablehnungsgrund.
type hintRejectRequest struct {
	DecisionNote *string `json:"decision_note"`
}

// ListHints gibt AUSNAHMSLOS alle Hinweise an die Zielgruppe zurück, egal welchen Status
// sie haben. Es gibt hier keine Ausschluss-Logik mehr: ob eine Zeile stattdessen (zusätzlich
// oder exklusiv) auf der plattform-weiten Admin-Liste sichtbar ist, entscheidet sich über
// D-11s "hat die Zielgruppe eine aktive Leitung?"-Prädikat, das ausschließlich in
// `FansubGroupHintsRepository.ListWithoutActiveLead` (Plan 191-11) berechnet wird — niemals
// durch einen Filter in diesem Handler.
// GET /api/v1/admin/fansubs/:id/group-hints
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage — exakt dasselbe Recht
// wie beim bestehenden gruppen-gescopten Beitrags-Review (D-06: kein neues Recht).
func (h *FansubGroupHintsReviewHandler) ListHints(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_hint.list.denied", &fansubID, "fansub_group_hint", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	rows, err := h.reviewRepo.ListByTargetGroup(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "gruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub group hints review: ListByTargetGroup error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

// ConfirmHint bestätigt einen offenen Hinweis: status='acknowledged', decided_by/decided_at
// gesetzt. Anders als ConfirmProposal (ContributionReviewHandler) löst dies KEINEN
// Release-Crew- oder Mitgliedschafts-Seiteneffekt aus — es gibt auf diesem Handler absichtlich
// keinen vergleichbaren Service, der aufgerufen werden könnte (kein "WithReleaseCrewService"-
// Hook wie beim Donor), weil der Hinweis laut Produktentscheidung reine Information bleibt.
// Ebenso gibt es hier keine Punkte- oder Badge-Vergabe: Punkte entstehen ausschließlich, wenn
// der Leader die Person später über die bestehenden, unveränderten Zuweisungswege einer
// Rolle/einem Projekt zuordnet.
// POST /api/v1/admin/fansubs/:id/group-hints/:hid/confirm
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage.
func (h *FansubGroupHintsReviewHandler) ConfirmHint(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	hintID, err := strconv.ParseInt(c.Param("hid"), 10, 64)
	if err != nil || hintID <= 0 {
		badRequest(c, "ungültige hinweis-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_hint.confirm.denied", &fansubID, "fansub_group_hint", &hintID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	if err := decideFansubGroupHint(c.Request.Context(), h.reviewRepo, hintID, identity.AppUserID, "confirm", nil); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Hinweis nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("fansub group hints review: Confirm error (fansub_id=%d, hint_id=%d): %v", fansubID, hintID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_hint.confirmed",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_hint",
		TargetID:       &hintID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Hinweis wurde bestätigt."})
}

// RejectHint lehnt einen offenen Hinweis ab: status='rejected', optionale decision_note,
// kein Hard-Delete (der abgelehnte Hinweis bleibt als Datensatz erhalten, taucht aber nicht
// mehr in der offenen Liste auf — D-04(3)).
// POST /api/v1/admin/fansubs/:id/group-hints/:hid/reject
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage.
func (h *FansubGroupHintsReviewHandler) RejectHint(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	hintID, err := strconv.ParseInt(c.Param("hid"), 10, 64)
	if err != nil || hintID <= 0 {
		badRequest(c, "ungültige hinweis-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_hint.reject.denied", &fansubID, "fansub_group_hint", &hintID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
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

	if err := decideFansubGroupHint(c.Request.Context(), h.reviewRepo, hintID, identity.AppUserID, "reject", req.DecisionNote); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Hinweis nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("fansub group hints review: Reject error (fansub_id=%d, hint_id=%d): %v", fansubID, hintID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_hint.rejected",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_hint",
		TargetID:       &hintID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"has_note": req.DecisionNote != nil},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Hinweis wurde abgelehnt."})
}
