package handlers

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readContributionsHandlerSource laedt eine Quelldatei relativ zur Test-Datei.
// Source-Inspection-Muster, da contributionsRepo ein konkreter Typ ist (kein
// Interface-Mock ohne Architektur-Refactor; konsistent mit Phase 37).
func readContributionsHandlerSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

// TestReleaseVersionValidation_RequestStructsCarryField verifiziert, dass beide
// Request-Structs ein optionales release_version_id tragen (D-10).
func TestReleaseVersionValidation_RequestStructsCarryField(t *testing.T) {
	// Request-Structs sind nach fansub_contributions_validation.go ausgelagert
	// (450-Zeilen-Limit); beide Quellen kombiniert pruefen.
	handler := readContributionsHandlerSource(t, "fansub_anime_contributions_handler.go")
	validation := readContributionsHandlerSource(t, "fansub_contributions_validation.go")
	collapsed := strings.Join(strings.Fields(strings.ToLower(handler+"\n"+validation)), " ")

	required := []string{
		"releaseversionid *int64",
		"releaseversionid **int64",
		`json:"release_version_id"`,
	}
	for _, frag := range required {
		if !strings.Contains(collapsed, frag) {
			t.Fatalf("erwartetes Request-Struct-Fragment %q im Handler", frag)
		}
	}
}

// TestReleaseVersionValidation_BothPathsCallParticipation verifiziert, dass der
// Beteiligungs-Check GroupParticipatesInReleaseVersion in Create UND Update aufgerufen wird.
func TestReleaseVersionValidation_BothPathsCallParticipation(t *testing.T) {
	handler := strings.ToLower(readContributionsHandlerSource(t, "fansub_anime_contributions_handler.go"))
	validation := strings.ToLower(readContributionsHandlerSource(t, "fansub_contributions_validation.go"))
	combined := handler + "\n" + validation

	if !strings.Contains(combined, "groupparticipatesinreleaseversion") {
		t.Fatalf("erwarteter Aufruf von GroupParticipatesInReleaseVersion")
	}
	// Beide Handler-Pfade muessen den gemeinsamen Validierungs-Helper aufrufen.
	if strings.Count(handler, "validatereleaseversionparticipation") < 2 {
		t.Fatalf("erwartete Aufrufe des Validierungs-Helpers in BEIDEN Schreibpfaden (Create + Update)")
	}
}

// TestReleaseVersionValidation_GermanUmlautMessage verifiziert die deutsche 422-Meldung
// mit korrekten Umlauten (kein ae/oe/ue/ss-Ersatz).
func TestReleaseVersionValidation_GermanUmlautMessage(t *testing.T) {
	validation := readContributionsHandlerSource(t, "fansub_contributions_validation.go")

	if !strings.Contains(validation, "gewählten Release-Version nicht beteiligt") {
		t.Fatalf("erwartete deutsche 422-Meldung mit korrekten Umlauten")
	}
}

// TestReleaseVersionValidation_AuditPayloadCarriesField verifiziert, dass die
// Audit-Payload release_version_id aufnimmt (Observability).
func TestReleaseVersionValidation_AuditPayloadCarriesField(t *testing.T) {
	content := readContributionsHandlerSource(t, "fansub_anime_contributions_handler.go")
	if !strings.Contains(content, `"release_version_id"`) {
		t.Fatalf("Audit-Payload muss release_version_id aufnehmen")
	}
}
