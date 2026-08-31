package handlers

import (
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

type phase136Schema struct {
	Type       string                      `yaml:"type"`
	Enum       []any                       `yaml:"enum"`
	Required   []string                    `yaml:"required"`
	Properties map[string]phase136Property `yaml:"properties"`
	OneOf      []map[string]any            `yaml:"oneOf"`
}

type phase136Property struct {
	Type     string           `yaml:"type"`
	Ref      string           `yaml:"$ref"`
	Nullable bool             `yaml:"nullable"`
	Enum     []any            `yaml:"enum"`
	Items    map[string]any   `yaml:"items"`
	AllOf    []map[string]any `yaml:"allOf"`
}

type phase136Document struct {
	Components struct {
		Schemas map[string]phase136Schema `yaml:"schemas"`
	} `yaml:"components"`
}

func TestPhase136PolicyYAMLTypeScriptContract(t *testing.T) {
	_, current, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))

	loadYAML := func(relative string) phase136Document {
		t.Helper()
		data, err := os.ReadFile(filepath.Join(root, relative))
		if err != nil {
			t.Fatal(err)
		}
		var document phase136Document
		if err := yaml.Unmarshal(data, &document); err != nil {
			t.Fatalf("parse %s: %v", relative, err)
		}
		return document
	}

	focused := loadYAML("shared/contracts/admin-capabilities.yaml")
	rootContract := loadYAML("shared/contracts/openapi.yaml")

	expectedObjects := map[string][]string{
		"EffectiveRightState": {
			"action_code", "allowed", "provenance", "decisive", "non_deniable",
			// Phase-137 additive provenance fields (D04, 137-02-PLAN.md) — see
			// TestEffectiveRightStateProvenanceContract in admin_capability_contract_test.go
			// for the dedicated, more detailed assertion of this extension.
			"granting_roles", "user_allow", "user_deny", "specialized_grants",
			"decisive_source", "reason_code",
		},
		"CapabilityOverrideState":           {"group_id", "target_user_id", "action_code", "effect", "reason", "created_by_user_id", "created_at"},
		"CapabilityOverrideImpactItem":      {"target_user_id", "before", "after"},
		"CapabilityOverrideImpactPreview":   {"affected_user_count", "items"},
		"CapabilityOverrideAuditItem":       {"id", "group_id", "target_user_id", "action_code", "actor_user_id", "occurred_at", "before", "after", "reason"},
		"CapabilityOverrideMutationResult":  {"status", "changed", "before", "after", "effective_right", "activation_status"},
		"CapabilityOverrideMutationRequest": {"group_id", "target_user_id", "action_code", "effect"},
	}
	expectedEnums := map[string][]string{
		// Phase-137 additive provenance values (D04, 137-02-PLAN.md): platform_admin,
		// specialized_grant, no_grant. See TestEffectiveRightStateProvenanceContract
		// in admin_capability_contract_test.go for the dedicated assertion.
		"EffectiveRightProvenance":   {"idp_global_role", "group_role", "user_allow", "user_deny", "platform_admin", "membership_baseline", "specialized_grant", "no_grant"},
		"CapabilityOverrideEffect":   {"allow", "deny"},
		"CapabilityActivationStatus": {"persisted", "active", "pending", "failed"},
		"CapabilityMutationStatus":   {"changed", "no_op"},
	}

	for _, document := range []struct {
		name    string
		schemas map[string]phase136Schema
	}{{"focused", focused.Components.Schemas}, {"root", rootContract.Components.Schemas}} {
		for name, required := range expectedObjects {
			schema, ok := document.schemas[name]
			if !ok {
				t.Errorf("%s contract missing schema %s", document.name, name)
				continue
			}
			if schema.Type != "object" {
				t.Errorf("%s %s type = %q, want object", document.name, name, schema.Type)
			}
			if !sameStrings(schema.Required, required) {
				t.Errorf("%s %s required = %v, want %v", document.name, name, schema.Required, required)
			}
			for _, property := range required {
				if _, ok := schema.Properties[property]; !ok {
					t.Errorf("%s %s missing property %s", document.name, name, property)
				}
			}
		}
		for name, expected := range expectedEnums {
			schema, ok := document.schemas[name]
			if !ok {
				t.Errorf("%s contract missing enum %s", document.name, name)
				continue
			}
			if schema.Type != "string" || !sameStrings(anyStrings(schema.Enum), expected) {
				t.Errorf("%s %s enum = %v, want %v", document.name, name, schema.Enum, expected)
			}
		}
		assertReasonContract(t, document.name, document.schemas["CapabilityOverrideReason"])
		assertMutationRequestContract(t, document.name, document.schemas)
		assertNullableTransitions(t, document.name, document.schemas)
	}

	for name := range expectedObjects {
		if !reflect.DeepEqual(policyShape(focused.Components.Schemas[name]), policyShape(rootContract.Components.Schemas[name])) {
			t.Errorf("focused/root semantic drift in %s", name)
		}
	}
	for name := range expectedEnums {
		if !reflect.DeepEqual(policyShape(focused.Components.Schemas[name]), policyShape(rootContract.Components.Schemas[name])) {
			t.Errorf("focused/root semantic drift in %s", name)
		}
	}

	tsBytes, err := os.ReadFile(filepath.Join(root, "frontend/src/types/admin-capability.ts"))
	if err != nil {
		t.Fatal(err)
	}
	ts := string(tsBytes)
	for name, required := range expectedObjects {
		assertTSInterfaceFields(t, ts, name, required)
	}
	assertTSUnion(t, ts, "EffectiveRightProvenance", expectedEnums["EffectiveRightProvenance"])
	assertTSUnion(t, ts, "CapabilityOverrideEffect", expectedEnums["CapabilityOverrideEffect"])
	assertTSUnion(t, ts, "CapabilityActivationStatus", expectedEnums["CapabilityActivationStatus"])
	assertTSUnion(t, ts, "CapabilityMutationStatus", expectedEnums["CapabilityMutationStatus"])
	assertTSReasonAndRequest(t, ts)
}

func assertReasonContract(t *testing.T, label string, schema phase136Schema) {
	t.Helper()
	if len(schema.OneOf) != 2 {
		t.Fatalf("%s reason must have two oneOf branches", label)
	}
	encoded := marshalYAMLForTest(t, schema.OneOf)
	for _, category := range []string{"task_delegation", "security_measure", "role_gap", "other"} {
		if !regexp.MustCompile(`(?m)(^|[ ,\[])` + category + `([,\]]|$)`).MatchString(encoded) {
			t.Errorf("%s reason missing category %s", label, category)
		}
	}
	if !strings.Contains(encoded, "required:\n    - category\n    - text") || !strings.Contains(encoded, "minLength: 1") {
		t.Errorf("%s other reason must require non-empty text", label)
	}
}

func assertMutationRequestContract(t *testing.T, label string, schemas map[string]phase136Schema) {
	t.Helper()
	request := schemas["CapabilityOverrideMutationRequest"]
	if contains(request.Required, "reason") {
		t.Errorf("%s external request reason must remain auth-conditionally optional", label)
	}
	if _, exposed := request.Properties["actor_is_platform_admin"]; exposed {
		t.Errorf("%s external request exposes server-owned platform-admin provenance", label)
	}
	if !request.Properties["effect"].Nullable || !request.Properties["reason"].Nullable {
		t.Errorf("%s mutation effect and reason must support override removal/platform-admin omission", label)
	}
}

func assertNullableTransitions(t *testing.T, label string, schemas map[string]phase136Schema) {
	t.Helper()
	for _, schemaName := range []string{"CapabilityOverrideAuditItem", "CapabilityOverrideMutationResult"} {
		for _, field := range []string{"before", "after"} {
			if !schemas[schemaName].Properties[field].Nullable {
				t.Errorf("%s %s.%s must be nullable", label, schemaName, field)
			}
		}
	}
	if !schemas["CapabilityOverrideAuditItem"].Properties["reason"].Nullable {
		t.Errorf("%s audit reason must represent platform-admin omission", label)
	}
}

func assertTSInterfaceFields(t *testing.T, source, name string, required []string) {
	t.Helper()
	match := regexp.MustCompile(`(?s)(?:export )?interface\s+` + regexp.QuoteMeta(name) + `(?:\s+extends\s+[A-Za-z0-9_]+)?\s*\{(.*?)\n\}`).FindStringSubmatch(source)
	if match == nil {
		t.Errorf("TypeScript missing interface %s", name)
		return
	}
	fields := map[string]bool{}
	fieldPattern := regexp.MustCompile(`(?m)^\s*([a-z_]+)(\?)?:\s*[^;]+;`)
	for _, field := range fieldPattern.FindAllStringSubmatch(match[1], -1) {
		fields[field[1]] = field[2] == ""
	}
	for _, field := range required {
		if !fields[field] {
			t.Errorf("TypeScript %s.%s missing or optional", name, field)
		}
	}
}

func assertTSUnion(t *testing.T, source, name string, expected []string) {
	t.Helper()
	match := regexp.MustCompile(`(?m)^export type\s+` + regexp.QuoteMeta(name) + `\s*=\s*([^;]+);`).FindStringSubmatch(source)
	if match == nil {
		t.Errorf("TypeScript missing union %s", name)
		return
	}
	values := []string{}
	for _, item := range regexp.MustCompile(`'([^']+)'`).FindAllStringSubmatch(match[1], -1) {
		values = append(values, item[1])
	}
	if !sameStrings(values, expected) {
		t.Errorf("TypeScript %s = %v, want %v", name, values, expected)
	}
}

func assertTSReasonAndRequest(t *testing.T, source string) {
	t.Helper()
	reason := regexp.MustCompile(`(?s)export type CapabilityOverrideReason\s*=\s*(.*?);\n\nexport interface CapabilityOverrideState`).FindStringSubmatch(source)
	if reason == nil {
		t.Fatal("TypeScript reason union missing")
	}
	for _, value := range []string{"task_delegation", "security_measure", "role_gap", "other"} {
		if !strings.Contains(reason[1], "'"+value+"'") {
			t.Errorf("TypeScript reason missing %s", value)
		}
	}
	if !regexp.MustCompile(`category:\s*'other';\s*text:\s*string`).MatchString(reason[1]) {
		t.Error("TypeScript other reason must require text")
	}
	request := regexp.MustCompile(`(?s)export interface CapabilityOverrideMutationRequest\s*\{(.*?)
\}`).FindStringSubmatch(source)
	if request == nil || strings.Contains(request[1], "actor_is_platform_admin") || !strings.Contains(request[1], "reason?: CapabilityOverrideReason | null") {
		t.Error("TypeScript mutation request must omit server-owned provenance and keep auth-conditional reason optional")
	}
}

func policyShape(schema phase136Schema) any {
	for name, property := range schema.Properties {
		property.Items = nil
		schema.Properties[name] = property
	}
	return schema
}

func marshalYAMLForTest(t *testing.T, value any) string {
	t.Helper()
	data, err := yaml.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func anyStrings(values []any) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		result = append(result, strings.TrimSpace(strings.ToLower(strings.TrimSpace(toString(value)))))
	}
	return result
}

func toString(value any) string {
	if value == true {
		return "true"
	}
	if value == false {
		return "false"
	}
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

func sameStrings(left, right []string) bool {
	leftCopy := append([]string(nil), left...)
	rightCopy := append([]string(nil), right...)
	sort.Strings(leftCopy)
	sort.Strings(rightCopy)
	return reflect.DeepEqual(leftCopy, rightCopy)
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}
