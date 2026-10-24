package main

import (
	"strings"
	"testing"
)

// Die generischen Anime-Medienendpunkte muessen im Produktionsgraph mit dem
// Plattform-Admin-Guard verdrahtet sein. Ohne WithAdminAuthz faellt der Handler
// zwar fail-closed auf 500, aber die Admin-Funktion waere unbrauchbar.
func TestAdminMediaEndpointsWirePlatformAdminAuthz(t *testing.T) {
	source := readServerWiringSource(t)
	if !strings.Contains(source, "WithAdminAuthz(authzRepo, cfg.AuthAdminRoleName)") {
		t.Fatal("mediaUploadHandler must be wired with the shared platform-admin authz repository")
	}
}
