package repository

import (
	"testing"

	"team4s.v3/backend/internal/permissions"
)

func playbackRule(subject, role, effect, scope string, groupID *int64) releasePlaybackRule {
	return releasePlaybackRule{SubjectType: subject, SubjectRoleCode: role, Effect: effect, ScopeType: scope, FansubGroupID: groupID}
}

func TestEvaluateReleasePlaybackRules(t *testing.T) {
	groupOne, groupTwo := int64(11), int64(22)
	roles := map[int64]map[string]struct{}{
		groupOne: {"translator": {}},
		groupTwo: {"timer": {}},
	}
	allRoles := map[string]struct{}{"translator": {}, "timer": {}}

	tests := []struct {
		name        string
		rules       []releasePlaybackRule
		allowed     bool
		winning     string
		subjectType string
	}{
		{name: "no rule denies"},
		{name: "global inherited allow", rules: []releasePlaybackRule{playbackRule("role", "translator", "allow", "global", nil)}, allowed: true, winning: "global", subjectType: "role"},
		{name: "specific release allow overrides global deny", rules: []releasePlaybackRule{
			playbackRule("role", "translator", "deny", "global", nil),
			playbackRule("role", "translator", "allow", "release", nil),
		}, allowed: true, winning: "release", subjectType: "role"},
		{name: "specific release deny overrides project allow", rules: []releasePlaybackRule{
			playbackRule("role", "translator", "allow", "project", &groupOne),
			playbackRule("role", "translator", "deny", "release", nil),
		}, winning: "release", subjectType: "role"},
		{name: "direct user wins equal scope role deny", rules: []releasePlaybackRule{
			playbackRule("role", "translator", "deny", "project", &groupOne),
			playbackRule("app_user", "", "allow", "project", &groupOne),
		}, allowed: true, winning: "project", subjectType: "app_user"},
		{name: "role deny wins equal scope role conflict", rules: []releasePlaybackRule{
			playbackRule("role", "translator", "allow", "release", nil),
			playbackRule("role", "timer", "deny", "release", nil),
		}, winning: "release", subjectType: "role"},
		{name: "cooperation group role applies in its own group", rules: []releasePlaybackRule{
			playbackRule("role", "timer", "allow", "group", &groupTwo),
		}, allowed: true, winning: "group", subjectType: "role"},
		{name: "cross group role does not leak", rules: []releasePlaybackRule{
			playbackRule("role", "translator", "allow", "group", &groupTwo),
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := evaluateReleasePlaybackRules(tt.rules, roles, allRoles)
			if got.Allowed != tt.allowed || got.WinningScope != tt.winning || got.SubjectType != tt.subjectType {
				t.Fatalf("decision = %+v, want allowed=%v scope=%q subject=%q", got, tt.allowed, tt.winning, tt.subjectType)
			}
		})
	}
}

func TestReleasePlaybackScopeSpecificityOrder(t *testing.T) {
	for scope, want := range map[string]int{
		permissions.ScopeTypeGlobal: 0, permissions.ScopeTypeGroup: 1,
		permissions.ScopeTypeProject: 2, permissions.ScopeTypeRelease: 3,
	} {
		got := map[string]int{"global": 0, "group": 1, "project": 2, "release": 3}[scope]
		if got != want {
			t.Fatalf("scope %q specificity = %d, want %d", scope, got, want)
		}
	}
}
