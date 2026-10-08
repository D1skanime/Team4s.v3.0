package repository

// testmain_test.go — TestMain für das repository-Paket.
// Initialisiert den permissions.fansubGroupRoleCatalog vor allen Tests,
// da er seit Plan 95-02 dynamisch geladen wird (nicht mehr statisch deklariert).
// Ohne diesen Setup würde permissions.FansubGroupRoles() in Unit-Tests leer zurückgeben,
// was Tests die den Catalog als Vorbedingung nutzen scheitern lässt (D-12 side effect).
//
// WR-05 (176-REVIEW): also establishes a deterministic baseline for permissions'
// package-level role_capabilities cache (loadedCache) before any test runs, instead of
// leaving it nil until whichever test happens to call LoadCache first. Pure-function unit
// tests like TestEvaluateMemberMutationConflictBlocksLastActiveManager read this cache via
// permissions.RoleAllowsAction and used to only pass by accident when a DB-backed test
// (TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase, itself gated behind
// TEAM4S_PHASE107_TEST_DSN) ran first and left its narrower stub behind -- order- and
// env-dependent. Reusing authzRepositoryReviewCapabilityCacheLoaderStub here (it already
// grants RoleFansubLead -> ActionFansubGroupMembersManage plus every other known action, to
// satisfy LoadCache's D-10 completeness check) gives every test in this binary the same
// baseline regardless of run order or whether that DSN is set; the DB-backed test itself now
// snapshots/restores the cache around its own narrower LoadCache call instead of depending on
// leaving it mutated for whatever runs next.
import (
	"context"
	"os"
	"testing"

	"team4s.v3/backend/internal/permissions"
)

func TestMain(m *testing.M) {
	// Catalog-Stub: canonical assignable Rollen aus Migration 0112.
	svc := permissions.NewService(nil)
	stub := &testCatalogLoader{}
	if err := svc.LoadFansubGroupCatalog(context.Background(), stub); err != nil {
		panic("testmain: LoadFansubGroupCatalog fehlgeschlagen: " + err.Error())
	}
	if err := svc.LoadCache(context.Background(), authzRepositoryReviewCapabilityCacheLoaderStub{}); err != nil {
		panic("testmain: LoadCache fehlgeschlagen: " + err.Error())
	}
	os.Exit(m.Run())
}

// testCatalogLoader liefert die bekannten assignable Rollen für Unit-Tests.
type testCatalogLoader struct{}

func (t *testCatalogLoader) LoadFansubGroupRoles(_ context.Context) ([]string, error) {
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

// LoadCapabilityRoles: dieselben aktiven Rollen sind capability-editierbar (G4).
func (t *testCatalogLoader) LoadCapabilityRoles(ctx context.Context) ([]string, error) {
	return t.LoadFansubGroupRoles(ctx)
}
