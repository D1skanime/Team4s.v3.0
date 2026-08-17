package repository

// hist_group_member_roles_fansub_group_test.go — Live-DB regression proof (Plan 135-02, D-06;
// hotfix 2026-08-17 for the over-narrow assignable-only filter).
//
// SKIP not FAIL without TEAM4S_PHASE135_TEST_DSN.
//
// Finding #7 wanted the pure anime_contribution credit roles (admin/"Administration", other)
// OUT of the group-role picker. Plan 135-02 first over-corrected to WHERE assignable = true,
// which ALSO dropped the legitimate fansub work roles (editor, quality_checker, translator, …)
// that the invite backend (IsKnownFansubGroupRole / fansubGroupRoleCatalog) still accepts —
// leaving the picker unable to offer roles the accept path would happily store.
//
// The corrected predicate selects any role whose contexts include fansub_group OR group_history,
// which restores the work + leadership roles while still excluding admin/other (contexts =
// {anime_contribution} only). This test applies the real migration chain (0085, 0100, 0103, 0112)
// against an isolated schema and asserts exactly that set.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestListFansubGroupRoleDefinitionsGroupContextRoles(t *testing.T) {
	pool := testsupport.OpenPhase135Postgres(t)

	repo := NewHistGroupMemberRolesRepository(pool)

	options, err := repo.ListFansubGroupRoleDefinitions(context.Background())
	require.NoError(t, err)

	got := make(map[string]bool, len(options))
	for _, opt := range options {
		got[opt.Code] = true
	}

	// Six leadership/group roles PLUS the fansub work roles (contexts include fansub_group or
	// group_history). This matches what the invite backend accepts as a known fansub group role.
	expected := []string{
		"fansub_lead", "founder", "co_leader", "techadmin", "gfxler", "project_lead",
		"translator", "editor", "timer", "typesetter", "encoder", "raw_provider",
		"quality_checker", "designer",
	}
	require.Len(t, got, len(expected), "unexpected role count: %v", got)
	for _, code := range expected {
		require.True(t, got[code], "expected group-context role %q missing from result: %v", code, got)
	}

	// Finding #7 regression set: pure anime_contribution credit roles must stay OUT.
	// leader/project_manager are deleted by 0112, so their absence also proves the
	// migration chain applied correctly.
	excluded := []string{"admin", "other", "leader", "project_manager"}
	for _, code := range excluded {
		require.False(t, got[code], "excluded role %q must not appear in group-role picker: %v", code, got)
	}
}
