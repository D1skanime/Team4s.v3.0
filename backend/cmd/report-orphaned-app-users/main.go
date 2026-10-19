// Command report-orphaned-app-users is the D-08 hygiene report for Befund #27 (188-CONTEXT.md):
// a one-off, PURELY READ-ONLY CLI tool that lists app_users rows whose keycloak_subject no
// longer has a matching row in Keycloak's own user_entity table (orphaned by a Keycloak
// delete+recreate). Standard mode is ALWAYS report-only -- no automatic deletion in this phase.
// Shape mirrored on backend/cmd/migrate-preview-backfill/main.go: a thin main() that only reads
// env vars, opens pools, calls the importable core, and prints a summary -- the actual logic
// lives in runReport (report.go), not hidden inside main(). KEIN Lösch-, Update- oder sonstiger
// Mutationscode in dieser Datei -- strukturell bewiesen durch report_test.go's
// TestReportPackageNeverMutatesData, das beide Dateien liest.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	databaseURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable")
	keycloakDatabaseURL := getEnv("KEYCLOAK_DATABASE_URL", "postgres://keycloak:keycloak_dev_password@keycloak-db:5432/keycloak?sslmode=disable")

	ctx := context.Background()

	teamPool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to Team4s database: %v\n", err)
	}
	defer teamPool.Close()

	keycloakPool, err := pgxpool.New(ctx, keycloakDatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to Keycloak database: %v\n", err)
	}
	defer keycloakPool.Close()

	log.Println("Connected to Team4s database and Keycloak database")

	orphaned, err := runReport(ctx, teamPool, keycloakPool)
	if err != nil {
		log.Fatalf("Report failed: %v\n", err)
	}

	if len(orphaned) == 0 {
		fmt.Println("Keine verwaisten app_users-Zeilen gefunden.")
		return
	}

	for _, row := range orphaned {
		fmt.Printf("ID=%d KeycloakSubject=%s Email=%s\n", row.ID, row.KeycloakSubject, row.Email)
	}
	fmt.Printf("%d verwaiste app_users-Zeile(n) gefunden -- keine Änderung vorgenommen (Report-Modus, D-08).\n", len(orphaned))
}

// getEnv returns environment variable or default value
func getEnv(key, defaultValue string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return defaultValue
}
