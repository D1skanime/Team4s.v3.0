package repository

import "testing"

func TestCanonicalSegmentTypePrecedence(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "opening", input: "Opening 1", want: "OP"},
		{name: "insert before ed substring", input: "Insert-Lied", want: "INSERT"},
		{name: "ending", input: "Ending 1", want: "ED"},
		{name: "outro", input: "Outro", want: "ED"},
		{name: "karaoke", input: "Karaoke", want: "KARA"},
		{name: "fallback", input: "Middle", want: "MIDDLE"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := CanonicalSegmentType(test.input); got != test.want {
				t.Fatalf("CanonicalSegmentType(%q) = %q, want %q", test.input, got, test.want)
			}
		})
	}
}
