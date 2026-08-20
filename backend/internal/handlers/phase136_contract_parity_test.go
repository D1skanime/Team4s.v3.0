package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"
)

func TestPhase136ContractParity(t *testing.T) {
	_, current, _, _ := runtime.Caller(0)
	backendRoot := filepath.Clean(filepath.Join(filepath.Dir(current), "../.."))
	root := filepath.Clean(filepath.Join(backendRoot, ".."))
	read := func(path string) string {
		t.Helper()
		data, err := os.ReadFile(filepath.Join(root, path))
		if err != nil {
			t.Fatal(err)
		}
		return string(data)
	}

	required := []string{"code", "label_de", "contexts", "sort_order", "assignable", "color_key", "icon_key", "operative_capability_count", "has_operative_capabilities"}
	publicJSON, _ := json.Marshal(repository.PublicRoleDefinition{Code: "karaoke_fx"})
	protectedData, err := os.ReadFile(filepath.Join(backendRoot, "internal/repository/hist_group_member_roles_repository.go"))
	if err != nil { t.Fatal(err) }
	protectedSource := string(protectedData)
	for _, field := range required {
		needle := `"` + field + `"`
		if !strings.Contains(protectedSource, `json:"`+field+`"`) {
			t.Errorf("protected Go DTO missing %s", field)
		}
		if !strings.Contains(string(publicJSON), needle) {
			t.Errorf("public Go DTO missing %s", field)
		}
	}

	if _, err := os.Stat(filepath.Join(root, "shared/contracts/admin-capabilities.yaml")); err != nil {
		t.Skip("shared contract mount unavailable in backend container; YAML parity runs from repository gate")
	}
	focused := read("shared/contracts/admin-capabilities.yaml")
	rootContract := read("shared/contracts/openapi.yaml")
	ts := read("frontend/src/types/admin-capability.ts")
	api := read("frontend/src/lib/api.ts")
	for _, field := range required {
		for name, source := range map[string]string{"focused": focused, "root": rootContract, "typescript": ts} {
			if !strings.Contains(source, field) {
				t.Errorf("%s contract missing %s", name, field)
			}
		}
	}
	for _, contextName := range []string{"fansub_group", "anime_contribution", "group_history"} {
		if !strings.Contains(focused, contextName) || !strings.Contains(rootContract, contextName) {
			t.Errorf("contracts missing context %s", contextName)
		}
	}
	if !strings.Contains(api, "export async function listRoleDefinitions") || !strings.Contains(api, "apiClientFetch") {
		t.Error("central public catalog helper missing")
	}
}
