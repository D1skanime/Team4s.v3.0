package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Test-Doppel fuer FansubGroupHintsReviewHandler-Tests ---

// hintReviewRepoStub implementiert HintReviewRepository fuer einfache, konfigurierbare
// Erfolgs-/Fehler-Faelle. callLog protokolliert, welche Repository-Methoden tatsaechlich
// aufgerufen wurden — das ist der laufzeitgestuetzte Teil des D-03/D-05-Regressionsbeweises:
// der Typ besitzt NUR ListByTargetGroup/Confirm/Reject (die drei Methoden des
// HintReviewRepository-Interfaces) und bewusst KEINE Methode, die einer
// Mitgliedschafts-/Rollenzuweisung (z. B. "ConfirmContribution") oder einer
// Punkte-/Badge-Vergabe (z. B. "AwardPoints"/"GrantBadge") aehnelt. Dass ConfirmHint trotzdem
// nur genau "Confirm" in callLog hinterlaesst, beweist, dass der Handler keinen zusaetzlichen
// Seiteneffekt-Aufruf macht — es gibt am Handler schlicht keine weitere Dependency, die er
// aufrufen koennte (anders als ContributionReviewHandler.releaseCrewSvc beim Donor).
type hintReviewRepoStub struct {
	listResult   []repository.FansubGroupHintRow
	listErr      error
	confirmErr   error
	rejectErr    error
	capturedNote *string
	callLog      []string
}

func (s *hintReviewRepoStub) ListByTargetGroup(ctx context.Context, targetGroupID int64) ([]repository.FansubGroupHintRow, error) {
	s.callLog = append(s.callLog, "ListByTargetGroup")
	return s.listResult, s.listErr
}

func (s *hintReviewRepoStub) Confirm(ctx context.Context, hintID, actorAppUserID int64) error {
	s.callLog = append(s.callLog, "Confirm")
	return s.confirmErr
}

func (s *hintReviewRepoStub) Reject(ctx context.Context, hintID, actorAppUserID int64, decisionNote *string) error {
	s.callLog = append(s.callLog, "Reject")
	s.capturedNote = decisionNote
	return s.rejectErr
}

// statefulHintRepoFake haelt echte, veraenderliche Hinweis-Zeilen im Speicher und bildet
// Confirm/Reject als tatsaechliche Statusuebergaenge nach (open -> acknowledged/rejected,
// ErrNotFound bei bereits entschiedenen Hinweisen) — genau wie die reale
// FansubGroupHintsRepository. Damit laesst sich "eine abgelehnte Zeile verschwindet aus der
// offenen Ansicht, wird aber nicht hart geloescht" durch einen echten zweiten ListHints-Aufruf
// nach der Ablehnung nachweisen statt nur behauptet zu werden. Auch dieser Typ hat
// strukturell keine Mitgliedschafts- oder Punkte-/Badge-Methode.
type statefulHintRepoFake struct {
	hints []*repository.FansubGroupHintRow
}

func (f *statefulHintRepoFake) ListByTargetGroup(ctx context.Context, targetGroupID int64) ([]repository.FansubGroupHintRow, error) {
	out := make([]repository.FansubGroupHintRow, 0, len(f.hints))
	for _, h := range f.hints {
		out = append(out, *h)
	}
	return out, nil
}

func (f *statefulHintRepoFake) Confirm(ctx context.Context, hintID, actorAppUserID int64) error {
	for _, h := range f.hints {
		if h.ID == hintID {
			if h.Status != "open" {
				return repository.ErrNotFound
			}
			h.Status = "acknowledged"
			h.DecidedBy = &actorAppUserID
			return nil
		}
	}
	return repository.ErrNotFound
}

func (f *statefulHintRepoFake) Reject(ctx context.Context, hintID, actorAppUserID int64, decisionNote *string) error {
	for _, h := range f.hints {
		if h.ID == hintID {
			if h.Status != "open" {
				return repository.ErrNotFound
			}
			h.Status = "rejected"
			h.DecisionNote = decisionNote
			h.DecidedBy = &actorAppUserID
			return nil
		}
	}
	return repository.ErrNotFound
}

// buildHintReviewHandler baut einen FansubGroupHintsReviewHandler mit Stubs. Nutzt dieselben
// reviewPermissionSvcStub/auditReviewStub/setReviewTestAuth-Helfer wie
// contribution_review_handler_test.go (gleiches Package) — kein Kopie-Doppel.
func buildHintReviewHandler(perm *reviewPermissionSvcStub, repo HintReviewRepository, audit *auditReviewStub) *FansubGroupHintsReviewHandler {
	return NewFansubGroupHintsReviewHandler(repo, perm, audit)
}

// --- ListHints ---

func TestFansubGroupHintsReview_ListHints_RequiresLeaderOrAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: false},
		&hintReviewRepoStub{},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansubs/1/group-hints", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	setReviewTestAuth(c, 42)

	handler.ListHints(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if audit.writeCount < 1 || audit.lastEvent != "fansub_group_hint.list.denied" {
		t.Fatalf("auditPermissionDenied wurde nicht wie erwartet aufgerufen: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
}

// TestFansubGroupHintsReview_ListHints_ReturnsAllRowsUnfiltered belegt den D-11-
// Regressionsschutz: dieser Handler filtert selbst NICHTS heraus — auch nicht eine Zeile,
// deren Zielgruppe (aus Sicht eines hypothetischen Aufrufers) aktuell keine aktive Leitung
// hätte. Diese Unterscheidung ist ausschließlich Aufgabe von
// `FansubGroupHintsRepository.ListWithoutActiveLead` (Plan 191-11), niemals dieses Handlers.
func TestFansubGroupHintsReview_ListHints_ReturnsAllRowsUnfiltered(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rows := []repository.FansubGroupHintRow{
		{ID: 1, Status: "open"},
		{ID: 2, Status: "open"},
		{ID: 3, Status: "acknowledged"},
	}
	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&hintReviewRepoStub{listResult: rows},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansubs/1/group-hints", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	setReviewTestAuth(c, 42)

	handler.ListHints(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data []repository.FansubGroupHintRow `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON dekodieren: %v", err)
	}
	if len(resp.Data) != 3 {
		t.Fatalf("erwartet alle 3 Hinweise unveraendert, erhalten %d: %+v", len(resp.Data), resp.Data)
	}
}

// --- ConfirmHint ---

func TestFansubGroupHintsReview_ConfirmHint_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &hintReviewRepoStub{confirmErr: nil}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if audit.writeCount < 1 || audit.lastEvent != "fansub_group_hint.confirmed" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}

	// D-03/D-05-Regressionsbeweis: ConfirmHint darf am Repository-Doppel AUSSCHLIESSLICH
	// "Confirm" ausgeloest haben — kein weiterer Aufruf, weil keine weitere Methode (geschweige
	// denn eine Mitgliedschafts- oder Punkte-/Badge-Methode) auf diesem Typ existiert.
	if len(repo.callLog) != 1 || repo.callLog[0] != "Confirm" {
		t.Fatalf("erwartet genau einen Confirm-Aufruf ohne Seiteneffekt, callLog=%v", repo.callLog)
	}
}

func TestFansubGroupHintsReview_ConfirmHint_RequiresLeaderOrAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: false},
		&hintReviewRepoStub{},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
}

func TestFansubGroupHintsReview_ConfirmHint_AlreadyDecidedReturnsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&hintReviewRepoStub{confirmErr: repository.ErrNotFound},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/999/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "999"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON dekodieren: %v", err)
	}
	if !strings.Contains(resp.Error.Message, "Hinweis") {
		t.Fatalf("Fehlermeldung sollte 'Hinweis' statt 'Vorschlag' benennen, erhalten: %q", resp.Error.Message)
	}
}

// --- RejectHint ---

func TestFansubGroupHintsReview_RejectHint_WithNote(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &hintReviewRepoStub{rejectErr: nil}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	body := `{"decision_note":"Bitte zuerst die bestehende Mitgliedschaft prüfen."}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/reject", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.RejectHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote == nil || *repo.capturedNote != "Bitte zuerst die bestehende Mitgliedschaft prüfen." {
		t.Fatalf("decision_note nicht korrekt weitergegeben: %v", repo.capturedNote)
	}
	if audit.writeCount < 1 || audit.lastEvent != "fansub_group_hint.rejected" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
}

func TestFansubGroupHintsReview_RejectHint_WithoutNotePersistsNil(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &hintReviewRepoStub{rejectErr: nil}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/reject", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.RejectHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote != nil {
		t.Fatalf("decision_note sollte nil sein, ist aber: %q", *repo.capturedNote)
	}
}

func TestFansubGroupHintsReview_RejectHint_MalformedJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &hintReviewRepoStub{rejectErr: nil}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/reject", strings.NewReader(`{"decision_note":`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.RejectHint(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("erwartet 400, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	for _, call := range repo.callLog {
		if call == "Reject" {
			t.Fatalf("Reject darf bei malformed JSON nicht aufgerufen werden")
		}
	}
}

func TestFansubGroupHintsReview_RejectHint_AlreadyDecidedReturnsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&hintReviewRepoStub{rejectErr: repository.ErrNotFound},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/999/reject", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "999"}}
	setReviewTestAuth(c, 42)

	handler.RejectHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
}

// TestFansubGroupHintsReview_RejectHint_RemovesFromOpenListButNotHardDeleted beweist anhand
// eines echten zweiten ListHints-Aufrufs nach der Ablehnung: der Datensatz existiert
// weiterhin (kein Hard-Delete), aber sein Status ist nicht mehr 'open' — exakt das
// status-basierte Verschwinden aus der "nur offene anzeigen"-Ansicht, das D-04(3) verlangt.
func TestFansubGroupHintsReview_RejectHint_RemovesFromOpenListButNotHardDeleted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fake := &statefulHintRepoFake{
		hints: []*repository.FansubGroupHintRow{
			{ID: 7, Status: "open"},
			{ID: 8, Status: "open"},
		},
	}
	audit := &auditReviewStub{}
	handler := buildHintReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		fake,
		audit,
	)

	rejectRec := httptest.NewRecorder()
	rejectCtx, _ := gin.CreateTestContext(rejectRec)
	rejectCtx.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/reject", nil)
	rejectCtx.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(rejectCtx, 42)

	handler.RejectHint(rejectCtx)

	if rejectRec.Code != http.StatusOK {
		t.Fatalf("erwartet 200 bei Ablehnung, erhalten %d — body: %s", rejectRec.Code, rejectRec.Body.String())
	}

	listRec := httptest.NewRecorder()
	listCtx, _ := gin.CreateTestContext(listRec)
	listCtx.Request = httptest.NewRequest(http.MethodGet, "/admin/fansubs/1/group-hints", nil)
	listCtx.Params = gin.Params{{Key: "id", Value: "1"}}
	setReviewTestAuth(listCtx, 42)

	handler.ListHints(listCtx)

	var resp struct {
		Data []repository.FansubGroupHintRow `json:"data"`
	}
	if err := json.NewDecoder(listRec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON dekodieren: %v", err)
	}

	if len(resp.Data) != 2 {
		t.Fatalf("erwartet weiterhin 2 Datensaetze (kein Hard-Delete), erhalten %d", len(resp.Data))
	}

	openCount := 0
	var rejectedRow *repository.FansubGroupHintRow
	for i := range resp.Data {
		if resp.Data[i].Status == "open" {
			openCount++
		}
		if resp.Data[i].ID == 7 {
			rejectedRow = &resp.Data[i]
		}
	}
	if openCount != 1 {
		t.Fatalf("erwartet genau 1 verbleibenden offenen Hinweis nach der Ablehnung, erhalten %d", openCount)
	}
	if rejectedRow == nil || rejectedRow.Status != "rejected" {
		t.Fatalf("abgelehnter Hinweis sollte Status 'rejected' tragen, nicht hart geloescht sein: %+v", rejectedRow)
	}

	// Ein bereits abgelehnter Hinweis laesst sich nicht erneut ablehnen (keine zweite
	// Statusaenderung eines entschiedenen Hinweises).
	secondRejectRec := httptest.NewRecorder()
	secondRejectCtx, _ := gin.CreateTestContext(secondRejectRec)
	secondRejectCtx.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/group-hints/7/reject", nil)
	secondRejectCtx.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "hid", Value: "7"}}
	setReviewTestAuth(secondRejectCtx, 42)

	handler.RejectHint(secondRejectCtx)

	if secondRejectRec.Code != http.StatusNotFound {
		t.Fatalf("erneutes Ablehnen eines bereits entschiedenen Hinweises sollte 404 liefern, erhalten %d", secondRejectRec.Code)
	}
}
