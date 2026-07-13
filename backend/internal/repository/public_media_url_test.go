package repository

import "testing"

func TestPublicMediaURLForPath_PreservesAPIProxyPaths(t *testing.T) {
	url := publicMediaURLForPath("/api/v1/media/image?item_id=abc&kind=banner&provider=jellyfin", "")
	if url == nil {
		t.Fatalf("expected api proxy url")
	}
	if *url != "/api/v1/media/image?item_id=abc&kind=banner&provider=jellyfin" {
		t.Fatalf("expected api proxy path to be preserved, got %q", *url)
	}
}

func TestPublicMediaURLForPath_NormalizesLocalMediaPaths(t *testing.T) {
	url := publicMediaURLForPath("/app/media/anime/13/banner/original.jpg", "/app/media")
	if url == nil {
		t.Fatalf("expected local media url")
	}
	if *url != "/media/anime/13/banner/original.jpg" {
		t.Fatalf("expected normalized media path, got %q", *url)
	}
}
