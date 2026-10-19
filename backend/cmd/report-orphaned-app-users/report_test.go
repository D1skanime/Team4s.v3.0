package main

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestComputeOrphanedAppUsers_EmptyAppUsers proves the trivial base case: no app_users rows
// means no orphans, regardless of what Keycloak knows about.
func TestComputeOrphanedAppUsers_EmptyAppUsers(t *testing.T) {
	result := computeOrphanedAppUsers(nil, map[string]struct{}{"sub-1": {}})
	require.Empty(t, result)
}

// TestComputeOrphanedAppUsers_AllSubjectsPresent proves that when every app_users
// keycloak_subject has a matching user_entity row, nothing is reported as orphaned.
func TestComputeOrphanedAppUsers_AllSubjectsPresent(t *testing.T) {
	appUsers := []AppUserSubject{
		{ID: 1, KeycloakSubject: "sub-1", Email: "a@example.com"},
		{ID: 2, KeycloakSubject: "sub-2", Email: "b@example.com"},
	}
	keycloakSubjectIDs := map[string]struct{}{"sub-1": {}, "sub-2": {}}

	result := computeOrphanedAppUsers(appUsers, keycloakSubjectIDs)
	require.Empty(t, result)
}

// TestComputeOrphanedAppUsers_OneOfThreeMissing proves the core D-08 scenario: exactly one
// app_users row whose keycloak_subject is absent from Keycloak's user_entity set is reported,
// with its original ID/Email carried through unchanged.
func TestComputeOrphanedAppUsers_OneOfThreeMissing(t *testing.T) {
	appUsers := []AppUserSubject{
		{ID: 1, KeycloakSubject: "sub-1", Email: "a@example.com"},
		{ID: 2, KeycloakSubject: "sub-2", Email: "b@example.com"},
		{ID: 3, KeycloakSubject: "sub-missing", Email: "c@example.com"},
	}
	keycloakSubjectIDs := map[string]struct{}{"sub-1": {}, "sub-2": {}}

	result := computeOrphanedAppUsers(appUsers, keycloakSubjectIDs)
	require.Len(t, result, 1)
	require.Equal(t, OrphanedAppUser{ID: 3, KeycloakSubject: "sub-missing", Email: "c@example.com"}, result[0])
}

// TestComputeOrphanedAppUsers_EmptyKeycloakSet proves the other edge: if Keycloak's user_entity
// set is empty (e.g. a fresh Keycloak with no imported users yet) but app_users has rows, ALL of
// them are reported as orphaned -- nothing in the function special-cases an empty right-hand
// side.
func TestComputeOrphanedAppUsers_EmptyKeycloakSet(t *testing.T) {
	appUsers := []AppUserSubject{
		{ID: 1, KeycloakSubject: "sub-1", Email: "a@example.com"},
		{ID: 2, KeycloakSubject: "sub-2", Email: "b@example.com"},
	}

	result := computeOrphanedAppUsers(appUsers, map[string]struct{}{})
	require.Len(t, result, 2)
	require.Equal(t, int64(1), result[0].ID)
	require.Equal(t, int64(2), result[1].ID)
}

// TestRunReportPostgres proves runReport end-to-end against two REAL, independently
// schema-isolated Postgres pools acting as stand-ins for the Team4s DB (Pool A) and the
// Keycloak DB (Pool B). Two separate testsupport.OpenPhase106Postgres(t) calls each produce
// their own isolated schema in the same guard database -- sufficient to simulate "two separate
// databases" for this test without a new fixture file.
func TestRunReportPostgres(t *testing.T) {
	ctx := context.Background()

	poolA := testsupport.OpenPhase106Postgres(t) // Team4s DB stand-in
	poolB := testsupport.OpenPhase106Postgres(t) // Keycloak DB stand-in

	_, err := poolA.Exec(ctx, `ALTER TABLE app_users ADD COLUMN keycloak_subject TEXT, ADD COLUMN email TEXT;`)
	require.NoError(t, err)

	_, err = poolA.Exec(ctx, `
		INSERT INTO app_users (id, keycloak_subject, email) VALUES
			(1, 'sub-kept-1', 'kept1@example.com'),
			(2, 'sub-kept-2', 'kept2@example.com'),
			(3, 'sub-orphaned', 'orphaned@example.com')
	`)
	require.NoError(t, err)

	_, err = poolB.Exec(ctx, `CREATE TABLE user_entity (id TEXT PRIMARY KEY);`)
	require.NoError(t, err)

	_, err = poolB.Exec(ctx, `
		INSERT INTO user_entity (id) VALUES ('sub-kept-1'), ('sub-kept-2')
	`)
	require.NoError(t, err)

	orphaned, err := runReport(ctx, poolA, poolB)
	require.NoError(t, err)
	require.Len(t, orphaned, 1)
	require.Equal(t, OrphanedAppUser{ID: 3, KeycloakSubject: "sub-orphaned", Email: "orphaned@example.com"}, orphaned[0])
}

// TestReportPackageNeverMutatesData is an allowed absence check (CLAUDE.md Teststil exception):
// it reads the full source of report.go and main.go and asserts that none of the mutating SQL
// keywords this package must never use appear anywhere, case-insensitively. This is the
// structural proof behind D-08's "report only, never delete" guarantee -- it fails immediately
// if a future change introduces a write path, rather than relying on code review alone.
func TestReportPackageNeverMutatesData(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	require.True(t, ok, "resolve current test file path")
	dir := filepath.Dir(currentFile)

	forbidden := []string{"DELETE FROM", "UPDATE APP_USERS", "UPDATE USER_ENTITY", "INSERT INTO"}

	for _, name := range []string{"report.go", "main.go"} {
		path := filepath.Join(dir, name)
		content, err := os.ReadFile(path)
		require.NoError(t, err, "read %s", path)
		upper := strings.ToUpper(string(content))
		for _, forbiddenStatement := range forbidden {
			require.NotContains(t, upper, forbiddenStatement, "%s must never contain a %q statement (D-08: report-only)", name, forbiddenStatement)
		}
	}
}
