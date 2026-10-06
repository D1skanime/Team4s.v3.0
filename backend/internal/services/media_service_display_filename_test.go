package services

import "testing"

func TestDisplayVariantFileNameIsUniquePerOriginal(t *testing.T) {
	cases := []struct {
		original string
		ext      string
		want     string
	}{
		{"/app/media/fansub/1/banner_1791271982543_f2780223f5863ac0.png", "jpg", "banner_1791271982543_f2780223f5863ac0_display.jpg"},
		{"/app/media/fansub/1/image_1791272838274_a9ad59238893a176.jpg", "jpg", "image_1791272838274_a9ad59238893a176_display.jpg"},
		{"/app/media/fansub/1/logo_1791272001981_fa0c433291a34d56.png", "png", "logo_1791272001981_fa0c433291a34d56_display.png"},
		{"/media/anime/11/background/207133f5/original.jpg", "jpg", "display.jpg"},
		{"/media/anime/1/segment_preview/a364/original.png", "webp", "display.webp"},
	}
	for _, tc := range cases {
		if got := displayVariantFileName(tc.original, tc.ext); got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.original, got, tc.want)
		}
	}
	banner := displayVariantFileName("/app/media/fansub/1/banner_a.png", "jpg")
	gallery := displayVariantFileName("/app/media/fansub/1/image_b.jpg", "jpg")
	if banner == gallery {
		t.Fatalf("banner and gallery image in the same group folder must not share a display file: %q", banner)
	}
}
