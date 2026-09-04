package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// TestHistGroupMemberRolesUseCatalogContext proves, against real PostgreSQL, that
// HistGroupMemberRolesRepository.RoleCodeExistsForContext is a parameterized
// role_definitions.contexts lookup: a role seeded with the "group_history" context (the
// production seed's "founder") resolves true, a role seeded WITHOUT that context (the
// production seed's "translator", "anime_contribution"-only) resolves false — proving the
// query is genuinely context-scoped rather than a blanket existence check. The static-source
// absence loop (no hardcoded whitelist/authority identifiers may reappear) is a legitimate
// negative-space check per CLAUDE.md's Teststil exception 1 and stays unchanged.
func TestHistGroupMemberRolesUseCatalogContext(t *testing.T) {
	sourceBytes, err := os.ReadFile("hist_group_member_roles_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)

	for _, forbidden := range []string{
		"groupHistoryDialogRoleWhitelist",
		"IsGroupHistoryWhitelistRole",
		"code = ANY($",
	} {
		if strings.Contains(source, forbidden) {
			t.Fatalf("historical role authority must not contain %q", forbidden)
		}
	}

	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()
	repo := NewHistGroupMemberRolesRepository(pool)

	// "founder" is seeded by migration 0085 with contexts = ARRAY['group_history'].
	existsInContext, err := repo.RoleCodeExistsForContext(ctx, "founder", "group_history")
	require.NoError(t, err)
	assert.True(t, existsInContext, "a role seeded with the group_history context must resolve true")

	// "translator" is seeded by migration 0085 with contexts = ARRAY['anime_contribution'] only.
	existsOutsideContext, err := repo.RoleCodeExistsForContext(ctx, "translator", "group_history")
	require.NoError(t, err)
	assert.False(t, existsOutsideContext, "a role seeded without the group_history context must resolve false, proving the lookup is context-parameterized, not a blanket code check")
}

// TestHistGroupMemberRolesKeepNeutralInvalidBehavior proves, via a real Postgres call, that
// RoleCodeExistsForContext resolves neutrally (false, nil — never an error) for a blank role
// code and for an unknown role code, instead of asserting that specific Go source lines exist.
func TestHistGroupMemberRolesKeepNeutralInvalidBehavior(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()
	repo := NewHistGroupMemberRolesRepository(pool)

	blankExists, err := repo.RoleCodeExistsForContext(ctx, "", "group_history")
	require.NoError(t, err)
	assert.False(t, blankExists, "a blank role code must resolve neutrally to false, not error")

	unknownExists, err := repo.RoleCodeExistsForContext(ctx, "totally_invalid_code_xyz", "group_history")
	require.NoError(t, err)
	assert.False(t, unknownExists, "an unknown role code must resolve neutrally to false, not error")
}
