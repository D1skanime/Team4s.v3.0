package handlers

// Phase 187, Plan 04 (D-10): proves that GetEpisodeVersionEditorContext's response carries
// a real, backend-computed selected_group_dependents breakdown for every currently selected
// fansub group, computed from the same guard (repository.GetReleaseVersionGroupDependents,
// Plan 01) the write path uses -- no new SQL, no new guard logic here. Builds additively on
// the shared openEVECFixture (Phase-117 base) since this is the admin editor context path,
// not the Phase-187-dependents-guard-core fixture Plan 01 already covers in
// backend/internal/repository/release_version_group_guard_test.go.

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"
)

const (
	evecDependentsReleaseVersionID  = int64(3201)
	evecDependentsGroupWithoutDeps  = int64(5001)
	evecDependentsGroupWithCredit   = int64(5002)
	evecDependentsMemberID          = int64(5101)
)

// openEVECDependentsFixture extends the shared openEVECFixture (Phase-117 base) with exactly
// the schema migration 0137 (Phase 108 contribution sources) needs: anime_fansub_groups
// (phase117's base fixture does not have this table) plus minimal, trimmed stand-ins for
// point_rules/point_ledger_entries so migration 0137's FK targets resolve -- no real point
// award/reversal rows are ever inserted, since countReleaseVersionGroupDependents counts
// release_role_credit_lifecycles rows regardless of lifecycle_status, so a single 'pending'
// row (no award_entry_id/reversal_entry_id required) is sufficient to prove a dependent.
func openEVECDependentsFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openEVECFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE anime_fansub_groups (
			anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (anime_id, fansub_group_id)
		);
	`)
	require.NoError(t, err)

	// Trimmed stand-ins for migration 0137's point_rules/point_ledger_entries FK targets --
	// NOT the real schema from 0131_member_point_foundation.up.sql (triggers, full column
	// shape); only enough for 0137's CREATE TABLE FK constraints to resolve.
	_, err = pool.Exec(ctx, `
		CREATE TABLE point_rules (
			id BIGSERIAL PRIMARY KEY,
			rule_code TEXT NOT NULL,
			rule_version INTEGER NOT NULL,
			category TEXT NOT NULL,
			point_value INTEGER NOT NULL,
			UNIQUE (rule_code, rule_version)
		);
	`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `CREATE TABLE point_ledger_entries (id BIGSERIAL PRIMARY KEY);`)
	require.NoError(t, err)

	testsupport.ApplySQLFile(t, pool, filepath.Join("..", "..", "..", "database", "migrations", "0137_phase108_contribution_sources.up.sql"))

	// Same trimmed-but-real-column release_version_media stand-in shape as Plan 01's
	// testsupport.OpenPhase187Postgres fixture (backend/internal/testsupport/phase187_postgres.go)
	// -- not needed by this test's assertions directly, kept only so the guard's shared SQL
	// (countReleaseVersionGroupDependents) has every table it SELECTs from.
	_, err = pool.Exec(ctx, `
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL,
			category VARCHAR(30) NOT NULL,
			deleted_at TIMESTAMPTZ NULL
		);
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, evecDependentsMemberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_groups (id, name) VALUES ($1, 'Group-Without-Deps'), ($2, 'Group-With-Credit')
	`, evecDependentsGroupWithoutDeps, evecDependentsGroupWithCredit)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2), ($1, $3)
	`, evecDependentsReleaseVersionID, evecDependentsGroupWithoutDeps, evecDependentsGroupWithCredit)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_role_credit_lifecycles (
			release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
		) VALUES ($1, $2, $3, 'timing', 1, 'pending')
	`, evecDependentsReleaseVersionID, evecDependentsGroupWithCredit, evecDependentsMemberID)
	require.NoError(t, err)

	return pool
}

// TestEpisodeVersionEditorContextDependents proves (D-10): the admin editor-context response
// carries selected_group_dependents for EVERY selected group -- the fixture's original group
// present with all-zero counts (not omitted, proving "checked, removable" vs. "not yet
// checked"), the second seeded group with credits >= 1.
func TestEpisodeVersionEditorContextDependents(t *testing.T) {
	pool := openEVECDependentsFixture(t)

	h := evecFixtureHandler(pool, "", "")
	rec := evecFixtureRequest(h)
	require.Equal(t, 200, rec.Code, rec.Body.String())

	var response struct {
		Data models.EpisodeVersionEditorContext `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))

	dependents := response.Data.SelectedGroupDependents
	require.Len(t, dependents, 2, "every selected group must be present, including zero-dependents ones")

	withoutDeps, ok := dependents[evecDependentsGroupWithoutDeps]
	require.True(t, ok, "a group with zero dependents must still be present, not omitted")
	require.Equal(t, evecDependentsGroupWithoutDeps, withoutDeps.FansubGroupID)
	require.Equal(t, int32(0), withoutDeps.Credits)
	require.Equal(t, int32(0), withoutDeps.Media)
	require.Equal(t, int32(0), withoutDeps.Notes)

	withCredit, ok := dependents[evecDependentsGroupWithCredit]
	require.True(t, ok)
	require.Equal(t, evecDependentsGroupWithCredit, withCredit.FansubGroupID)
	require.GreaterOrEqual(t, withCredit.Credits, int32(1))
}

// TestEpisodeVersionContributorContextOmitsGroupDependents proves the narrow contributor
// context (loadEpisodeVersionContributorContext) is intentionally NOT extended -- contributors
// cannot edit the group field at all, so selected_group_dependents must stay absent for them.
func TestEpisodeVersionContributorContextOmitsGroupDependents(t *testing.T) {
	loadAppAuthCapabilityTestCache(t)
	pool := openEVECDependentsFixture(t)

	h := evecFixtureHandler(pool, "", "")
	h.permissionSvc = permissions.NewService(contributionsPermissionResolverAllowed{})
	rec := evecChapterRequest(h, true, true)
	require.Equal(t, 200, rec.Code, rec.Body.String())

	var wire map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &wire))
	data, ok := wire["data"].(map[string]any)
	require.True(t, ok)
	require.NotContains(t, data, "selected_group_dependents")
}
