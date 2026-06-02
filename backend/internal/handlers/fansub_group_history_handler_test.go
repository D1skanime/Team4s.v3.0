package handlers

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Diese Tests sind echte Source-Inspection-Tests: Sie lesen die tatsächliche
// Handler-/Routen-Quelle und prüfen, dass die sicherheitskritische Cross-Group-
// Guard-Logik (T-68-02-03) und der D-11-Default je Funktion vorhanden sind.
// Wird der Guard entfernt oder umbenannt, schlagen die Tests fehl.
//
// Hintergrund: FansubGroupHistoryHandler hängt an einem konkreten Repository-Typ
// (kein Interface), Verhaltens-Tests bräuchten einen Mocking-Refactor. Bis dahin
// schützen diese Quellprüfungen gegen stille Regressionen der Sicherheitslogik.

// funcBody extrahiert den Quelltext einer Go-Methode ab "func (...) Name(" bis zur
// nächsten Top-Level-Funktionsdeklaration (Spalte-0 "func ").
func funcBody(t *testing.T, src, name string) string {
	t.Helper()
	startRe := regexp.MustCompile(`(?m)^func \([^)]*\) ` + regexp.QuoteMeta(name) + `\(`)
	loc := startRe.FindStringIndex(src)
	require.NotNil(t, loc, "Funktion %s nicht in Handler-Quelle gefunden", name)
	rest := src[loc[1]:]
	nextRe := regexp.MustCompile(`(?m)^func `)
	if nl := nextRe.FindStringIndex(rest); nl != nil {
		return rest[:nl[0]]
	}
	return rest
}

func readSource(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	require.NoError(t, err, "Quelldatei %s lesbar", path)
	return string(b)
}

const handlerSrcPath = "fansub_group_history_handler.go"

// T-68-02-03: DeleteGroupHistory muss den Eintrag VOR dem Löschen via GetByID
// laden und bei FansubGroupID-Mismatch mit 404 antworten (kein Cross-Group-Delete).
func TestDeleteGroupHistory_CrossGroupGuard(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "DeleteGroupHistory")
	assert.Contains(t, body, "GetByID", "DeleteGroupHistory lädt den Eintrag vor dem Löschen")
	assert.Contains(t, body, "existing.FansubGroupID != fansubID",
		"DeleteGroupHistory vergleicht die Gruppen-Zugehörigkeit")
	assert.Contains(t, body, "http.StatusNotFound",
		"DeleteGroupHistory gibt 404 bei fremder Gruppe zurück")
	// Der Guard muss VOR dem eigentlichen Delete-Aufruf stehen.
	guardIdx := strings.Index(body, "existing.FansubGroupID != fansubID")
	deleteIdx := strings.Index(body, "historyRepo.Delete(")
	require.GreaterOrEqual(t, deleteIdx, 0, "DeleteGroupHistory ruft Delete auf")
	assert.Less(t, guardIdx, deleteIdx, "Cross-Group-Guard steht vor dem Delete-Aufruf")
}

// T-68-02-03: UpdateGroupHistory hat dieselbe Angriffsfläche und denselben Guard.
func TestUpdateGroupHistory_CrossGroupGuard(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "UpdateGroupHistory")
	assert.Contains(t, body, "GetByID", "UpdateGroupHistory lädt den Eintrag vor dem Aktualisieren")
	assert.Contains(t, body, "existing.FansubGroupID != fansubID",
		"UpdateGroupHistory vergleicht die Gruppen-Zugehörigkeit")
	assert.Contains(t, body, "http.StatusNotFound",
		"UpdateGroupHistory gibt 404 bei fremder Gruppe zurück")
}

// D-11: CreateGroupHistory setzt Leader-Einträge fest auf status='confirmed'.
func TestCreateGroupHistory_StatusConfirmedDefault(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "CreateGroupHistory")
	assert.Contains(t, body, `status := "confirmed"`,
		"CreateGroupHistory setzt status='confirmed' als Default (D-11)")
	assert.NotContains(t, body, "normalizeHistoricalContributionStatus",
		"CreateGroupHistory umgeht die alte Status-Normalisierung (D-11)")
}

// D-10: Titel ist Pflichtfeld in CreateGroupHistory (422 bei fehlendem Titel).
func TestCreateGroupHistory_TitleRequired(t *testing.T) {
	body := funcBody(t, readSource(t, handlerSrcPath), "CreateGroupHistory")
	assert.Contains(t, body, "http.StatusUnprocessableEntity",
		"CreateGroupHistory lehnt fehlenden Titel mit 422 ab (D-10)")
}

// Die DELETE-Route muss registriert und mit auth-Middleware geschützt sein.
func TestDeleteGroupHistory_RouteRegistered(t *testing.T) {
	routes := readSource(t, "../../cmd/server/admin_routes.go")
	assert.Regexp(t,
		`v1\.DELETE\("/admin/fansubs/:id/history/:historyId",\s*auth,\s*deps\.groupHistoryHandler\.DeleteGroupHistory\)`,
		routes, "DELETE-Route ist mit auth-Middleware registriert")
}

// permissionSvc-Verdrahtung: das Struct trägt das Feld und WithPermissionSvc chaint.
func TestFansubGroupHistoryHandler_PermissionSvcField(t *testing.T) {
	h := NewFansubGroupHistoryHandler(nil)
	assert.Nil(t, h.permissionSvc, "permissionSvc ist initial nil")
	result := h.WithPermissionSvc(nil)
	assert.Same(t, h, result, "WithPermissionSvc gibt denselben Handler zurück (Chaining)")
}
