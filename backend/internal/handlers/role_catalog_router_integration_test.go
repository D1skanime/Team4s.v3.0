package handlers

import (
    "os"
    "strings"
    "testing"
)

func TestRoleDefinitionsRouterIsRegisteredExactlyOnceWithoutAuthMiddleware(t *testing.T) {
    source, err := os.ReadFile("../../cmd/server/main.go")
    if err != nil { t.Fatal(err) }
    text := string(source)
    registration := "RegisterPublicRoleCatalogRoute(v1, roleCatalogHandler)"
    if got := strings.Count(text, registration); got != 1 { t.Fatalf("registration count=%d", got) }
    if strings.Contains(text, "RegisterPublicRoleCatalogRoute(v1, authMiddleware") || strings.Contains(text, "role-definitions\", authMiddleware") {
        t.Fatal("public role catalog must not be behind auth middleware")
    }
}
