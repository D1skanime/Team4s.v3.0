package main

import "testing"

func TestResolveStoredMediaDiskPath(t *testing.T) {
	cases := map[string]string{
		"/media/anime/1/background/x/original.jpg":     "/app/media/anime/1/background/x/original.jpg",
		"/media/profile/4/avatar/y/original.png":       "/app/media/profile/4/avatar/y/original.png",
		"/app/media/release-version/27/z/original.png": "/app/media/release-version/27/z/original.png",
		"anime/2/cover/w/original.jpg":                 "/app/media/anime/2/cover/w/original.jpg",
	}
	for stored, want := range cases {
		if got := resolveStoredMediaDiskPath("/app/media", stored); got != want {
			t.Errorf("resolveStoredMediaDiskPath(%q) = %q, want %q", stored, got, want)
		}
	}
}
