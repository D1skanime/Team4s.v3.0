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

func TestRVMFileRejectionAnimatedWebP(t *testing.T) {
	message, code, rejected := rvmFileRejection("image/webp", webpHeader("VP8X", 0x02))
	if !rejected || code != "ANIMATED_WEBP_UNSUPPORTED" || message != animatedWebPMessage {
		t.Fatalf("animiertes WebP muss mit klarer Meldung abgelehnt werden: %q %q %v", message, code, rejected)
	}
	if _, _, rejected := rvmFileRejection("image/webp", webpHeader("VP8 ", 0x00)); rejected {
		t.Fatal("statisches WebP muss erlaubt bleiben")
	}
}
