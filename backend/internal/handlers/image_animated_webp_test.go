package handlers

import "testing"

func webpHeader(chunk string, flags byte) []byte {
	head := append([]byte("RIFF"), 0, 0, 0, 0)
	head = append(head, []byte("WEBP"+chunk)...)
	head = append(head, 10, 0, 0, 0)
	return append(head, flags, 0, 0, 0)
}

func TestIsAnimatedWebP(t *testing.T) {
	cases := []struct {
		name string
		head []byte
		want bool
	}{
		{"animiertes VP8X", webpHeader("VP8X", 0x02), true},
		{"VP8X mit Alpha, nicht animiert", webpHeader("VP8X", 0x10), false},
		{"einfaches VP8", webpHeader("VP8 ", 0x00), false},
		{"verlustfreies VP8L", webpHeader("VP8L", 0x00), false},
		{"kein WebP", []byte("PNG-Datei-ohne-RIFF-Header-xxxx"), false},
		{"zu kurz", []byte("RIFF"), false},
	}
	for _, tc := range cases {
		if got := isAnimatedWebP(tc.head); got != tc.want {
			t.Errorf("%s: isAnimatedWebP = %v, want %v", tc.name, got, tc.want)
		}
	}
}

// TestRVMFileRejectionAcceptsAnimatedWebP belegt D-20 (Nutzervorgabe 2026-10-02): Release-Version-
// Media kennt keinen asset_type=segment_preview (das Kara-Vorschaubild laeuft ausschliesslich
// ueber den globalen Uploader, media_upload.go), daher darf animiertes WebP hier nicht mehr
// abgelehnt werden -- weder animiert noch statisch.
func TestRVMFileRejectionAcceptsAnimatedWebP(t *testing.T) {
	if _, _, rejected := rvmFileRejection("image/webp", webpHeader("VP8X", 0x02)); rejected {
		t.Fatal("animiertes WebP muss ausserhalb des Kara-Vorschaubilds erlaubt sein (D-20)")
	}
	if _, _, rejected := rvmFileRejection("image/webp", webpHeader("VP8 ", 0x00)); rejected {
		t.Fatal("statisches WebP muss erlaubt bleiben")
	}
}
