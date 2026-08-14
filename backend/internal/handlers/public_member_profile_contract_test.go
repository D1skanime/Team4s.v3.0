package handlers

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"

	"team4s.v3/backend/internal/models"
)

// forbiddenPublicProfileFields is the authoritative negative list (130-D-08): internal
// identity, permission, storage, and source-original fields that MUST NEVER appear anywhere
// in a serialized public member profile. The test names the leaking field on failure.
var forbiddenPublicProfileFields = []string{
	"email", "keycloak_subject", "app_user_id", "legacy_user_id",
	"app_member_status", "app_member_roles", "historical_member_status",
	"source_original_url", "storage_path",
	"can_view_own_profile", "can_edit_own_profile", "can_upload_own_avatar",
	"can_open_keycloak_account", "can_view_memberships", "can_view_historical_credits",
}

func strPtr(v string) *string { return &v }
func i64Ptr(v int64) *int64   { return &v }
func i32Ptr(v int32) *int32   { return &v }

// fullyPopulatedPublicMemberProfile builds a public profile with every sub-shape populated,
// including a platinum-tier badge, so the contract asserts run against a realistic response.
func fullyPopulatedPublicMemberProfile() models.PublicMemberProfile {
	return models.PublicMemberProfile{
		MemberID:          2,
		Slug:              "sheppert",
		FansubName:        "Sheppert",
		Bio:               strPtr("Timing und Typesetting."),
		MemberStoryHTML:   strPtr("<p>Story</p>"),
		ActiveFromYear:    i32Ptr(2016),
		IsCurrentlyActive: true,
		Noindex:           false,
		IsVerified:        true,
		ProfileStatus:     "active",
		ProfileVisibility: "public",
		Avatar:            &models.MemberProfileAvatar{PublicURL: "/media/profile/2/avatar/current/display.png"},
		BackgroundImage:   &models.PublicMemberProfileBackgroundImage{PublicURL: "/media/profile/2/background/current/display.jpg"},
		Memberships: []models.PublicMemberMembership{{
			FansubGroupID:     7,
			FansubGroupName:   "Tsuki no Fansubs",
			FansubGroupSlug:   "tsuki-no-fansubs",
			LogoURL:           strPtr("/media/groups/7/logo.png"),
			GroupStatus:       "active",
			JoinedYear:        i32Ptr(2016),
			IsCurrent:         true,
			Roles:             []models.PublicMemberRole{{Code: "timer", LabelDe: "Timing"}},
			HasHistoricalLink: true,
		}},
		PublicBadges: []models.PublicMemberBadge{{
			ID:            1,
			BadgeCode:     "role_platinum_timer",
			BadgeCategory: "role_entry",
			CurrentCount:  i64Ptr(120),
			CurrentTier:   strPtr("platinum"),
			NextTier:      strPtr("platinum"),
		}},
		BadgeProgress: []models.PublicMemberBadgeProgress{{
			Family:         "contribution_projects",
			CurrentCount:   5,
			NextThreshold:  i64Ptr(15),
			RemainingCount: i64Ptr(10),
			NextTier:       strPtr("gold"),
		}},
		TotalPoints: 2840,
		CurrentProjects: []models.PublicMemberCurrentProject{{
			AnimeID:            12,
			AnimeTitle:         "Frieren",
			FansubGroupID:      7,
			FansubGroupName:    "Tsuki no Fansubs",
			Roles:              []models.PublicMemberRole{{Code: "timer", LabelDe: "Timing"}},
			ReleaseVersions:    []models.PublicMemberProjectReleaseVersion{},
			ContributionStatus: "confirmed",
		}},
		CurrentProjectsCount: 1,
		LatestContributions: []models.PublicMemberLatestContribution{{
			Type:       "text",
			ID:         3,
			AnimeID:    12,
			AnimeTitle: "Frieren",
		}},
		PreviousContributions: []models.PublicMemberPreviousContribution{{
			AnimeID:         9,
			AnimeTitle:      "Aeltere Serie",
			FansubGroupID:   7,
			FansubGroupName: "Tsuki no Fansubs",
			Roles:           []models.PublicMemberRole{},
			EndedYear:       2015,
		}},
		PreviousContributionsCount: 1,
	}
}

func collectJSONKeys(v interface{}, out map[string]bool) {
	switch t := v.(type) {
	case map[string]interface{}:
		for k, val := range t {
			out[k] = true
			collectJSONKeys(val, out)
		}
	case []interface{}:
		for _, val := range t {
			collectJSONKeys(val, out)
		}
	}
}

func marshalPublicProfileTree(t *testing.T) map[string]interface{} {
	t.Helper()
	raw, err := json.Marshal(fullyPopulatedPublicMemberProfile())
	require.NoError(t, err)
	var top map[string]interface{}
	require.NoError(t, json.Unmarshal(raw, &top))
	return top
}

// TestPublicMemberProfileForbiddenFieldsAbsent proves PMCT-02: no internal field leaks anywhere
// in the serialized public profile, at any nesting depth.
func TestPublicMemberProfileForbiddenFieldsAbsent(t *testing.T) {
	top := marshalPublicProfileTree(t)
	keys := map[string]bool{}
	collectJSONKeys(top, keys)
	for _, f := range forbiddenPublicProfileFields {
		require.Falsef(t, keys[f], "forbidden field %q leaked into the public member profile JSON", f)
	}
}

func openAPISchemas(t *testing.T) map[string]interface{} {
	t.Helper()
	raw, err := os.ReadFile("../../../shared/contracts/openapi.yaml")
	require.NoError(t, err)
	var doc map[string]interface{}
	require.NoError(t, yaml.Unmarshal(raw, &doc))
	comps, ok := doc["components"].(map[string]interface{})
	require.True(t, ok, "components missing")
	schemas, ok := comps["schemas"].(map[string]interface{})
	require.True(t, ok, "components.schemas missing")
	return schemas
}

func declaredProperties(t *testing.T, schemas map[string]interface{}, name string) map[string]bool {
	t.Helper()
	schema, ok := schemas[name].(map[string]interface{})
	require.Truef(t, ok, "schema %q missing", name)
	props, ok := schema["properties"].(map[string]interface{})
	require.Truef(t, ok, "schema %q has no properties", name)
	out := map[string]bool{}
	for k := range props {
		out[k] = true
	}
	return out
}

func requireKeysSubset(t *testing.T, obj map[string]interface{}, declared map[string]bool, schemaName string) {
	t.Helper()
	for k := range obj {
		require.Truef(t, declared[k], "serialized key %q is not a declared property of OpenAPI %s", k, schemaName)
	}
}

// TestPublicMemberProfileMatchesOpenAPIAllowList proves PMCT-03: every serialized key of the
// public profile and of the D-01 forked sub-shapes is a documented OpenAPI property.
func TestPublicMemberProfileMatchesOpenAPIAllowList(t *testing.T) {
	schemas := openAPISchemas(t)
	top := marshalPublicProfileTree(t)

	requireKeysSubset(t, top, declaredProperties(t, schemas, "PublicMemberProfileData"), "PublicMemberProfileData")

	memberships, ok := top["memberships"].([]interface{})
	require.True(t, ok && len(memberships) > 0, "memberships not populated")
	membership, ok := memberships[0].(map[string]interface{})
	require.True(t, ok, "membership not an object")
	requireKeysSubset(t, membership, declaredProperties(t, schemas, "PublicMemberMembership"), "PublicMemberMembership")

	background, ok := top["background_image"].(map[string]interface{})
	require.True(t, ok, "background_image not an object")
	requireKeysSubset(t, background, declaredProperties(t, schemas, "PublicMemberProfileBackgroundImage"), "PublicMemberProfileBackgroundImage")
}

// TestPublicBadgeNextTierEnumParity proves PMCT-05/D-06: the badge next_tier enum includes
// platinum in OpenAPI and stays in parity with the frontend TypeScript union.
func TestPublicBadgeNextTierEnumParity(t *testing.T) {
	schemas := openAPISchemas(t)
	badge, ok := schemas["PublicMemberBadge"].(map[string]interface{})
	require.True(t, ok, "PublicMemberBadge schema missing")
	props := badge["properties"].(map[string]interface{})
	nextTier := props["next_tier"].(map[string]interface{})
	enumVals, ok := nextTier["enum"].([]interface{})
	require.True(t, ok, "next_tier enum missing")
	got := map[string]bool{}
	for _, e := range enumVals {
		got[e.(string)] = true
	}
	for _, want := range []string{"bronze", "silver", "gold", "platinum"} {
		require.Truef(t, got[want], "OpenAPI PublicMemberBadge.next_tier is missing %q", want)
	}

	ts, err := os.ReadFile("../../../frontend/src/types/profile.ts")
	require.NoError(t, err)
	require.Containsf(t, string(ts),
		"next_tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null",
		"frontend PublicMemberBadge.next_tier union is out of parity with the OpenAPI enum")
}
