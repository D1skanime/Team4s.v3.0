package repository

// testmain_test.go — TestMain für das repository-Paket.
// Initialisiert den permissions.fansubGroupRoleCatalog vor allen Tests,
// da er seit Plan 95-02 dynamisch geladen wird (nicht mehr statisch deklariert).
// Ohne diesen Setup würde permissions.FansubGroupRoles() in Unit-Tests leer zurückgeben,
// was Tests die den Catalog als Vorbedingung nutzen scheitern lässt (D-12 side effect).

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
