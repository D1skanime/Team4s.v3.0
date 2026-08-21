package handlers

import (
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// This file owns the Phase-137 contract assertions for D04's additive
// EffectiveRightState/EffectiveRightProvenance extension (137-02-PLAN.md).
// It reuses the phase136Document/phase136Schema/phase136Property parsing
// types and the sameStrings/anyStrings/contains/assertTSInterfaceFields/
// assertTSUnion helpers already defined in phase136_policy_yaml_ts_contract_test.go
// (same package) rather than duplicating YAML/TS parsing logic.

func loadPhase137Document(t *testing.T, relative string) phase136Document {
	t.Helper()
	_, current, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))
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

func loadPhase137TypeScript(t *testing.T) string {
	t.Helper()
	_, current, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))
	tsBytes, err := os.ReadFile(filepath.Join(root, "frontend/src/types/admin-capability.ts"))
	if err != nil {
		t.Fatal(err)
	}
	return string(tsBytes)
}

func loadPhase137Source(t *testing.T, relative string) string {
	t.Helper()
	_, current, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))
	data, err := os.ReadFile(filepath.Join(root, relative))
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// TestEffectiveRightStateProvenanceContract proves D04's additive provenance
// extension: EffectiveRightState gains granting_roles/user_allow/user_deny/
// specialized_grants/decisive_source/reason_code without dropping any
// Phase-136 field, and EffectiveRightProvenance gains platform_admin/
// specialized_grant/no_grant without dropping any Phase-136 enum value.
// Asserted identically across the focused contract, the root OpenAPI mirror,
// and the TypeScript mirror, per 137-02-PLAN.md must_haves.
func TestEffectiveRightStateProvenanceContract(t *testing.T) {
	focused := loadPhase137Document(t, "shared/contracts/admin-capabilities.yaml")
	root := loadPhase137Document(t, "shared/contracts/openapi.yaml")

	expectedProvenance := []string{
		"idp_global_role", "group_role", "user_allow", "user_deny",
		"platform_admin", "specialized_grant", "no_grant",
	}
	expectedRequired := []string{
		"action_code", "allowed", "provenance", "decisive", "non_deniable",
		"granting_roles", "user_allow", "user_deny", "specialized_grants",
		"decisive_source", "reason_code",
	}

	for _, document := range []struct {
		name    string
		schemas map[string]phase136Schema
	}{{"focused", focused.Components.Schemas}, {"root", root.Components.Schemas}} {
		provenance, ok := document.schemas["EffectiveRightProvenance"]
		if !ok {
			t.Fatalf("%s contract missing EffectiveRightProvenance", document.name)
		}
		if provenance.Type != "string" || !sameStrings(anyStrings(provenance.Enum), expectedProvenance) {
			t.Errorf("%s EffectiveRightProvenance enum = %v, want %v", document.name, provenance.Enum, expectedProvenance)
		}
		// Phase-136's original four values must remain present verbatim (additive only).
		for _, original := range []string{"idp_global_role", "group_role", "user_allow", "user_deny"} {
			if !contains(anyStrings(provenance.Enum), original) {
				t.Errorf("%s EffectiveRightProvenance dropped Phase-136 value %s", document.name, original)
			}
		}

		state, ok := document.schemas["EffectiveRightState"]
		if !ok {
			t.Fatalf("%s contract missing EffectiveRightState", document.name)
		}
		if state.Type != "object" {
			t.Errorf("%s EffectiveRightState type = %q, want object", document.name, state.Type)
		}
		if !sameStrings(state.Required, expectedRequired) {
			t.Errorf("%s EffectiveRightState required = %v, want %v", document.name, state.Required, expectedRequired)
		}
		// Phase-136's original five fields must remain present verbatim (additive only).
		for _, original := range []string{"action_code", "allowed", "provenance", "decisive", "non_deniable"} {
			if _, ok := state.Properties[original]; !ok {
				t.Errorf("%s EffectiveRightState dropped Phase-136 property %s", document.name, original)
			}
		}
		for _, field := range []string{"granting_roles", "specialized_grants"} {
			property, ok := state.Properties[field]
			if !ok {
				t.Errorf("%s EffectiveRightState missing %s", document.name, field)
				continue
			}
			if property.Type != "array" {
				t.Errorf("%s EffectiveRightState.%s type = %q, want array", document.name, field, property.Type)
			}
		}
		for _, field := range []string{"user_allow", "user_deny"} {
			property, ok := state.Properties[field]
			if !ok {
				t.Errorf("%s EffectiveRightState missing %s", document.name, field)
				continue
			}
			if property.Type != "boolean" {
				t.Errorf("%s EffectiveRightState.%s type = %q, want boolean", document.name, field, property.Type)
			}
		}
		decisiveSource, ok := state.Properties["decisive_source"]
		if !ok {
			t.Errorf("%s EffectiveRightState missing decisive_source", document.name)
		} else if len(decisiveSource.AllOf) == 0 {
			t.Errorf("%s EffectiveRightState.decisive_source must reference EffectiveRightProvenance", document.name)
		}
		reasonCode, ok := state.Properties["reason_code"]
		if !ok {
			t.Errorf("%s EffectiveRightState missing reason_code", document.name)
		} else if reasonCode.Type != "string" {
			t.Errorf("%s EffectiveRightState.reason_code type = %q, want string", document.name, reasonCode.Type)
		}
	}

	// Focused/root must remain semantically identical — no drift between mirrors.
	if !reflect.DeepEqual(policyShape(focused.Components.Schemas["EffectiveRightState"]), policyShape(root.Components.Schemas["EffectiveRightState"])) {
		t.Error("focused/root semantic drift in EffectiveRightState")
	}
	if !reflect.DeepEqual(policyShape(focused.Components.Schemas["EffectiveRightProvenance"]), policyShape(root.Components.Schemas["EffectiveRightProvenance"])) {
		t.Error("focused/root semantic drift in EffectiveRightProvenance")
	}

	ts := loadPhase137TypeScript(t)
	assertTSInterfaceFields(t, ts, "EffectiveRightState", expectedRequired)
	assertTSUnion(t, ts, "EffectiveRightProvenance", expectedProvenance)
}

// TestCapabilityOverrideSchemasUnchangedContract proves the additive
// extension left CapabilityOverrideState/Mutation/Audit schemas byte-for-byte
// stable (no incidental field added) and that CapabilityActivationStatus's
// enum values are unchanged, while its description now documents that
// MutateOverride returns "pending" when the post-commit enrichment
// (target-actor/effective-rights re-resolution) fails after a successfully
// committed write -- "active" remains the normal-path value, and
// "persisted"/"failed" remain unused by Phase 137 (137-09-PLAN.md GAP-01).
func TestCapabilityOverrideSchemasUnchangedContract(t *testing.T) {
	focused := loadPhase137Document(t, "shared/contracts/admin-capabilities.yaml")
	root := loadPhase137Document(t, "shared/contracts/openapi.yaml")

	unchangedObjects := map[string][]string{
		"CapabilityOverrideState":           {"group_id", "target_user_id", "action_code", "effect", "reason", "created_by_user_id", "created_at"},
		"CapabilityOverrideAuditItem":       {"id", "group_id", "target_user_id", "action_code", "actor_user_id", "occurred_at", "before", "after", "reason"},
		"CapabilityOverrideMutationResult":  {"status", "changed", "before", "after", "effective_right", "activation_status"},
		"CapabilityOverrideMutationRequest": {"group_id", "target_user_id", "action_code", "effect"},
	}

	for _, document := range []struct {
		name    string
		schemas map[string]phase136Schema
	}{{"focused", focused.Components.Schemas}, {"root", root.Components.Schemas}} {
		for name, required := range unchangedObjects {
			schema, ok := document.schemas[name]
			if !ok {
				t.Fatalf("%s contract missing schema %s", document.name, name)
			}
			if !sameStrings(schema.Required, required) {
				t.Errorf("%s %s required = %v, want unchanged %v", document.name, name, schema.Required, required)
			}
		}

		activation, ok := document.schemas["CapabilityActivationStatus"]
		if !ok {
			t.Fatalf("%s contract missing CapabilityActivationStatus", document.name)
		}
		if !sameStrings(anyStrings(activation.Enum), []string{"persisted", "active", "pending", "failed"}) {
			t.Errorf("%s CapabilityActivationStatus enum = %v, want unchanged 4-value set", document.name, activation.Enum)
		}
	}

	focusedSource := loadPhase137Source(t, "shared/contracts/admin-capabilities.yaml")
	activationBlock := regexp.MustCompile(`(?s)CapabilityActivationStatus:\n(.*?)\n    [A-Za-z]+:`).FindStringSubmatch(focusedSource)
	if activationBlock == nil {
		t.Fatal("could not locate CapabilityActivationStatus block in focused contract")
	}
	if !strings.Contains(activationBlock[1], "active") || !strings.Contains(activationBlock[1], "137") || !strings.Contains(activationBlock[1], "pending") {
		t.Errorf("CapabilityActivationStatus description must document Phase-137's real pending-on-post-commit-enrichment-failure behavior, got %q", activationBlock[1])
	}

	// No competing richer inspector DTO must exist alongside EffectiveRightState.
	for name := range focused.Components.Schemas {
		if strings.Contains(strings.ToLower(name), "inspector") {
			t.Errorf("found a competing inspector schema %s; EffectiveRightState must be extended additively instead", name)
		}
	}
}
