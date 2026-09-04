package repository_test

import (
	"context"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

func TestResolvePendingRolesToActive_ExistsOnRepository(t *testing.T) {
	repoType := reflect.TypeOf((*repository.MemberClaimsRepository)(nil))
	method, ok := repoType.MethodByName("ResolvePendingRolesToActive")
	if !ok {
		t.Fatal("MemberClaimsRepository.ResolvePendingRolesToActive(ctx, memberID, fansubGroupID, actorID int64) error fehlt - D-05 nicht implementiert")
	}
	if method.Type.NumIn() != 5 || method.Type.NumOut() != 1 {
		t.Fatalf("ResolvePendingRolesToActive hat Signatur %s, erwartet receiver + ctx + memberID + fansubGroupID + actorID -> error", method.Type)
	}
	if method.Type.Out(0).String() != "error" {
		t.Fatalf("ResolvePendingRolesToActive muss error zurueckgeben, gefunden %s", method.Type.Out(0))
	}
}

// TestResolvePendingRolesToActiveUsesCanonicalCatalog proves, against real PostgreSQL, that
// ResolvePendingRolesToActive's role_definitions JOIN genuinely filters pending historical
// roles by the assignable + fansub_group-context catalog guard: a pending role seeded with
// role_code "techadmin" (assignable=true, contexts contains 'fansub_group' per migration 0112)
// activates, while a pending role seeded with role_code "translator" (assignable=false,
// contexts=['anime_contribution'] only, per migration 0085) does NOT activate — proving the
// guard is a real, executed SQL predicate rather than a source-substring claim. The sanctioned
// static-authority absence check stays unchanged.
func TestResolvePendingRolesToActiveUsesCanonicalCatalog(t *testing.T) {
	// Sanctioned negative-space check (CLAUDE.md Teststil exception 1): the production file
	// must never reintroduce a static role-authority list as a stand-in for the real catalog
	// guard proven below via actual Postgres calls.
	sourceBytes, err := os.ReadFile("member_claims_role_activation_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)
	if strings.Contains(source, "IsGroupHistoryWhitelistRole") || strings.Contains(source, "IsKnownFansubGroupRole") {
		t.Fatal("claim role activation must not use static role authorities")
	}

	pool := testsupport.OpenPhase137Postgres(t)
	ctx := context.Background()

	// hist_group_member_roles is created by the shared Phase-137 fixture as a minimal
	// (role_code TEXT) stand-in; ResolvePendingRolesToActive's real production query also
	// needs hist_fansub_group_member_id + ended_date, mirrored from
	// TestCollectActivatableHistoricalRolesIncludesFansubLead's precedent in the internal
	// repository package test suite.
	_, err = pool.Exec(ctx, `
		ALTER TABLE hist_group_member_roles
			ADD COLUMN hist_fansub_group_member_id BIGINT REFERENCES hist_fansub_group_members(id),
			ADD COLUMN ended_date DATE NULL
	`)
	require.NoError(t, err)

	const (
		memberID       int64 = 501
		claimedUserID  int64 = 601
		actorUserID    int64 = 602
		fansubGroupID  int64 = 701
		eligibleRole         = "techadmin"  // assignable=true, contexts contains 'fansub_group' (migration 0112)
		ineligibleRole       = "translator" // assignable=false (default), contexts=['anime_contribution'] only (migration 0085)
	)

	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES ($1, 'active'), ($2, 'active')`, claimedUserID, actorUserID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)

	const fansubGroupMemberID int64 = 801
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, status)
		VALUES ($1, $2, $3, 'active')
	`, fansubGroupMemberID, fansubGroupID, claimedUserID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO member_claims (member_id, app_user_id, claim_status, verified_at)
		VALUES ($1, $2, 'verified', NOW())
	`, memberID, claimedUserID)
	require.NoError(t, err)

	var histFansubGroupMemberID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO hist_fansub_group_members (fansub_group_id, member_id)
		VALUES ($1, $2)
		RETURNING id
	`, fansubGroupID, memberID).Scan(&histFansubGroupMemberID))

	_, err = pool.Exec(ctx, `
		INSERT INTO hist_group_member_roles (hist_fansub_group_member_id, role_code, ended_date)
		VALUES ($1, $2, NULL), ($1, $3, NULL)
	`, histFansubGroupMemberID, eligibleRole, ineligibleRole)
	require.NoError(t, err)

	repo := repository.NewMemberClaimsRepository(pool)
	require.NoError(t, repo.ResolvePendingRolesToActive(ctx, memberID, fansubGroupID, actorUserID))

	rows, err := pool.Query(ctx, `
		SELECT role FROM fansub_group_member_roles WHERE fansub_group_member_id = $1 ORDER BY role
	`, fansubGroupMemberID)
	require.NoError(t, err)
	defer rows.Close()
	var activatedRoles []string
	for rows.Next() {
		var role string
		require.NoError(t, rows.Scan(&role))
		activatedRoles = append(activatedRoles, role)
	}
	require.NoError(t, rows.Err())

	assert.Equal(t, []string{eligibleRole}, activatedRoles, "only the assignable, fansub_group-context role must activate — the non-assignable, non-fansub_group-context role must be filtered out by the real JOIN/assignable/context predicate")
}

func TestVerifyClaimActivatesRoles_FansubLeadExcluded(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: fansub_lead darf nicht automatisch aktiv werden")
}

func TestVerifyClaimActivatesRoles_FounderExcluded(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: founder darf nicht automatisch aktiv werden")
}

func TestVerifyClaimActivatesRoles_NilEnddateRoleActivated(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: Rolle ohne Enddatum wird aktiv uebernommen")
}
