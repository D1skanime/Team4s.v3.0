package testsupport

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase128DSNEnv = "TEAM4S_PHASE128_TEST_DSN"

var (
	phase128DatabasePattern = regexp.MustCompile(`^team4s_phase128_test(?:_[a-z0-9]+)?$`)
	phase128SchemaPattern   = regexp.MustCompile(`^phase128_[a-z0-9_]+$`)
)

// OpenPhase128Postgres opens the dedicated Phase-128 database and prepares an
// isolated schema containing only the member identity prerequisites. Unlike
// older phase fixtures, opting in with the dedicated DSN is mandatory.
func OpenPhase128Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	if strings.TrimSpace(os.Getenv(phase128DSNEnv)) == "" {
		t.Fatalf("%s is required for Phase-128 PostgreSQL tests", phase128DSNEnv)
	}
	return openPhasePostgres(
		t,
		phase128DSNEnv,
		phase128DatabasePattern,
		"phase128_",
		phase128SchemaPattern,
		createPhase128Prerequisites,
	)
}

func validatePhase128DatabaseName(name string) error {
	if !phase128DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase128DatabasePattern)
	}
	return nil
}

func validatePhase128SchemaName(name string) error {
	if !phase128SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase128SchemaPattern)
	}
	return nil
}

func createPhase128Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE members (
    id BIGSERIAL PRIMARY KEY,
    nickname VARCHAR(120) NOT NULL,
    display_name VARCHAR(160),
    profile_visibility VARCHAR(32) NOT NULL DEFAULT 'public',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_members_profile_visibility
        CHECK (profile_visibility IN ('public', 'members_only'))
);
CREATE TABLE member_claims (
    id BIGSERIAL PRIMARY KEY,
    app_user_id BIGINT,
    member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
    claim_status VARCHAR(32) NOT NULL DEFAULT 'pending'
);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-128 prerequisites: %v", err)
	}
}
