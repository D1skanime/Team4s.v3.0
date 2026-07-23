package repository

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"
)

// readAuthzPermissionsSource lädt die Quelldatei authz_permissions.go
// relativ zur aktuellen Test-Datei (Source-Inspection-Muster, konsistent mit
// anderen Repository-Tests wie admin_content_fansub_releases_test.go).
func readAuthzPermissionsSource(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path failed")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "authz_permissions.go"))
	if err != nil {
		t.Fatalf("read authz_permissions.go: %v", err)
	}
	return string(content)
}

// TestListActorContributionRolesForVersion ist ein Wave-0-Test (Plan 83-01) für D-02.
//
// Die Methode ListActorContributionRolesForVersion wird in Plan 83-02 an
// AuthzRepository ergänzt. Dieser Test definiert das gewünschte Verhalten,
// bevor der Produktionscode existiert (ROT-Zustand bis Plan 83-02).
//
// Auflösungslogik (D-02):
//   - Schritt 1 (versions-spezifisch): role_codes aus anime_contributions mit
//     release_version_id = versionID (Override-Satz für diese Release-Version).
//   - Schritt 2 (Fallback anime-weit): role_codes aus anime_contributions mit
//     release_version_id IS NULL, wenn Schritt 1 kein Ergebnis liefert.
//
// Gibt leere Liste zurück wenn keine Contribution existiert (→ D-04: kein Recht).
func TestListActorContributionRolesForVersion(t *testing.T) {
	src := readAuthzPermissionsSource(t)

	// Schritt 1: versions-spezifische Contributions
	// Erwartet: role_codes aus anime_contributions wo release_version_id = versionID.
	t.Run("versions-spezifisch", func(t *testing.T) {
		if !strings.Contains(src, "ListActorContributionRolesForVersion") {
			t.Fatal("Wave-0 RED: ListActorContributionRolesForVersion ist noch nicht in authz_permissions.go definiert (wird in Plan 83-02 ergänzt)")
		}
		// Nach Plan 83-02: Methode existiert → Schritt 1 Query prüfen.
		// Erwartet: SELECT mit release_version_id = $versionID (kein IS NULL).
		if !strings.Contains(src, "release_version_id") {
			t.Error("erwartet: Query enthält release_version_id-Filter (versions-spezifischer Satz)")
		}
	})

	// Schritt 2 (Fallback anime-weit): role_codes wenn kein versions-spezifischer Satz.
	t.Run("fallback-anime-weit", func(t *testing.T) {
		if !strings.Contains(src, "ListActorContributionRolesForVersion") {
			t.Fatal("Wave-0 RED: ListActorContributionRolesForVersion ist noch nicht in authz_permissions.go definiert (wird in Plan 83-02 ergänzt)")
		}
		// Nach Plan 83-02: Methode existiert → Fallback-Logik prüfen.
		// Erwartet: Fallback-Query mit release_version_id IS NULL wenn Schritt 1 leer.
		if !strings.Contains(src, "IS NULL") {
			t.Error("erwartet: Fallback-Query enthält release_version_id IS NULL (anime-weiter Satz)")
		}
	})
}

func TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase(t *testing.T) {
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (101), (102);
		INSERT INTO app_users(id, status) VALUES (11, 'active'), (12, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES
			(31, 21, 11, 101, 'active'),
			(32, 21, 12, 102, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES
			(41, 101, 11, 'verified', NOW()),
			(42, 102, 12, 'verified', NOW());
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role)
		VALUES (31, 'fansub_lead');
		INSERT INTO fansub_group_member_review_capabilities(fansub_group_member_id, action_code)
		VALUES (32, 'review.text.decide');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)
	capabilities, err := repo.LoadRoleCapabilities(context.Background())
	require.NoError(t, err)
	assert.ElementsMatch(t, []permissions.Action{
		permissions.ActionReviewTextDecide,
		permissions.ActionReviewImageDecide,
		permissions.ActionReviewContributionDecide,
	}, capabilities[permissions.RoleFansubLead])
	assert.NotContains(t, capabilities, permissions.RolePlatformAdmin)

	service := permissions.NewService(repo)
	lead, err := service.CanReviewForFansubGroup(
		context.Background(),
		permissions.Actor{AppUserID: 11, Status: "active"},
		permissions.ActionReviewImageDecide,
		21,
	)
	require.NoError(t, err)
	assert.True(t, lead.Allowed)
	assert.EqualValues(t, 31, lead.MembershipID)
	assert.EqualValues(t, 101, lead.MemberID)

	direct, err := service.CanReviewForFansubGroup(
		context.Background(),
		permissions.Actor{AppUserID: 12, Status: "active"},
		permissions.ActionReviewTextDecide,
		21,
	)
	require.NoError(t, err)
	assert.True(t, direct.Allowed)
	assert.EqualValues(t, 32, direct.MembershipID)
	assert.EqualValues(t, 102, direct.MemberID)

	notGranted, err := service.CanReviewForFansubGroup(
		context.Background(),
		permissions.Actor{AppUserID: 12, Status: "active"},
		permissions.ActionReviewImageDecide,
		21,
	)
	require.NoError(t, err)
	assert.False(t, notGranted.Allowed)
}

func TestPhase107AuthzRepositoryVerifiedActorMemberIdentityWithoutMembership(t *testing.T) {
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (201), (202);
		INSERT INTO app_users(id, status) VALUES (51, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES
			(61, 202, 51, 'verified', NOW()),
			(62, 201, 51, 'verified', NOW());
	`)
	require.NoError(t, err)

	memberIDs, err := NewAuthzRepository(pool).ResolveVerifiedActorMemberIDs(context.Background(), 51)

	require.NoError(t, err)
	assert.Equal(t, []int64{201, 202}, memberIDs)
}

func TestPhase107AuthzRepositoryVerifiedActorMemberIdentityForPlatformAdmin(t *testing.T) {
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (301);
		INSERT INTO app_users(id, status) VALUES (71, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (81, 301, 71, 'verified', NOW());
	`)
	require.NoError(t, err)

	memberIDs, err := NewAuthzRepository(pool).ResolveVerifiedActorMemberIDs(context.Background(), 71)

	require.NoError(t, err)
	assert.Equal(t, []int64{301}, memberIDs)
	var membershipCount int
	require.NoError(t, pool.QueryRow(
		context.Background(),
		`SELECT COUNT(*) FROM fansub_group_members WHERE app_user_id = 71`,
	).Scan(&membershipCount))
	assert.Zero(t, membershipCount, "platform-admin identity lookup must not require membership")
}

func TestPhase107AuthzRepositoryDirectGrantScope(t *testing.T) {
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (401), (402), (403), (404), (405);
		INSERT INTO app_users(id, status) VALUES
			(91, 'active'),
			(92, 'pending'),
			(93, 'disabled'),
			(94, 'active'),
			(95, 'active');
		INSERT INTO fansub_groups(id) VALUES (501), (502);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES
			(601, 501, 91, 401, 'active'),
			(602, 501, 92, 402, 'active'),
			(603, 501, 93, 403, 'active'),
			(604, 501, 94, 404, 'disabled'),
			(605, 501, 95, 405, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES
			(701, 401, 91, 'verified', NOW()),
			(702, 402, 92, 'verified', NOW()),
			(703, 403, 93, 'verified', NOW()),
			(704, 404, 94, 'verified', NOW()),
			(705, 401, 95, 'verified', NOW());
		INSERT INTO fansub_group_member_review_capabilities(fansub_group_member_id, action_code)
		VALUES
			(601, 'review.text.decide'),
			(602, 'review.text.decide'),
			(603, 'review.text.decide'),
			(604, 'review.text.decide'),
			(605, 'review.text.decide');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)
	granted, err := repo.ResolveActorReviewGrantContext(context.Background(), 91, 501)
	require.NoError(t, err)
	require.NotNil(t, granted)
	assert.EqualValues(t, 601, granted.MembershipID)
	assert.EqualValues(t, 401, granted.MemberID)
	assert.Equal(t, []permissions.Action{permissions.ActionReviewTextDecide}, granted.GrantedActions)

	crossGroup, err := repo.ResolveActorReviewGrantContext(context.Background(), 91, 502)
	require.NoError(t, err)
	assert.Nil(t, crossGroup)

	for _, appUserID := range []int64{92, 93, 94, 95} {
		scoped, err := repo.ResolveActorReviewGrantContext(context.Background(), appUserID, 501)
		require.NoError(t, err)
		assert.Nil(t, scoped, "app user %d must fail closed", appUserID)
	}
}

func TestPhase107AuthzRepositoryPermissionReadsCreateNoAudit(t *testing.T) {
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (801);
		INSERT INTO app_users(id, status) VALUES (811, 'active');
		INSERT INTO fansub_groups(id) VALUES (821);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES (831, 821, 811, 801, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (841, 801, 811, 'verified', NOW());
		INSERT INTO fansub_group_member_review_capabilities(fansub_group_member_id, action_code)
		VALUES (831, 'review.text.decide');
	`)
	require.NoError(t, err)

	var before int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM review_audit_events`).Scan(&before))

	repo := NewAuthzRepository(pool)
	_, err = repo.LoadRoleCapabilities(context.Background())
	require.NoError(t, err)
	_, err = repo.ResolveActorReviewGrantContext(context.Background(), 811, 821)
	require.NoError(t, err)
	_, err = repo.ResolveVerifiedActorMemberIDs(context.Background(), 811)
	require.NoError(t, err)
	_, err = permissions.NewService(repo).CanReviewForFansubGroup(
		context.Background(),
		permissions.Actor{AppUserID: 811, Status: "active"},
		permissions.ActionReviewTextDecide,
		821,
	)
	require.NoError(t, err)

	var after int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM review_audit_events`).Scan(&after))
	assert.Equal(t, before, after)
}

func openPhase107AuthzRepositoryPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve authz repository test path")
	}
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0134_review_foundation.up.sql"),
	)
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role VARCHAR(40) NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		)
	`)
	require.NoError(t, err)
	return pool
}
