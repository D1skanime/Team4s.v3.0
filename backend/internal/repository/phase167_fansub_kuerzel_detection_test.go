package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// quick-260924-dso Task 3 (GAP-05): real-Postgres proof that the Kürzel tier is now the
// TOP tier of the batch exact-match query (kuerzel > alias > name > slug), and that all
// four tiers still coexist correctly within a single resolveFansubGroupMatches call.

// TestResolveFansubGroupMatches_KuerzelTierPrecedence proves kuerzel beats name: two
// DIFFERENT groups deliberately share the same text across tiers (groupA's Name vs.
// groupB's Kürzel), and resolving that candidate must return exactly one match for
// groupB with MatchedVia "kuerzel".
func TestResolveFansubGroupMatches_KuerzelTierPrecedence(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	groupAID := insertPhase167Group(t, pool, "group-a", "BDnP")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")
	_, err := pool.Exec(ctx, `UPDATE fansub_groups SET kuerzel = 'BDnP', normalized_kuerzel = 'bdnp' WHERE id = $1`, groupBID)
	require.NoError(t, err)

	matches, err := resolveFansubGroupMatches(ctx, pool, []string{"BDnP"})
	require.NoError(t, err)
	require.Len(t, matches, 1, "candidate must resolve to exactly one match (the kuerzel-tier winner)")

	require.Equal(t, groupBID, matches[0].GroupID, "kuerzel tier must beat the name tier (groupA's Name also equals \"BDnP\")")
	require.NotEqual(t, groupAID, matches[0].GroupID)
	require.Equal(t, "kuerzel", matches[0].MatchedVia)
}

// TestResolveFansubGroupMatches_KuerzelCoexistsWithOtherTiers proves the new top tier did
// not disturb the other three: one group resolvable only via Kürzel, one only via an
// alias, one only via Name, one only via Slug, all resolved in a SINGLE
// resolveFansubGroupMatches call, each reporting its own correct MatchedVia and GroupID.
func TestResolveFansubGroupMatches_KuerzelCoexistsWithOtherTiers(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	kuerzelGroupID := insertPhase167Group(t, pool, "kuerzel-group", "Kuerzel Only Group")
	_, err := pool.Exec(ctx, `UPDATE fansub_groups SET kuerzel = 'KZO', normalized_kuerzel = 'kzo' WHERE id = $1`, kuerzelGroupID)
	require.NoError(t, err)

	aliasGroupID := insertPhase167Group(t, pool, "alias-group", "Alias Only Group")
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias) VALUES ($1, 'AliasHit', 'aliashit')
	`, aliasGroupID)
	require.NoError(t, err)

	nameGroupID := insertPhase167Group(t, pool, "name-group", "NameOnlyGroup")

	slugGroupID := insertPhase167Group(t, pool, "slug-only-group", "Slug Group")

	candidates := []string{"KZO", "AliasHit", "NameOnlyGroup", "slug-only-group"}
	matches, err := resolveFansubGroupMatches(ctx, pool, candidates)
	require.NoError(t, err)
	require.Len(t, matches, 4)

	byRaw := make(map[string]struct {
		groupID    int64
		matchedVia string
	}, len(matches))
	for _, m := range matches {
		byRaw[m.RawCandidate] = struct {
			groupID    int64
			matchedVia string
		}{groupID: m.GroupID, matchedVia: m.MatchedVia}
	}

	require.Equal(t, kuerzelGroupID, byRaw["KZO"].groupID)
	require.Equal(t, "kuerzel", byRaw["KZO"].matchedVia)

	require.Equal(t, aliasGroupID, byRaw["AliasHit"].groupID)
	require.Equal(t, "alias", byRaw["AliasHit"].matchedVia)

	require.Equal(t, nameGroupID, byRaw["NameOnlyGroup"].groupID)
	require.Equal(t, "name", byRaw["NameOnlyGroup"].matchedVia)

	require.Equal(t, slugGroupID, byRaw["slug-only-group"].groupID)
	require.Equal(t, "slug", byRaw["slug-only-group"].matchedVia)
}
