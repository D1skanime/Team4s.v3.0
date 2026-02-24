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

	input, message := validateFansubGroupCreateRequest(fansubGroupCreateRequest{
		Slug:          " gax ",
		Name:          " Group A ",
		Status:        "active",
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
