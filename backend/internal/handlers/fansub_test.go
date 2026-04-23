package handlers

import (
	"encoding/json"
	"reflect"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestValidateFansubGroupCreateRequest(t *testing.T) {
	founded := int32(2010)
	dissolved := int32(2015)
	groupType := "collaboration"

	input, message := validateFansubGroupCreateRequest(fansubGroupCreateRequest{
		Slug:          " gax ",
		Name:          " Group A ",
		Status:        "active",
		GroupType:     &groupType,
		FoundedYear:   &founded,
		DissolvedYear: &dissolved,
	})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if input.Slug != "gax" {
		t.Fatalf("expected normalized slug, got %q", input.Slug)
	}
	if input.Name != "Group A" {
		t.Fatalf("expected normalized name, got %q", input.Name)
	}
	if input.GroupType != models.FansubGroupTypeCollaboration {
		t.Fatalf("expected group_type collaboration, got %q", input.GroupType)
	}
}

func TestValidateFansubGroupCreateRequest_InvalidYearRange(t *testing.T) {
	founded := int32(2020)
	dissolved := int32(2019)

	_, message := validateFansubGroupCreateRequest(fansubGroupCreateRequest{
		Slug:          "gax",
		Name:          "Group A",
		Status:        "active",
		FoundedYear:   &founded,
		DissolvedYear: &dissolved,
	})
	if message != "dissolved_year muss groesser oder gleich founded_year sein" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateFansubGroupCreateRequest_InvalidGroupType(t *testing.T) {
	groupType := "invalid"

	_, message := validateFansubGroupCreateRequest(fansubGroupCreateRequest{
		Slug:      "gax",
		Name:      "Group A",
		Status:    "active",
		GroupType: &groupType,
	})
	if message != "ungueltiger group_type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateFansubGroupPatchRequest_GroupTypeOnly(t *testing.T) {
	var patch models.FansubGroupPatchInput
	if err := json.Unmarshal([]byte(`{"group_type":"collaboration"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateFansubGroupPatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.GroupType.Set || validated.GroupType.Value == nil {
		t.Fatalf("expected group_type to be set")
	}
	if *validated.GroupType.Value != "collaboration" {
		t.Fatalf("expected group_type collaboration, got %q", *validated.GroupType.Value)
	}
}

func TestValidateFansubGroupPatchRequest_InvalidGroupType(t *testing.T) {
	var patch models.FansubGroupPatchInput
	if err := json.Unmarshal([]byte(`{"group_type":"invalid"}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	_, message := validateFansubGroupPatchRequest(patch)
	if message != "ungueltiger group_type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateFansubMemberPatchRequest_RequiresField(t *testing.T) {
	_, message := validateFansubMemberPatchRequest(models.FansubMemberPatchInput{})
	if message != "mindestens ein feld ist erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateEpisodeVersionPatchRequest_AcceptsNullableFields(t *testing.T) {
	var patch models.EpisodeVersionPatchInput
	if err := json.Unmarshal([]byte(`{"subtitle_type":null,"stream_url":null}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateEpisodeVersionPatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.SubtitleType.Set || validated.SubtitleType.Value != nil {
		t.Fatalf("expected subtitle_type to be set with nil value")
	}
	if !validated.StreamURL.Set || validated.StreamURL.Value != nil {
		t.Fatalf("expected stream_url to be set with nil value")
	}
}

func TestValidateEpisodeVersionCreateRequest_InvalidSubtitleType(t *testing.T) {
	_, message := validateEpisodeVersionCreateRequest(episodeVersionCreateRequest{
		MediaProvider: "emby",
		MediaItemID:   "6425",
		SubtitleType:  ptrString("dub"),
	})
	if message != "ungueltiger subtitle_type parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestValidateEpisodeVersionCreateRequest_AcceptsExplicitFansubGroups(t *testing.T) {
	input, message := validateEpisodeVersionCreateRequest(episodeVersionCreateRequest{
		MediaProvider: "emby",
		MediaItemID:   "6425",
		FansubGroups: []models.SelectedFansubGroupInput{
			{ID: ptrInt64(12)},
			{Name: ptrString(" FlameHazeSubs "), Slug: ptrString(" flamehazesubs ")},
		},
	})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if len(input.FansubGroups) != 2 {
		t.Fatalf("expected 2 selected groups, got %d", len(input.FansubGroups))
	}
	if input.FansubGroups[1].Name == nil || *input.FansubGroups[1].Name != "FlameHazeSubs" {
		t.Fatalf("expected trimmed typed group name, got %#v", input.FansubGroups[1].Name)
	}
}

func TestValidateEpisodeVersionPatchRequest_AcceptsExplicitFansubGroups(t *testing.T) {
	var patch models.EpisodeVersionPatchInput
	if err := json.Unmarshal([]byte(`{"fansub_groups":[{"id":3},{"name":" TestGruppe "} ]}`), &patch); err != nil {
		t.Fatalf("unmarshal patch: %v", err)
	}

	validated, message := validateEpisodeVersionPatchRequest(patch)
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if !validated.FansubGroups.Set || len(validated.FansubGroups.Value) != 2 {
		t.Fatalf("expected validated selected groups, got %#v", validated.FansubGroups)
	}
	if validated.FansubGroups.Value[1].Name == nil || *validated.FansubGroups.Value[1].Name != "TestGruppe" {
		t.Fatalf("expected trimmed typed group name, got %#v", validated.FansubGroups.Value[1].Name)
	}
}

func TestValidateFansubAliasCreateRequest(t *testing.T) {
	input, message := validateFansubAliasCreateRequest(fansubAliasCreateRequest{
		Alias: " B-SH ",
	})
	if message != "" {
		t.Fatalf("expected no validation error, got %q", message)
	}
	if input.Alias != "B-SH" {
		t.Fatalf("expected trimmed alias, got %q", input.Alias)
	}
	if input.NormalizedAlias != "bsh" {
		t.Fatalf("expected normalized alias bsh, got %q", input.NormalizedAlias)
	}
}

func TestExtractReleaseGroupAliasCandidates(t *testing.T) {
	candidates := extractReleaseGroupAliasCandidates(
		"11 eyes OVA.Bonus.S00E01-strawhat",
		`/media/Anime/Bonus/Anime.Bonus.Sub/11 eyes OVA/11 eyes OVA.Bonus.S00E01--B-SH.mkv`,
	)
	expected := []string{"bsh", "strawhat"}
	if !reflect.DeepEqual(candidates, expected) {
		t.Fatalf("unexpected candidates: got=%v want=%v", candidates, expected)
	}
}

func TestFansubAliasResolverResolve(t *testing.T) {
	resolver := newFansubAliasResolver([]models.AnimeFansubAliasCandidate{
		{FansubGroupID: 10, Alias: "strawhat"},
		{FansubGroupID: 11, Alias: "B-SH"},
	})

	groupID := resolver.Resolve(
		"11 eyes OVA.Bonus.S00E01-strawhat",
		`/media/Anime/Bonus/Anime.Bonus.Sub/11 eyes OVA/11 eyes OVA.Bonus.S00E01--B-SH.mkv`,
	)
	if groupID == nil {
		t.Fatalf("expected matched group id")
	}
	if *groupID != 11 {
		t.Fatalf("expected group id 11 from path suffix, got %d", *groupID)
	}
}

func ptrString(value string) *string {
	return &value
}

func ptrInt64(value int64) *int64 {
	return &value
}
