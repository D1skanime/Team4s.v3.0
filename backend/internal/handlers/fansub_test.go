package handlers

import (
	"encoding/json"
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

func ptrString(value string) *string {
	return &value
}
