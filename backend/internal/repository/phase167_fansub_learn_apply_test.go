package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// Plan 167-06 (D-01/D-02/D-03/D-10): real-Postgres proof, not fakes-only, that (1)
// resolveImportFansubSelection's removed filename fallback never re-creates a
// fansub_groups row for an unresolved mapping row, (2) maybeLearnFansubGroupAlias
// races-safely learns exactly one new alias for an explicitly-selected existing group,
// idempotently, and (3) it never silently reassigns an alias that already belongs to a
// DIFFERENT group. All three tests run against the isolated Phase-167 fixture
// (testsupport.OpenPhase167Postgres), reusing the real UNIQUE(normalized_alias)
// constraint the write path depends on.

// TestApplyDoesNotAutoCreateFansubGroup proves D-03/REQ-167-10: a mapping row with no
// explicit FansubGroups/FansubGroupID/FansubGroupName selection at all resolves to an
// empty member-group list and never inserts a new fansub_groups row, even though the
// media candidate carries filename evidence a pre-167-06 build would have derived a
// group name from.
func TestApplyDoesNotAutoCreateFansubGroup(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	// Seed one pre-existing group so a regression that DID auto-create would be
	// unambiguous (COUNT would move from 1 to 2, not 0 to 1).
	_ = insertPhase167Group(t, pool, "existing-group", "Existing Group")

	var before int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM fansub_groups`).Scan(&before))

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	mapping := models.EpisodeImportMappingRow{
		// Deliberately no FansubGroups, no FansubGroupID, no FansubGroupName.
	}
	// A real filename that a pre-167-06 build's fallback would have derived
	// "BDnP" from and silently upserted as a brand-new fansub_groups row.
	media := models.EpisodeImportMediaCandidate{FileName: "[BDnP] NIGHT HEAD 2041 - 01 [1080p].mkv"}

	memberGroups, err := resolveImportFansubSelection(ctx, tx, mapping, media)
	require.NoError(t, err)
	require.Empty(t, memberGroups, "an unresolved row must resolve to zero member groups, never a derived-from-filename group")

	require.NoError(t, tx.Commit(ctx))

	var after int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM fansub_groups`).Scan(&after))
	require.Equal(t, before, after, "applying an import with an unresolved fansub-group row must never create a new fansub_groups row")
}

// TestApplyLearnsNewAliasForExplicitGroup proves D-01: when the admin's mapping carries
// an EXPLICIT existing-group selection (mapping.FansubGroups[i].ID set) and the row's
// own filename-derived kürzel is genuinely new and unclaimed anywhere, it is learned as
// an additional alias of that group -- and a second identical call is a idempotent no-op
// (no duplicate row, no error surfaced to the caller), proving the
// ON CONFLICT (normalized_alias) DO NOTHING RETURNING id race-safety path actually works
// against the real UNIQUE(normalized_alias) constraint.
func TestApplyLearnsNewAliasForExplicitGroup(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	groupID := insertPhase167Group(t, pool, "bloody-shadow", "Bloody-Shadow")

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	alias, err := maybeLearnFansubGroupAlias(ctx, tx, groupID, "BDnP")
	require.NoError(t, err)
	require.NotNil(t, alias, "a genuinely new, unclaimed kürzel for an explicitly-selected existing group must be learned")
	require.Equal(t, groupID, alias.FansubGroupID)
	require.Equal(t, "BDnP", alias.Alias)

	var count int
	var normalizedAlias string
	var persistedGroupID int64
	require.NoError(t, tx.QueryRow(ctx, `
		SELECT COUNT(*), MIN(normalized_alias), MIN(fansub_group_id) FROM fansub_group_aliases WHERE fansub_group_id = $1
	`, groupID).Scan(&count, &normalizedAlias, &persistedGroupID))
	require.Equal(t, 1, count, "exactly one alias row must exist after the first learn attempt")
	require.Equal(t, "bdnp", normalizedAlias)
	require.Equal(t, groupID, persistedGroupID)

	// Second call with the SAME candidate and group -- must stay idempotent (still
	// exactly one row, no duplicate-insert error surfaced to the caller).
	aliasAgain, err := maybeLearnFansubGroupAlias(ctx, tx, groupID, "BDnP")
	require.NoError(t, err)
	require.Nil(t, aliasAgain, "an already-known kürzel for this same group must not be reported as newly learned again")

	var countAfterSecondCall int
	require.NoError(t, tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_group_aliases WHERE fansub_group_id = $1
	`, groupID).Scan(&countAfterSecondCall))
	require.Equal(t, 1, countAfterSecondCall, "a second identical learn attempt must be idempotent -- still exactly one row")

	require.NoError(t, tx.Commit(ctx))
}

// TestApplyDoesNotReassignConflictingAlias proves D-02: if the row's filename-derived
// kürzel already belongs to a DIFFERENT fansub group, attempting to learn it for the
// admin's currently-selected group must never silently reassign or duplicate the alias
// -- no new row is inserted, and the existing alias's fansub_group_id still points to
// the ORIGINAL group afterward. Proven against the real UNIQUE(normalized_alias)
// constraint, not just a mocked check.
func TestApplyDoesNotReassignConflictingAlias(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias) VALUES ($1, 'BDnP', 'bdnp')
	`, groupAID)
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	// Same alias text, but the admin's mapping is now explicitly pointed at group B.
	alias, err := maybeLearnFansubGroupAlias(ctx, tx, groupBID, "BDnP")
	require.NoError(t, err)
	require.Nil(t, alias, "a kürzel already claimed by a DIFFERENT group must never be silently learned/reassigned")

	var totalAliasCount int
	require.NoError(t, tx.QueryRow(ctx, `SELECT COUNT(*) FROM fansub_group_aliases WHERE normalized_alias = 'bdnp'`).Scan(&totalAliasCount))
	require.Equal(t, 1, totalAliasCount, "no second alias row for the same normalized_alias must be inserted")

	var ownerGroupID int64
	require.NoError(t, tx.QueryRow(ctx, `SELECT fansub_group_id FROM fansub_group_aliases WHERE normalized_alias = 'bdnp'`).Scan(&ownerGroupID))
	require.Equal(t, groupAID, ownerGroupID, "the existing alias must still point to its ORIGINAL group -- no silent reassignment to group B")

	require.NoError(t, tx.Commit(ctx))
}
