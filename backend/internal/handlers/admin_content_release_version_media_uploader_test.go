package handlers

import "testing"

func TestIsReleaseVersionMediaUploader(t *testing.T) {
	seven := int64(7)
	cases := []struct {
		name     string
		uploaded *int64
		actor    int64
		want     bool
	}{
		{"uploader edits own medium", &seven, 7, true},
		{"group lead edits someone else's medium", &seven, 2, false},
		{"legacy row without uploader", nil, 7, false},
		{"actor without legacy user id", &seven, 0, false},
	}
	for _, tc := range cases {
		if got := isReleaseVersionMediaUploader(tc.uploaded, tc.actor); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
