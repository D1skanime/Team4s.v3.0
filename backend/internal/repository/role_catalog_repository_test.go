package repository

import (
    "os"
    "strings"
    "testing"
)

func TestRoleCatalogRepositoryUsesBoundedPresentationProjection(t *testing.T) {
    source, err := os.ReadFile("role_catalog_repository.go")
    if err != nil {
        t.Fatal(err)
    }
    text := string(source)
    for _, fragment := range []string{
        "rd.code", "rd.label_de", "rd.contexts", "rd.sort_order", "rd.assignable",
        "rd.color_key", "rd.icon_key", "COUNT(rc.action_code)",
        "$1 = ANY(rd.contexts)", "ORDER BY rd.sort_order, rd.code",
    } {
        if !strings.Contains(text, fragment) {
            t.Errorf("public role projection must contain %q", fragment)
        }
    }
    for _, forbidden := range []string{"user_group_capability_overrides", "user_group_capability_override_history", "app_user_global_roles"} {
        if strings.Contains(text, forbidden) {
            t.Errorf("public role projection must not reference %q", forbidden)
        }
    }
}
