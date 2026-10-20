package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase189DSNEnv = "TEAM4S_PHASE189_TEST_DSN"

var (
	phase189DatabasePattern = regexp.MustCompile(`^team4s_phase189_test_[a-z0-9]+$`)
	phase189SchemaPattern   = regexp.MustCompile(`^phase189_[a-z0-9_]+$`)
)

// OpenPhase189Postgres opens the dedicated Phase-189 fixture and prepares
// the fansub-group-wide dependents schema (D-12) the new
// countFansubGroupDependents counting function needs for its tests: every
// one of its 19 counted tables, built additively on top of
// OpenPhase187Postgres's base layer (which already provides members,
// app_users, fansub_groups, release_versions, fansub_group_members, anime,
// release_version_groups, anime_fansub_groups, and -- via the REAL
// migration chain createPhase107Prerequisites applies -- the capability
// registry's user_group_capability_overrides/
// user_group_capability_override_history).
func OpenPhase189Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase189DSNEnv,
		phase189DatabasePattern,
		"phase189_",
		phase189SchemaPattern,
		createPhase189Prerequisites,
	)
}

func validatePhase189DatabaseName(name string) error {
	if !phase189DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase189DatabasePattern)
	}
	return nil
}

func validatePhase189SchemaName(name string) error {
	if !phase189SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase189SchemaPattern)
	}
	return nil
}

// createPhase189Prerequisites builds on createPhase187Prerequisites (which
// already brings in anime/release_version_groups/anime_fansub_groups plus
// the Phase-107 base layer's capability-override tables) and adds exactly
// the 13 REMAINING stand-in tables countFansubGroupDependents needs, plus
// fansub_group_aliases (NOT counted -- stand-in exists only so the
// "ignores excluded tables" negative test has somewhere to insert a row)
// and app_user_global_roles (the real migration 0072 shape, needed by
// Plan 189-08 Task 3's DeleteFansub handler test, which must satisfy the
// handler's real, concrete-typed `requireAdmin` -> AuthzRepository.
// AppUserHasGlobalRole admin gate -- not a fake, since FansubHandler's
// authzRepo/fansubRepo fields are concrete repository types, not
// interfaces):
// anime_contributions, hist_fansub_group_members, fansub_group_media,
// fansub_group_notes, anime_fansub_project_notes, fansub_group_history,
// theme_segments (minimal id/fansub_group_id), segment_library_definitions,
// fansub_group_default_crew, fansub_group_invitations,
// member_claim_invitations, release_playback_entitlement_rules,
// review_decisions, review_audit_events, fansub_group_links
// (189-REVIEW.md CR-01).
//
// DELIBERATELY DOES NOT stand in fansub_collaboration_members: live
// verification of this plan (curl against the real team4s_v2 schema) found
// that migration 0102_drop_collaboration_schema.up.sql (Phase 81, D-02)
// already DROPPED that table (and fansub_groups.group_type) long before
// this phase -- RESEARCH.md's dependents table only checked migration
// 0015's CREATE and missed 0102's later DROP. countFansubGroupDependents
// correctly does NOT reference this table; a stand-in for it here would
// misleadingly suggest it still exists.
//
// DELIBERATELY TRIMMED stand-ins, not the full real schema -- only the
// columns the counting SQL and its own CHECK constraints need (mirrors
// phase187_postgres.go's documented convention). The real, complete column
// shapes live in:
//   - database/migrations/0086_anime_contributions.up.sql
//   - database/migrations/0082_historical_fansub_group_members.up.sql
//   - database/migrations/0026_add_media_tables.up.sql (fansub_group_media's
//     real FK column is named `group_id`, NOT `fansub_group_id` -- the
//     counting SQL queries it as such, confirmed against the real
//     migration, not assumed)
//   - database/migrations/0044_add_db_schema_v2_target_tables.up.sql
//     (fansub_group_links: 189-REVIEW.md CR-01. Real FK column is also
//     named `group_id`, NOT `fansub_group_id`, same as fansub_group_media
//     above -- confirmed against the real migration, not assumed)
//   - database/migrations/0061_fansub_group_notes.up.sql
//   - database/migrations/0063_anime_fansub_project_notes.up.sql
//   - database/migrations/0084_fansub_group_history.up.sql
//   - database/migrations/0049_extend_theme_segments.up.sql (adds the
//     nullable fansub_group_id column to the base theme_segments table)
//   - database/migrations/0053_segment_library_identity.up.sql
//   - database/migrations/0107_fansub_group_default_crew.up.sql
//   - database/migrations/0076_fansub_group_invitations.up.sql
//   - database/migrations/0092_member_claim_invitations.up.sql
//   - database/migrations/0129_release_playback_entitlements.up.sql
//   - database/migrations/0134_review_foundation.up.sql (review_decisions/
//     review_audit_events: both have fansub_group_id REFERENCES
//     fansub_groups(id) with NO ON DELETE clause at all -- Postgres default
//     NO ACTION -- confirmed by reading the real migration, not assumed;
//     this trimmed stand-in reproduces that exact FK shape so a future
//     reader does not mistake the real table as CASCADE)
//
// A future reader extending this fixture should not mistake this trimmed
// shape for the full production schema.
func createPhase189Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	createPhase187Prerequisites(t, pool)

	const standInSQL = `
CREATE TABLE app_user_global_roles (
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    PRIMARY KEY (app_user_id, role),
    CONSTRAINT chk_app_user_global_roles_role CHECK (role IN ('platform_admin', 'content_admin', 'user'))
);
CREATE TABLE fansub_group_aliases (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    alias VARCHAR(120) NOT NULL
);
CREATE TABLE anime_contributions (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE RESTRICT
);
CREATE TABLE hist_fansub_group_members (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT
);
CREATE TABLE fansub_group_media (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE fansub_group_notes (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE anime_fansub_project_notes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE fansub_group_history (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE theme_segments (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE segment_library_definitions (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE fansub_group_default_crew (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE
);
CREATE TABLE fansub_group_invitations (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    CONSTRAINT chk_fansub_group_invitations_status
        CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired'))
);
CREATE TABLE member_claim_invitations (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    CONSTRAINT chk_member_claim_invitations_status
        CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired'))
);
CREATE TABLE release_playback_entitlement_rules (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE review_decisions (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id)
);
CREATE TABLE review_audit_events (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id)
);
CREATE TABLE fansub_group_links (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);`
	if err := validatePhase106SQL(standInSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), standInSQL); err != nil {
		t.Fatalf("create Phase-189 fansub group dependents stand-ins: %v", err)
	}
}
