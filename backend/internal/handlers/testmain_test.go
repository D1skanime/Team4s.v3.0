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
