package main

import "testing"

func TestIsLocalDevProfile(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		profile string
		want    bool
	}{
		{name: "empty", profile: "", want: true},
		{name: "local", profile: "local", want: true},
		{name: "dev", profile: "dev", want: true},
		{name: "development", profile: "development", want: true},
		{name: "test", profile: "test", want: true},
		{name: "prod", profile: "prod", want: false},
		{name: "production", profile: "production", want: false},
		{name: "stage", profile: "stage", want: false},
		{name: "staging", profile: "staging", want: false},
		{name: "custom", profile: "qa", want: false},
		{name: "trimmed local", profile: " local ", want: true},
		{name: "uppercase local", profile: "LOCAL", want: true},
		{name: "uppercase prod", profile: "PRODUCTION", want: false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := isLocalDevProfile(tc.profile)
			if got != tc.want {
				t.Fatalf("isLocalDevProfile(%q) = %v, want %v", tc.profile, got, tc.want)
			}
		})
	}
}
