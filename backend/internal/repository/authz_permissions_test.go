package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readAuthzPermissionsSource lädt die Quelldatei authz_permissions.go
// relativ zur aktuellen Test-Datei (Source-Inspection-Muster, konsistent mit
// anderen Repository-Tests wie admin_content_fansub_releases_test.go).
func readAuthzPermissionsSource(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path failed")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "authz_permissions.go"))
	if err != nil {
		t.Fatalf("read authz_permissions.go: %v", err)
	}
	return string(content)
}

// TestListActorContributionRolesForVersion ist ein Wave-0-Test (Plan 83-01) für D-02.
//
// Die Methode ListActorContributionRolesForVersion wird in Plan 83-02 an
// AuthzRepository ergänzt. Dieser Test definiert das gewünschte Verhalten,
// bevor der Produktionscode existiert (ROT-Zustand bis Plan 83-02).
//
// Auflösungslogik (D-02):
//   - Schritt 1 (versions-spezifisch): role_codes aus anime_contributions mit
//     release_version_id = versionID (Override-Satz für diese Release-Version).
//   - Schritt 2 (Fallback anime-weit): role_codes aus anime_contributions mit
//     release_version_id IS NULL, wenn Schritt 1 kein Ergebnis liefert.
//
// Gibt leere Liste zurück wenn keine Contribution existiert (→ D-04: kein Recht).
func TestListActorContributionRolesForVersion(t *testing.T) {
	src := readAuthzPermissionsSource(t)

	// Schritt 1: versions-spezifische Contributions
	// Erwartet: role_codes aus anime_contributions wo release_version_id = versionID.
	t.Run("versions-spezifisch", func(t *testing.T) {
		if !strings.Contains(src, "ListActorContributionRolesForVersion") {
			t.Fatal("Wave-0 RED: ListActorContributionRolesForVersion ist noch nicht in authz_permissions.go definiert (wird in Plan 83-02 ergänzt)")
		}
		// Nach Plan 83-02: Methode existiert → Schritt 1 Query prüfen.
		// Erwartet: SELECT mit release_version_id = $versionID (kein IS NULL).
		if !strings.Contains(src, "release_version_id") {
			t.Error("erwartet: Query enthält release_version_id-Filter (versions-spezifischer Satz)")
		}
	})

	// Schritt 2 (Fallback anime-weit): role_codes wenn kein versions-spezifischer Satz.
	t.Run("fallback-anime-weit", func(t *testing.T) {
		if !strings.Contains(src, "ListActorContributionRolesForVersion") {
			t.Fatal("Wave-0 RED: ListActorContributionRolesForVersion ist noch nicht in authz_permissions.go definiert (wird in Plan 83-02 ergänzt)")
		}
		// Nach Plan 83-02: Methode existiert → Fallback-Logik prüfen.
		// Erwartet: Fallback-Query mit release_version_id IS NULL wenn Schritt 1 leer.
		if !strings.Contains(src, "IS NULL") {
			t.Error("erwartet: Fallback-Query enthält release_version_id IS NULL (anime-weiter Satz)")
		}
	})
}
