package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase188PermissionsDSNEnv = "TEAM4S_PHASE188_PERMISSIONS_TEST_DSN"

var (
	phase188PermissionsDatabasePattern = regexp.MustCompile(`^team4s_phase188permissions_test_[a-z0-9]+$`)
	phase188PermissionsSchemaPattern   = regexp.MustCompile(`^phase188permissions_[a-z0-9_]+$`)
)

// OpenPhase188PermissionsPostgres opens the dedicated Plan-188-05 fixture and prepares
// the minimal stand-in tables ListActorContributionRolesForAnimeProject's SQL needs
// (anime_contributions with the real status column, anime_contribution_roles,
// fansub_group_members), WITHOUT FK enforcement -- same rationale as phase150_postgres.go:
// avoids unnecessary role_definitions/anime/fansub_groups stand-ins for columns this
// query never touches.
//
// Namenskollisions-Warnung (188-05-PLAN.md <interfaces>): 188-02-PLAN.md already owns
// phase188_postgres.go / OpenPhase188Postgres / TEAM4S_PHASE188_TEST_DSN for a COMPLETELY
// DIFFERENT schema (app_users/users, migration 0072). This fixture deliberately uses a
// distinct name (Phase188Permissions, not Phase188) to avoid colliding with that fixture.
func OpenPhase188PermissionsPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase188PermissionsDSNEnv,
		phase188PermissionsDatabasePattern,
		"phase188permissions_",
		phase188PermissionsSchemaPattern,
		createPhase188PermissionsPrerequisites,
	)
}

func validatePhase188PermissionsDatabaseName(name string) error {
	if !phase188PermissionsDatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase188PermissionsDatabasePattern)
	}
	return nil
}

func validatePhase188PermissionsSchemaName(name string) error {
	if !phase188PermissionsSchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase188PermissionsSchemaPattern)
	}
	return nil
}

func createPhase188PermissionsPrerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE anime_contributions (
	id              BIGSERIAL PRIMARY KEY,
	anime_id        BIGINT NOT NULL,
	fansub_group_id BIGINT NOT NULL,
	member_id       BIGINT NULL,
	status          VARCHAR(20) NOT NULL DEFAULT 'draft'
);
CREATE TABLE anime_contribution_roles (
	id                     BIGSERIAL PRIMARY KEY,
	anime_contribution_id  BIGINT NOT NULL,
	role_code              TEXT NOT NULL
);
CREATE TABLE fansub_group_members (
	id              BIGSERIAL PRIMARY KEY,
	fansub_group_id BIGINT NOT NULL,
	app_user_id     BIGINT NOT NULL,
	member_id       BIGINT NULL,
	status          VARCHAR(20) NOT NULL DEFAULT 'active'
);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Plan-188-05 permissions prerequisites: %v", err)
	}
}
