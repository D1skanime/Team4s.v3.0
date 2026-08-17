package repository

// hist_group_member_roles_fansub_group_test.go — Live-DB regression proof (Plan 135-02, D-06)
//
// SKIP not FAIL without TEAM4S_PHASE135_TEST_DSN.
//
// Proves Finding #7 / Pitfall 2 is closed: ListFansubGroupRoleDefinitions's SQL predicate
// used to OR assignable = true with two pre-migration-0112 context checks, reintroducing
// every anime_contribution-context role (including admin/"Administration") into the
// group-role picker. This test applies the real migration chain (0085, 0100, 0103, 0112)
// against an isolated schema and asserts the query returns exactly the six assignable
// group roles and none of the excluded contribution/legacy codes.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestListFansubGroupRoleDefinitionsAssignableOnly(t *testing.T) {
	pool := testsupport.OpenPhase135Postgres(t)

	repo := NewHistGroupMemberRolesRepository(pool)

	options, err := repo.ListFansubGroupRoleDefinitions(context.Background())
	require.NoError(t, err)

	got := make(map[string]bool, len(options))
	for _, opt := range options {
		got[opt.Code] = true
	}

	// Exact assignable=true set per migration 0112.
	expected := []string{"techadmin", "gfxler", "fansub_lead", "co_leader", "founder", "project_lead"}
	require.Len(t, got, len(expected), "unexpected role count: %v", got)
	for _, code := range expected {
		require.True(t, got[code], "expected assignable role %q missing from result: %v", code, got)
	}

	// Finding #7 regression set: none of these may ever appear in the group-role picker.
	// leader/project_manager are deleted by 0112, so their absence also proves the
	// migration chain applied correctly.
	excluded := []string{
		"admin", "translator", "editor", "timer", "typesetter", "encoder",
		"raw_provider", "quality_checker", "designer", "other",
		"leader", "project_manager",
	}
	for _, code := range excluded {
		require.False(t, got[code], "excluded role %q must not appear in group-role picker: %v", code, got)
	}
}
