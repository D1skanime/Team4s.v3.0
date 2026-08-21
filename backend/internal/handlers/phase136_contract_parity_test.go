package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"reflect"
	"sort"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestPhase136ContractParity(t *testing.T) {
	t.Run("group capability response", func(t *testing.T) {
		expected := []string{
			"can_edit_group_general",
			"can_update_group_media",
			"can_edit_technical_links",
			"can_edit_founding_history",
			"can_update_group_links",
		}
		assertJSONRequiredSubset(t, fansubGroupCapabilitiesResponse{}, expected...)

		_, current, _, _ := runtime.Caller(0)
		root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))
		for _, relative := range []string{"shared/contracts/openapi.yaml", "shared/contracts/admin-capabilities.yaml"} {
			data, err := os.ReadFile(filepath.Join(root, relative))
			if err != nil {
				t.Fatal(err)
			}
			var document phase136Document
			if err := yaml.Unmarshal(data, &document); err != nil {
				t.Fatalf("parse %s: %v", relative, err)
			}
			schema, ok := document.Components.Schemas["FansubGroupCapabilities"]
			if !ok {
				t.Errorf("%s missing FansubGroupCapabilities", relative)
				continue
			}
			for _, field := range expected {
				if !contains(schema.Required, field) {
					t.Errorf("%s FansubGroupCapabilities.%s missing or optional", relative, field)
				}
				if property := schema.Properties[field]; property.Type != "boolean" || property.Nullable {
					t.Errorf("%s FansubGroupCapabilities.%s must be required non-nullable boolean", relative, field)
				}
			}
		}

		tsBytes, err := os.ReadFile(filepath.Join(root, "frontend/src/types/fansub.ts"))
		if err != nil {
			t.Fatal(err)
		}
		assertTSInterfaceFields(t, string(tsBytes), "FansubGroupCapabilities", expected)
	})

	t.Run("YAML and TypeScript owners", TestPhase136PolicyYAMLTypeScriptContract)

	t.Run("Go DTO JSON shapes", func(t *testing.T) {
		cases := []struct {
			value  any
			fields map[string]bool
		}{
			{EffectiveRightState{}, requiredFields("action_code", "allowed", "provenance", "decisive", "non_deniable")},
			{CapabilityOverrideReason{}, fieldsWithOptional("text", "category")},
			{CapabilityOverrideState{}, requiredFields("group_id", "target_user_id", "action_code", "effect", "reason", "created_by_user_id", "created_at")},
			{CapabilityOverrideImpactItem{}, requiredFields("target_user_id", "before", "after")},
			{CapabilityOverrideImpactPreview{}, requiredFields("affected_user_count", "items")},
			{CapabilityOverrideAuditItem{}, requiredFields("id", "group_id", "target_user_id", "action_code", "actor_user_id", "occurred_at", "before", "after", "reason")},
			{CapabilityOverrideMutationResult{}, requiredFields("status", "changed", "before", "after", "effective_right", "activation_status")},
			{CapabilityOverrideMutationRequest{}, fieldsWithOptional("reason", "group_id", "target_user_id", "action_code", "effect")},
		}
		for _, testCase := range cases {
			assertPolicyJSONShape(t, testCase.value, testCase.fields)
		}
	})

	t.Run("nullable and optional fields use pointers", func(t *testing.T) {
		assertPolicyPointerFields(t, CapabilityOverrideAuditItem{}, "before", "after", "reason")
		assertPolicyPointerFields(t, CapabilityOverrideMutationResult{}, "before", "after")
		assertPolicyPointerFields(t, CapabilityOverrideMutationRequest{}, "effect", "reason")
	})

	t.Run("shared enum vocabulary", func(t *testing.T) {
		assertPolicyEnum(t, []string{
			string(EffectiveRightProvenanceIDPGlobalRole), string(EffectiveRightProvenanceGroupRole),
			string(EffectiveRightProvenanceUserAllow), string(EffectiveRightProvenanceUserDeny),
		}, []string{"idp_global_role", "group_role", "user_allow", "user_deny"})
		assertPolicyEnum(t, []string{string(CapabilityOverrideEffectAllow), string(CapabilityOverrideEffectDeny)}, []string{"allow", "deny"})
		assertPolicyEnum(t, []string{
			string(CapabilityActivationStatusPersisted), string(CapabilityActivationStatusActive),
			string(CapabilityActivationStatusPending), string(CapabilityActivationStatusFailed),
		}, []string{"persisted", "active", "pending", "failed"})
		assertPolicyEnum(t, []string{string(CapabilityMutationStatusChanged), string(CapabilityMutationStatusNoOp)}, []string{"changed", "no_op"})
		assertPolicyEnum(t, []string{
			string(CapabilityOverrideReasonTaskDelegation), string(CapabilityOverrideReasonSecurityMeasure),
			string(CapabilityOverrideReasonRoleGap), string(CapabilityOverrideReasonOther),
		}, []string{"task_delegation", "security_measure", "role_gap", "other"})
	})

	t.Run("external request cannot assert platform admin provenance", func(t *testing.T) {
		requestJSON, err := json.Marshal(CapabilityOverrideMutationRequest{})
		if err != nil {
			t.Fatal(err)
		}
		if jsonContainsKey(t, requestJSON, "actor_is_platform_admin") {
			t.Fatalf("external request exposed server-owned provenance: %s", requestJSON)
		}
		command := capabilityOverrideMutationCommand{ActorIsPlatformAdmin: true}
		if !command.ActorIsPlatformAdmin {
			t.Fatal("backend command must retain derived platform-admin provenance")
		}
	})
}

func TestCapabilityOverrideReasonValidation(t *testing.T) {
	valid := []string{
		`{"category":"task_delegation"}`,
		`{"category":"security_measure","text":null}`,
		`{"category":"role_gap","text":"optional detail"}`,
		`{"category":"other","text":"temporary substitution"}`,
	}
	for _, fixture := range valid {
		var reason CapabilityOverrideReason
		if err := json.Unmarshal([]byte(fixture), &reason); err != nil {
			t.Errorf("valid fixture %s: %v", fixture, err)
		}
	}

	invalid := []string{
		`{"category":"other"}`,
		`{"category":"other","text":""}`,
		`{"category":"other","text":"   "}`,
		`{"category":"unknown"}`,
	}
	for _, fixture := range invalid {
		var reason CapabilityOverrideReason
		if err := json.Unmarshal([]byte(fixture), &reason); err == nil {
			t.Errorf("invalid fixture accepted: %s", fixture)
		}
	}

	if err := (CapabilityOverrideReason{Category: CapabilityOverrideReasonOther}).Validate(); err == nil {
		t.Error("direct Go construction must reject other without explanatory text")
	}
}

func assertJSONRequiredSubset(t *testing.T, value any, names ...string) {
	t.Helper()
	typeOf := reflect.TypeOf(value)
	fields := map[string]bool{}
	for i := 0; i < typeOf.NumField(); i++ {
		name, options := parseJSONTag(typeOf.Field(i).Tag.Get("json"))
		fields[name] = options["omitempty"]
	}
	for _, name := range names {
		optional, ok := fields[name]
		if !ok || optional {
			t.Errorf("%s.%s missing or optional", typeOf.Name(), name)
		}
	}
}

func requiredFields(names ...string) map[string]bool {
	return fieldsWithOptional("", names...)
}

func fieldsWithOptional(optional string, names ...string) map[string]bool {
	fields := make(map[string]bool, len(names)+1)
	for _, name := range names {
		fields[name] = false
	}
	if optional != "" {
		fields[optional] = true
	}
	return fields
}

func assertPolicyJSONShape(t *testing.T, value any, expected map[string]bool) {
	t.Helper()
	typeOf := reflect.TypeOf(value)
	actual := make(map[string]bool, typeOf.NumField())
	for i := 0; i < typeOf.NumField(); i++ {
		field := typeOf.Field(i)
		name, options := parseJSONTag(field.Tag.Get("json"))
		if name == "" || name == "-" {
			continue
		}
		actual[name] = options["omitempty"]
	}
	if !reflect.DeepEqual(actual, expected) {
		t.Errorf("%s JSON shape = %v, want %v", typeOf.Name(), actual, expected)
	}
}

func assertPolicyPointerFields(t *testing.T, value any, names ...string) {
	t.Helper()
	typeOf := reflect.TypeOf(value)
	for _, name := range names {
		field, ok := typeOf.FieldByNameFunc(func(candidate string) bool {
			return strings.EqualFold(candidate, strings.ReplaceAll(name, "_", ""))
		})
		if !ok {
			t.Errorf("%s missing Go field for %s", typeOf.Name(), name)
			continue
		}
		if field.Type.Kind() != reflect.Pointer {
			t.Errorf("%s.%s must be a pointer, got %s", typeOf.Name(), field.Name, field.Type)
		}
	}
}

func parseJSONTag(tag string) (string, map[string]bool) {
	parts := strings.Split(tag, ",")
	options := make(map[string]bool, len(parts)-1)
	for _, option := range parts[1:] {
		options[option] = true
	}
	return parts[0], options
}

func assertPolicyEnum(t *testing.T, actual, expected []string) {
	t.Helper()
	sort.Strings(actual)
	sort.Strings(expected)
	if !reflect.DeepEqual(actual, expected) {
		t.Errorf("enum = %v, want %v", actual, expected)
	}
}

func jsonContainsKey(t *testing.T, data []byte, key string) bool {
	t.Helper()
	var object map[string]any
	if err := json.Unmarshal(data, &object); err != nil {
		t.Fatal(err)
	}
	_, exists := object[key]
	return exists
}
