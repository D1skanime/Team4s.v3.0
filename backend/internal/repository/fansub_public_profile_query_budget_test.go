package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Plan 152-08 (Requirement P152-09; CONTEXT audit finding "kein Query-Budget-Test
// für die Fansub-Public-Seite, obwohl Harness existiert"): the constant-query-
// budget regression gate (B4) proving Plan 152-03's public group load-path
// reduction (12 -> 7-or-measured static queries) and domain-projection
// contributors removal (3 -> 2) are both real and constant -- no N+1 growth with
// project/member/history/media/contributor volume.
//
// Reuses the phase152DSNEnv/phase152DatabasePattern/openPhase152Postgres/
// mustExecPhase152 scaffold already declared in
// fansub_public_profile_load_path_test.go (same package, Plan 152-03's output),
// following the Phase-131 member_profile_query_budget_test.go constant-budget-gate
// template.

// seedPhase152PublicProfileQueryBudgetGroup seeds one fansub_groups row plus
// projectCount projects (anime + anime_fansub_groups), historyCount confirmed
// history entries, mediaCount public/approved gallery media items, and
// memberCount active fansub_group_members rows. Every id is namespaced by
// groupID to keep seeds collision-free across groups within a single test run.
func seedPhase152PublicProfileQueryBudgetGroup(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string, rowCount int, memberCount int) {
	t.Helper()

	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase152 Budget Group %d', 'active');
	`, groupID, slug, groupID))

	// The team4s_phase152_test database carries the FULL real schema
	// (pg_dump --schema-only) but NO seed/lookup data, so visibilities and
	// review_statuses -- INNER-JOINed by listPublicFansubMedia -- start empty.
	// Seed the exact 'public'/'approved' rows idempotently (ON CONFLICT DO
	// NOTHING) so media_assets rows below are visible to the public query.
	mustExecPhase152(t, pool, `
		INSERT INTO visibilities (id, name) VALUES (1, 'public') ON CONFLICT (id) DO NOTHING;
		INSERT INTO review_statuses (id, code, label_de) VALUES (2, 'approved', 'Phase152 Approved') ON CONFLICT (id) DO NOTHING;
	`)

	for i := 0; i < rowCount; i++ {
		animeID := groupID*1000 + int64(i)
		mediaAssetID := groupID*1000 + 2000 + int64(i)
		mustExecPhase152(t, pool, fmt.Sprintf(`
			INSERT INTO anime (id, title, status) VALUES (%d, 'Phase152 Budget Anime %d', 'ongoing');
			INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (%d, %d);

			INSERT INTO fansub_group_history (fansub_group_id, year, event_type, title, status)
				VALUES (%d, %d, 'milestone', 'Phase152 Budget Milestone %d', 'confirmed');

			INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
				VALUES (%d, '/phase152/budget-%d.jpg', 'image/jpeg', 'ready', 1, 2);
			INSERT INTO fansub_group_media (group_id, media_id, category)
				VALUES (%d, %d, 'gallery');
		`, animeID, animeID, animeID, groupID, groupID, 2020+i, animeID, mediaAssetID, animeID, groupID, mediaAssetID))
	}

	for i := 0; i < memberCount; i++ {
		appUserID := groupID*1000 + 3000 + int64(i)
		mustExecPhase152(t, pool, fmt.Sprintf(`
			INSERT INTO app_users (id, keycloak_subject, email, display_name, status)
				VALUES (%d, 'phase152-budget-subject-%d', 'phase152-budget-%d@example.invalid', 'Phase152 Budget User %d', 'active');
			INSERT INTO fansub_group_members (fansub_group_id, app_user_id, status)
				VALUES (%d, %d, 'active');
		`, appUserID, appUserID, appUserID, appUserID, groupID, appUserID))
	}
}

// phase152PublicProfileConstantQueryBudget is the enforced constant number of SQL
// queries a single GetPublicProfileBySlug load issues, INDEPENDENT of how many
// projects/history entries/media items/active members the group has. Plan 152-03
// reduced the pre-152 baseline of 12 down to this reduced set:
// getPublicGroupBase (1) + attachPublicReleaseVersionsCount (1) +
// listPublicFansubStories/listPublicFansubProjects/listPublicFansubHistory/
// listPublicFansubMedia (4) + ListGroupLinks (2 -- fansubGroupExists 1 +
// the fansub_group_links SELECT 1). That is 8, not the plan's originally-estimated
// 7: ListGroupLinks issues its own fansubGroupExists existence-check query before
// the links SELECT, a round-trip the 152-03 plan's "7" estimate did not account
// for. This constant reflects the ACTUALLY MEASURED value per this plan's own
// instruction to use the measured count over a wrong estimate.
// Update this constant ONLY for an intentional, documented loader change.
const phase152PublicProfileConstantQueryBudget = 8

// TestFansubPublicProfileQueryBudgetIsConstant is the constant-query-budget gate
// (Requirement P152-09): a public group profile load must issue the SAME number
// of SQL queries regardless of how many projects/history entries/media items/
// active members the group has. Plan 152-03's public-specific load path
// (getPublicGroupBase + attachPublicReleaseVersionsCount, replacing the shared
// GetGroupBySlug/hydrateFansubGroup path) issues no per-row round-trips, so the
// count must not grow with row volume.
func TestFansubPublicProfileQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase152Postgres(t)
	repo := NewFansubRepository(pool)

	const smallGroupID int64 = 1520100
	const largeGroupID int64 = 1520200
	const smallRowCount = 1
	const largeRowCount = 6
	const smallMemberCount = 2
	const largeMemberCount = 6
	smallSlug := "phase152-budget-small"
	largeSlug := "phase152-budget-large"

	seedPhase152PublicProfileQueryBudgetGroup(t, pool, smallGroupID, smallSlug, smallRowCount, smallMemberCount)
	seedPhase152PublicProfileQueryBudgetGroup(t, pool, largeGroupID, largeSlug, largeRowCount, largeMemberCount)

	counter.reset()
	smallProfile, err := repo.GetPublicProfileBySlug(context.Background(), smallSlug)
	require.NoError(t, err)
	smallCount := counter.count()
	require.Lenf(t, smallProfile.Projects, smallRowCount, "small seed must list exactly its seeded projects")
	require.Lenf(t, smallProfile.History, smallRowCount, "small seed must list exactly its seeded history entries")
	require.Lenf(t, smallProfile.Media, smallRowCount, "small seed must list exactly its seeded media items")

	counter.reset()
	largeProfile, err := repo.GetPublicProfileBySlug(context.Background(), largeSlug)
	require.NoError(t, err)
	largeCount := counter.count()
	require.Lenf(t, largeProfile.Projects, largeRowCount, "large seed must list exactly its seeded projects")
	require.Lenf(t, largeProfile.History, largeRowCount, "large seed must list exactly its seeded history entries")
	require.Lenf(t, largeProfile.Media, largeRowCount, "large seed must list exactly its seeded media items")

	t.Logf("P152-09 constant-budget gate: %d rows -> %d queries; %d rows -> %d queries (must be equal and constant, reflecting Plan 152-03's B1/B2 reduction).",
		smallRowCount, smallCount, largeRowCount, largeCount)

	// The budget is CONSTANT -- identical regardless of project/history/media/
	// member volume (no N+1 round-trips remain on the public load path).
	require.Equalf(t, smallCount, largeCount,
		"constant query budget violated: %d-row load issued %d queries but %d-row load issued %d (no N+1 may exist on the public load path)",
		smallRowCount, smallCount, largeRowCount, largeCount)
	// And it is exactly the enforced, documented constant (hard ceiling, not just
	// non-growing), lower than the pre-152 baseline of 12.
	require.Equalf(t, phase152PublicProfileConstantQueryBudget, largeCount,
		"public group profile query budget drifted from the enforced constant %d; got %d (update phase152PublicProfileConstantQueryBudget only with an intentional, documented loader change)",
		phase152PublicProfileConstantQueryBudget, largeCount)
}
