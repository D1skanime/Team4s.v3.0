package handlers

// testmain_test.go — TestMain für das handlers-Paket.
// Initialisiert den permissions.fansubGroupRoleCatalog vor allen Tests,
// da er seit Plan 95-02 dynamisch geladen wird (nicht mehr statisch deklariert).

import (
	"context"
	"os"
	"testing"

	"team4s.v3/backend/internal/permissions"
)

func TestMain(m *testing.M) {
	// Catalog-Stub: canonical assignable Rollen aus Migration 0112.
	svc := permissions.NewService(nil)
	stub := &handlerTestCatalogLoader{}
	if err := svc.LoadFansubGroupCatalog(context.Background(), stub); err != nil {
		panic("testmain: LoadFansubGroupCatalog fehlgeschlagen: " + err.Error())
	}
	os.Exit(m.Run())
}

// handlerTestCatalogLoader liefert die bekannten assignable Rollen für Unit-Tests.
type handlerTestCatalogLoader struct{}

func (t *handlerTestCatalogLoader) LoadFansubGroupRoles(_ context.Context) ([]string, error) {
	return []string{
		"fansub_lead",
		"project_lead",
		"translator",
		"timer",
		"typesetter",
		"editor",
		"encoder",
		"raw_provider",
		"quality_checker",
		"designer",
		"techadmin",
		"gfxler",
	}, nil
}

// LoadCapabilityRoles: dieselben aktiven Rollen sind capability-editierbar (G4), PLUS die
// reservierte Mitgliedschafts-Grundausstattung (group_member) — production's LoadCapabilityRoles
// (authz_permissions.go) deliberately carries NO "AND NOT reserved" filter (D-17 trap, Plan
// 146-03), unlike LoadFansubGroupRoles above which does exclude reserved roles from the
// assignable-role list. Without this, IsCapabilityBearingRole("group_member") would be false in
// tests and the 146-03 membership-baseline guards inside GrantCapability/RevokeCapability would
// be unreachable, masked by the earlier role_not_capability_bearing 422.
func (t *handlerTestCatalogLoader) LoadCapabilityRoles(ctx context.Context) ([]string, error) {
	assignable, err := t.LoadFansubGroupRoles(ctx)
	if err != nil {
		return nil, err
	}
	return append(assignable, permissions.RoleMembershipBaseline), nil
}
