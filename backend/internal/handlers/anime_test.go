package handlers

import "testing"

func TestIsValidLetter(t *testing.T) {
	tests := []struct {
		name   string
		letter string
		valid  bool
	}{
		{name: "empty", letter: "", valid: true},
		{name: "single letter", letter: "A", valid: true},
		{name: "number class", letter: "0", valid: true},
		{name: "lowercase invalid", letter: "a", valid: false},
		{name: "too long", letter: "AB", valid: false},
		{name: "special char", letter: "-", valid: false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := isValidLetter(tc.letter); got != tc.valid {
				t.Fatalf("expected %v, got %v for %q", tc.valid, got, tc.letter)
			}
		})
	}
}

func TestParsePositiveInt(t *testing.T) {
	if _, err := parsePositiveInt("0"); err == nil {
		t.Fatalf("expected error for zero")
	}

	if _, err := parsePositiveInt("-2"); err == nil {
		t.Fatalf("expected error for negative number")
	}

	value, err := parsePositiveInt("12")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if value != 12 {
		t.Fatalf("expected 12, got %d", value)
	}
}

func TestParseAnimeID(t *testing.T) {
	if _, err := parseAnimeID("0"); err == nil {
		t.Fatalf("expected error for zero anime id")
	}

	if _, err := parseAnimeID("abc"); err == nil {
		t.Fatalf("expected error for non-number anime id")
	}

	value, err := parseAnimeID("42")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if value != 42 {
		t.Fatalf("expected 42, got %d", value)
	}
}

func TestParseOptionalBoolQuery(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		want     bool
		hasError bool
	}{
		{name: "empty defaults false", raw: "", want: false, hasError: false},
		{name: "true", raw: "true", want: true, hasError: false},
		{name: "false", raw: "false", want: false, hasError: false},
		{name: "trimmed true", raw: "  true ", want: true, hasError: false},
		{name: "invalid", raw: "maybe", want: false, hasError: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, err := parseOptionalBoolQuery(tc.raw)
			if tc.hasError {
				if err == nil {
					t.Fatalf("expected error for %q", tc.raw)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}
