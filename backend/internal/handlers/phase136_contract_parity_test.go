package handlers

import (
	"encoding/json"
	"reflect"
	"sort"
	"strings"
	"testing"
)

func TestPhase136ContractParity(t *testing.T) {
	t.Run("Go DTO JSON shapes", func(t *testing.T) {
		cases := []struct {
			value any
			fields map[string]bool
		}{
			{EffectiveRightState{}, requiredFields("action_code", "allowed", "provenance", "decisive", "non_deniable")},
			{CapabilityOverrideState{}, requiredFields("group_id", "target_user_id", "action_code", "effect", "reason", "created_by_user_id", "created_at")},
			{CapabilityOverrideImpactItem{}, requiredFields("target_user_id", "before", "after")},
			{CapabilityOverrideImpactPreview{}, requiredFields("affected_user_count", "items")},
			{CapabilityOverrideAuditItem{}, requiredFields("id", "group_id", "target_user_id", "action_code", "actor_user_id", "occurred_at", "before", "after", "reason")},
			{CapabilityOverrideMutationResult{}, requiredFields("status", "changed", "before", "after", "effective_right", "activation_status")},
			{NonPlatformAdminOverrideMutationRequest{}, requiredFields("group_id", "target_user_id", "action_code", "effect", "actor_is_platform_admin", "reason")},
			{PlatformAdminOverrideMutationRequest{}, fieldsWithOptional("reason", "group_id", "target_user_id", "action_code", "effect", "actor_is_platform_admin")},
		}
		for _, testCase := range cases {
			assertPolicyJSONShape(t, testCase.value, testCase.fields)
		}
	})

	t.Run("nullable and optional fields use pointers", func(t *testing.T) {
		assertPolicyPointerFields(t, CapabilityOverrideAuditItem{}, "before", "after", "reason")
		assertPolicyPointerFields(t, CapabilityOverrideMutationResult{}, "before", "after")
		assertPolicyPointerFields(t, NonPlatformAdminOverrideMutationRequest{}, "effect")
		assertPolicyPointerFields(t, PlatformAdminOverrideMutationRequest{}, "effect", "reason")
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

	t.Run("platform admin reason omission differs from supplied reason", func(t *testing.T) {
		withoutReason, err := json.Marshal(PlatformAdminOverrideMutationRequest{})
		if err != nil {
			t.Fatal(err)
		}
		if jsonContainsKey(t, withoutReason, "reason") {
			t.Fatalf("omitted platform-admin reason encoded as %s", withoutReason)
		}
		reason := CapabilityOverrideReason{Category: CapabilityOverrideReasonRoleGap}
		withReason, err := json.Marshal(PlatformAdminOverrideMutationRequest{Reason: &reason})
		if err != nil {
			t.Fatal(err)
		}
		if !jsonContainsKey(t, withReason, "reason") {
			t.Fatalf("supplied platform-admin reason omitted from %s", withReason)
		}
	})
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
