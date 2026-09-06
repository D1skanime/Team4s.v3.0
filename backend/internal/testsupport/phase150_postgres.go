package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase150DSNEnv = "TEAM4S_PHASE150_TEST_DSN"

var (
	phase150DatabasePattern = regexp.MustCompile(`^team4s_phase150_test_[a-z0-9]+$`)
	phase150SchemaPattern   = regexp.MustCompile(`^phase150_[a-z0-9_]+$`)
)

// OpenPhase150Postgres opens the dedicated Phase-150 fixture and prepares the minimal
// stand-in tables badge_service.go's membership/productive-tier queries need
// (hist_fansub_group_members with the real post-migration-0114 joined_date/left_date
// DATE columns, anime_contributions with the real post-migration-0105 member_id column,
// and member_badges in its real migration-0087 shape). Mirrors this codebase's own
// precedent for these exact tables (member_profile_dashboard_repository_test.go's
// openOwnDashboardPostgres) rather than chaining the full real production migration
// history (0082 -> 0086 -> 0087 -> 0105 -> 0114), which would additionally require
// role_definitions/anime/fansub_groups stand-ins purely to satisfy FK constraints on
// columns these tests never touch (anime_contribution_roles, confirmed_by, etc.) --
// same column names/types/semantics badge_service.go's real SQL depends on, without the
// unrelated dependency chain.
func OpenPhase150Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase150DSNEnv,
		phase150DatabasePattern,
		"phase150_",
		phase150SchemaPattern,
		createPhase150Prerequisites,
	)
}

func validatePhase150DatabaseName(name string) error {
	if !phase150DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase150DatabasePattern)
	}
	return nil
}

func validatePhase150SchemaName(name string) error {
	if !phase150SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase150SchemaPattern)
	}
	return nil
}

func createPhase150Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE members (
	id BIGINT PRIMARY KEY
);
CREATE TABLE hist_fansub_group_members (
	id          BIGSERIAL PRIMARY KEY,
	member_id   BIGINT NOT NULL,
	joined_date DATE NULL,
	left_date   DATE NULL
);
CREATE TABLE anime_contributions (
	id        BIGSERIAL PRIMARY KEY,
	member_id BIGINT NULL,
	anime_id  BIGINT NOT NULL,
	status    VARCHAR(20) NOT NULL DEFAULT 'draft'
);
CREATE TABLE member_claims (
	id           BIGSERIAL PRIMARY KEY,
	member_id    BIGINT NOT NULL,
	claim_status VARCHAR(20) NOT NULL DEFAULT 'pending'
);
CREATE TABLE member_badges (
	id                BIGSERIAL PRIMARY KEY,
	member_id         BIGINT NOT NULL,
	badge_code        TEXT NOT NULL,
	badge_category    VARCHAR(30) NOT NULL,
	derived_from_type TEXT NULL,
	derived_from_id   BIGINT NULL,
	status            VARCHAR(20) NOT NULL DEFAULT 'active',
	visibility        VARCHAR(20) NOT NULL DEFAULT 'public',
	awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_phase150_member_badges_member_code UNIQUE (member_id, badge_code)
);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-150 prerequisites: %v", err)
	}
}
