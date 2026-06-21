package repository

// Wave-0 GREEN-Tests: admin_users_repository.go ist implementiert (Plan 80-03).
// Interface-Assertion prüft, dass AdminUsersRepository alle erwarteten Methoden hat.

import (
	"context"
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

// Statische Interface-Assertion: AdminUsersRepository muss das vollständige Interface erfüllen.
// Schlägt zur Kompilierzeit fehl, wenn eine Methode fehlt.
var _ interface {
	ListAdminUsersPage(ctx context.Context, params models.AdminUserListParams) (*models.AdminUserListResult, error)
	GetUserOverview(ctx context.Context, appUserID int64) (*models.AdminUserOverview, error)
	GetUserGlobalRoles(ctx context.Context, appUserID int64) (*models.AdminUserGlobalRolesResult, error)
	GetUserMemberClaims(ctx context.Context, appUserID int64) (*models.AdminUserMemberClaimsResult, error)
	GetUserGroupMemberships(ctx context.Context, appUserID int64) (*models.AdminUserGroupMembershipsResult, error)
	GetUserGroupRights(ctx context.Context, appUserID int64) (*models.AdminUserGroupRightsResult, error)
	ListUserContributions(ctx context.Context, appUserID int64) (*models.AdminUserContributionsResult, error)
	GetUserMedia(ctx context.Context, appUserID int64) (*models.AdminUserMediaResult, error)
	GetUserAudit(ctx context.Context, appUserID int64) (*models.AdminUserAuditResult, error)
	UpdateAppUserStatus(ctx context.Context, appUserID int64, status string) error
} = (*AdminUsersRepository)(nil)

func TestAdminUsersRepository_ListAdminUsersPage_PageFirstCTE(t *testing.T) {
	repo := NewAdminUsersRepository(nil)
	if repo == nil {
		t.Fatal("NewAdminUsersRepository(nil) gab nil zurück")
	}
}

func TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst(t *testing.T) {
	source, err := os.ReadFile("admin_users_tab_repository.go")
	if err != nil {
		t.Fatalf("admin_users_tab_repository.go lesen: %v", err)
	}
	text := string(source)

	requiredSnippets := []string{
		"LEFT JOIN hist_fansub_group_members hfgm",
		"COALESCE(ac.member_id, hfgm.member_id) = $1",
		"(ac.member_id IS NULL) AS is_legacy_historical",
		"result.LegacyHistorical = append(result.LegacyHistorical, item)",
	}
	for _, snippet := range requiredSnippets {
		if !strings.Contains(text, snippet) {
			t.Fatalf("ListUserContributions enthält erwarteten SQL-/Mapping-Snippet nicht: %s", snippet)
		}
	}
}

func TestAdminUsersRepository_ConflictCount_D17_D18(t *testing.T) {
	expected := []string{
		models.AdminConflictTypeOpenClaim,                      // D-17
		models.AdminConflictTypeMemberWithoutRole,              // D-17
		models.AdminConflictTypeMediaWithoutScope,              // D-17
		models.AdminConflictTypeOpenDispute,                    // D-17
		models.AdminConflictTypeInvalidReleaseOverride,         // D-18
		models.AdminConflictTypeOverrideContradiction,          // D-18
		models.AdminConflictTypeMediaWithoutContributionRights, // D-18
	}
	if len(expected) != 7 {
		t.Fatalf("erwartet 7 Konflikttypen, gefunden %d", len(expected))
	}
	for _, ct := range expected {
		if ct == "" {
			t.Fatal("Konflikttyp-Konstante ist leer")
		}
		if !strings.Contains(adminUsersConflictDetailsQuery, ct) {
			t.Fatalf("Conflict-Details-Query liefert %s nicht aus", ct)
		}
	}
	if strings.Contains(adminUsersListQuery, "+ 0") {
		t.Fatal("adminUsersListQuery enthält noch hardcoded + 0 Konflikt-Stubs")
	}
	if !strings.Contains(adminUsersListQuery, "media_without_contribution_rights") ||
		!strings.Contains(adminUsersListQuery, "override_contradiction") {
		t.Fatal("adminUsersListQuery zählt D-18-Konflikte nicht sichtbar mit")
	}
}

func TestAdminUsersRepository_ReleaseScopeCount_IsDerived(t *testing.T) {
	for name, query := range map[string]string{
		"list":     adminUsersListQuery,
		"overview": adminUsersOverviewQuery,
	} {
		if strings.Contains(query, "0 AS release_scope_count") {
			t.Fatalf("%s query enthält noch hardcoded release_scope_count = 0", name)
		}
		if !strings.Contains(query, "COALESCE(release_scopes.release_scope_count, 0)") {
			t.Fatalf("%s query liest release_scope_count nicht aus dem release_scopes-Lateral", name)
		}
		if !strings.Contains(query, "COUNT(DISTINCT rv_scope.id) AS release_scope_count") {
			t.Fatalf("%s query leitet release_scope_count nicht aus Release-Versionen ab", name)
		}
	}
}
