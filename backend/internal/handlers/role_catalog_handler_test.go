package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "reflect"
    "testing"

    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)

type fakePublicRoleCatalog struct {
    contextName string
    rows []repository.PublicRoleDefinition
}

func (f *fakePublicRoleCatalog) ListPublicRoleDefinitions(_ context.Context, contextName string) ([]repository.PublicRoleDefinition, error) {
    f.contextName = contextName
    return f.rows, nil
}

func TestRoleCatalogHandlerAllowsExactlyPublicContexts(t *testing.T) {
    gin.SetMode(gin.TestMode)
    for _, contextName := range []string{"fansub_group", "anime_contribution", "group_history"} {
        repo := &fakePublicRoleCatalog{rows: []repository.PublicRoleDefinition{{
            Code: "karaoke_fx", LabelDE: "Karaoke-FX", Contexts: []string{"fansub_group", "anime_contribution"},
            SortOrder: 45, Assignable: true, ColorKey: "karaoke_fx", IconKey: "karaoke_fx",
            OperativeCapabilityCount: 0, HasOperativeCapabilities: false,
        }}}
        router := gin.New()
        RegisterPublicRoleCatalogRoute(router.Group("/api/v1"), NewRoleCatalogHandler(repo))
        request := httptest.NewRequest(http.MethodGet, "/api/v1/role-definitions?context="+contextName, nil)
        response := httptest.NewRecorder()
        router.ServeHTTP(response, request)
        if response.Code != http.StatusOK { t.Fatalf("context %s: status=%d body=%s", contextName, response.Code, response.Body.String()) }
        if got := response.Header().Get("WWW-Authenticate"); got != "" { t.Fatalf("unexpected auth challenge: %q", got) }
        if repo.contextName != contextName { t.Fatalf("repository context=%q", repo.contextName) }
    }
}

func TestRoleCatalogHandlerRejectsMissingAndInvalidContextWithProjectEnvelope(t *testing.T) {
    gin.SetMode(gin.TestMode)
    for _, query := range []string{"", "?context=platform_admin", "?context=unknown"} {
        router := gin.New()
        RegisterPublicRoleCatalogRoute(router.Group("/api/v1"), NewRoleCatalogHandler(&fakePublicRoleCatalog{}))
        response := httptest.NewRecorder()
        router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/role-definitions"+query, nil))
        if response.Code != http.StatusBadRequest { t.Fatalf("query %q: status=%d body=%s", query, response.Code, response.Body.String()) }
        var body map[string]any
        if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil { t.Fatal(err) }
        if _, ok := body["error"]; !ok { t.Fatalf("missing project error envelope: %#v", body) }
        if got := response.Header().Get("WWW-Authenticate"); got != "" { t.Fatalf("unexpected auth challenge: %q", got) }
    }
}

func TestRoleCatalogHandlerReturnsExactPresentationKeys(t *testing.T) {
    gin.SetMode(gin.TestMode)
    repo := &fakePublicRoleCatalog{rows: []repository.PublicRoleDefinition{{
        Code: "karaoke_fx", LabelDE: "Karaoke-FX", Contexts: []string{"fansub_group", "anime_contribution"},
        SortOrder: 45, Assignable: true, ColorKey: "karaoke_fx", IconKey: "karaoke_fx",
        OperativeCapabilityCount: 0, HasOperativeCapabilities: false,
    }}}
    router := gin.New()
    RegisterPublicRoleCatalogRoute(router.Group("/api/v1"), NewRoleCatalogHandler(repo))
    response := httptest.NewRecorder()
    router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/role-definitions?context=fansub_group", nil))
    var rows []map[string]any
    if err := json.Unmarshal(response.Body.Bytes(), &rows); err != nil { t.Fatal(err) }
    if len(rows) != 1 { t.Fatalf("rows=%d body=%s", len(rows), response.Body.String()) }
    got := make([]string, 0, len(rows[0]))
    for key := range rows[0] { got = append(got, key) }
    expected := []string{"assignable", "code", "color_key", "contexts", "has_operative_capabilities", "icon_key", "label_de", "operative_capability_count", "sort_order"}
    sortStrings(got)
    if !reflect.DeepEqual(got, expected) { t.Fatalf("keys=%v expected=%v", got, expected) }
    for _, forbidden := range []string{"actions", "grants", "overrides", "audit", "global_roles"} {
        if _, ok := rows[0][forbidden]; ok { t.Fatalf("sensitive key %q leaked", forbidden) }
    }
    if rows[0]["has_operative_capabilities"] != false || rows[0]["operative_capability_count"] != float64(0) {
        t.Fatalf("karaoke_fx must be zero-right: %#v", rows[0])
    }
}

func sortStrings(values []string) {
    for i := 1; i < len(values); i++ {
        for j := i; j > 0 && values[j] < values[j-1]; j-- { values[j], values[j-1] = values[j-1], values[j] }
    }
}
