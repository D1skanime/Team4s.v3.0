package handlers

import "testing"

// Phase 176, Scope Addition 2: validateFansubGroupCreateRequest's Kürzel
// handling must mirror the Patch path's normalization (trim, empty -> nil,
// reject anything over 32 runes) -- these are pure-function assertions that
// call the real validator, not a source-text/string-match check.

func baseFansubGroupCreateRequest() fansubGroupCreateRequest {
	return fansubGroupCreateRequest{
		Slug:   "group-a",
		Name:   "Group A",
		Status: "active",
	}
}

func kuerzelTestStrPtr(value string) *string { return &value }

func TestValidateFansubGroupCreateRequest_KuerzelOmittedStaysNil(t *testing.T) {
	input, msg := validateFansubGroupCreateRequest(baseFansubGroupCreateRequest())
	if msg != "" {
		t.Fatalf("expected no validation error, got %q", msg)
	}
	if input.Kuerzel != nil {
		t.Fatalf("expected Kuerzel to stay nil, got %q", *input.Kuerzel)
	}
}

func TestValidateFansubGroupCreateRequest_KuerzelEmptyStringBecomesNil(t *testing.T) {
	req := baseFansubGroupCreateRequest()
	req.Kuerzel = kuerzelTestStrPtr("   ")

	input, msg := validateFansubGroupCreateRequest(req)
	if msg != "" {
		t.Fatalf("expected no validation error, got %q", msg)
	}
	if input.Kuerzel != nil {
		t.Fatalf("expected whitespace-only Kuerzel to normalize to nil, got %q", *input.Kuerzel)
	}
}

func TestValidateFansubGroupCreateRequest_KuerzelTrimmedAndKept(t *testing.T) {
	req := baseFansubGroupCreateRequest()
	req.Kuerzel = kuerzelTestStrPtr("  BDnP  ")

	input, msg := validateFansubGroupCreateRequest(req)
	if msg != "" {
		t.Fatalf("expected no validation error, got %q", msg)
	}
	if input.Kuerzel == nil || *input.Kuerzel != "BDnP" {
		t.Fatalf("expected trimmed Kuerzel %q, got %v", "BDnP", input.Kuerzel)
	}
}

func TestValidateFansubGroupCreateRequest_KuerzelTooLongRejected(t *testing.T) {
	req := baseFansubGroupCreateRequest()
	req.Kuerzel = kuerzelTestStrPtr("123456789012345678901234567890123") // 33 runes

	_, msg := validateFansubGroupCreateRequest(req)
	if msg != "ungültiger kuerzel parameter" {
		t.Fatalf("expected the kuerzel length rejection message, got %q", msg)
	}
}
