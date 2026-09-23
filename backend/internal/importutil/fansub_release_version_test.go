package importutil

import "testing"

// TestDeriveReleaseVersion covers D-04: a version suffix (v2/v3/v4) at the
// true end of the extension-stripped filename is detected, whether glued
// directly to a preceding bracket/checksum or separated by a dot/hyphen. v1
// is the implicit default and must never be reported as "detected", and a
// v4-shaped substring in the middle of the name must not false-positive.
func TestDeriveReleaseVersion(t *testing.T) {
	tests := []struct {
		name        string
		fileName    string
		wantVersion string
		wantOK      bool
	}{
		{
			name:        "v4 glued directly after a checksum bracket, zero separator, real fixture",
			fileName:    `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv`,
			wantVersion: "v4",
			wantOK:      true,
		},
		{
			name:        "v3 dot-separated",
			fileName:    `Release.Title.v3.mkv`,
			wantVersion: "v3",
			wantOK:      true,
		},
		{
			name:        "v2 hyphen-separated",
			fileName:    `Release-Title-v2.mkv`,
			wantVersion: "v2",
			wantOK:      true,
		},
		{
			name:        "no version suffix at all",
			fileName:    `[SHFS]07-Ghost_01_[H.264][1280x720][3390FBD1].mkv`,
			wantVersion: "",
			wantOK:      false,
		},
		{
			name:        "v1 is the implicit default, never surfaced as detected",
			fileName:    `Release.Title.v1.mkv`,
			wantVersion: "",
			wantOK:      false,
		},
		{
			name:        "v4-shaped substring in the middle of the name, not anchored to the true end",
			fileName:    `Groupv4Release_01.mkv`,
			wantVersion: "",
			wantOK:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotVersion, gotOK := DeriveReleaseVersion(tt.fileName)
			if gotVersion != tt.wantVersion || gotOK != tt.wantOK {
				t.Fatalf("DeriveReleaseVersion(%q) = (%q, %v), want (%q, %v)", tt.fileName, gotVersion, gotOK, tt.wantVersion, tt.wantOK)
			}
		})
	}
}
