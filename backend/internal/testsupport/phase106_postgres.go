package testsupport

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const phase106DSNEnv = "TEAM4S_PHASE106_TEST_DSN"

var (
	phase106DatabasePattern = regexp.MustCompile(`^team4s_phase106_test_[a-z0-9]+$`)
	phase106SchemaPattern   = regexp.MustCompile(`^phase106_[a-z0-9_]+$`)
	publicTargetPattern     = regexp.MustCompile(`(?im)\b(?:alter|create|delete\s+from|drop|insert\s+into|truncate|update)\s+(?:table\s+|function\s+|index\s+|trigger\s+|type\s+)?(?:if\s+(?:not\s+)?exists\s+)?(?:public|"public")\s*\.`)
	publicSchemaDDLPattern  = regexp.MustCompile(`(?im)\b(?:alter|create|drop)\s+schema\s+(?:if\s+(?:not\s+)?exists\s+)?(?:public|"public")(?:\s|;|$)`)
)

// OpenPhase106Postgres opens an explicitly opted-in, schema-isolated PostgreSQL
// fixture. It deliberately never consults DATABASE_URL or application config.
func OpenPhase106Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase106DSNEnv,
		phase106DatabasePattern,
		"phase106_",
		phase106SchemaPattern,
		createPhase106Prerequisites,
	)
}

func openPhasePostgres(
	t *testing.T,
	dsnEnv string,
	databasePattern *regexp.Regexp,
	schemaPrefix string,
	schemaPattern *regexp.Regexp,
	createPrerequisites func(testing.TB, *pgxpool.Pool),
) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv(dsnEnv)
	if strings.TrimSpace(dsn) == "" {
		t.Skipf("%s is not set; skipping PostgreSQL integration test", dsnEnv)
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("parse %s: %v", dsnEnv, err)
	}
	databaseName := config.ConnConfig.Database
	if !databasePattern.MatchString(databaseName) {
		t.Fatalf("unsafe %s: database name %q must match %s", dsnEnv, databaseName, databasePattern)
	}

	adminPool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		t.Fatalf("open guarded PostgreSQL database: %v", err)
	}
	var runtimeDatabase string
	if err := adminPool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDatabase); err != nil {
		adminPool.Close()
		t.Fatalf("read current database: %v", err)
	}
	if runtimeDatabase != databaseName {
		adminPool.Close()
		t.Fatalf("runtime database %q differs from guarded DSN database %q", runtimeDatabase, databaseName)
	}

	schema := newPhasePostgresSchemaName(t, schemaPrefix, schemaPattern)
	if _, err := adminPool.Exec(context.Background(), "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize()); err != nil {
		adminPool.Close()
		t.Fatalf("create isolated schema: %v", err)
	}

	scopedConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		adminPool.Close()
		t.Fatalf("parse scoped PostgreSQL config: %v", err)
	}
	scopedConfig.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
		return err
	}
	scopedPool, err := pgxpool.NewWithConfig(context.Background(), scopedConfig)
	if err != nil {
		_, _ = adminPool.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
		adminPool.Close()
		t.Fatalf("open schema-scoped PostgreSQL pool: %v", err)
	}
	var cleanupOnce sync.Once
	cleanup := func() {
		cleanupOnce.Do(func() {
			scopedPool.Close()
			if !schemaPattern.MatchString(schema) {
				t.Errorf("refusing cleanup for unsafe schema %q", schema)
				adminPool.Close()
				return
			}
			if _, err := adminPool.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE"); err != nil {
				t.Errorf("drop isolated schema %q: %v", schema, err)
			}
			adminPool.Close()
		})
	}
	t.Cleanup(cleanup)

	var schemas []string
	if err := scopedPool.QueryRow(context.Background(), `SELECT current_schemas(false)`).Scan(&schemas); err != nil {
		t.Fatalf("read effective schemas: %v", err)
	}
	if len(schemas) != 1 || schemas[0] != schema || containsString(schemas, "public") {
		t.Fatalf("unsafe search_path schemas: %v", schemas)
	}

	createPrerequisites(t, scopedPool)

	return scopedPool
}

// ApplySQLFile executes a Phase-106 SQL artifact after rejecting explicit
// executable targets in the public schema.
func ApplySQLFile(t testing.TB, pool *pgxpool.Pool, path string) {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read SQL file %s: %v", path, err)
	}
	if err := validatePhase106SQL(string(content)); err != nil {
		t.Fatalf("unsafe SQL file %s: %v", path, err)
	}
	if _, err := pool.Exec(context.Background(), string(content)); err != nil {
		t.Fatalf("apply SQL file %s: %v", path, err)
	}
}

func validatePhase106DatabaseName(name string) error {
	if !phase106DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase106DatabasePattern)
	}
	return nil
}

func validatePhase106SchemaName(name string) error {
	if !phase106SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase106SchemaPattern)
	}
	return nil
}

func validatePhase106SQL(sql string) error {
	if publicTargetPattern.MatchString(sql) || publicSchemaDDLPattern.MatchString(sql) {
		return fmt.Errorf("executable public-qualified target is forbidden")
	}
	return nil
}

func newPhase106SchemaName(t testing.TB) string {
	t.Helper()
	return newPhasePostgresSchemaName(t, "phase106_", phase106SchemaPattern)
}

func newPhasePostgresSchemaName(t testing.TB, prefix string, pattern *regexp.Regexp) string {
	t.Helper()
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		t.Fatalf("create random schema suffix: %v", err)
	}
	name := prefix + hex.EncodeToString(random)
	if !pattern.MatchString(name) {
		t.Fatalf("schema name %q must match %s", name, pattern)
	}
	return name
}

func createPhase106Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE members (id BIGINT PRIMARY KEY);
CREATE TABLE app_users (id BIGINT PRIMARY KEY);
CREATE TABLE fansub_groups (id BIGINT PRIMARY KEY);
CREATE TABLE release_versions (id BIGINT PRIMARY KEY);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-106 FK prerequisites: %v", err)
	}
}

func containsString(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}
