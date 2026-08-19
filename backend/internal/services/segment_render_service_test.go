package services

import (
	"strings"
	"testing"
)

func TestValidateDerivedSegmentWindowRejectsLongSegments(t *testing.T) {
	if err := ValidateDerivedSegmentWindow(0, 241, 240); err == nil {
		t.Fatal("expected >4 minute segment to be rejected")
	}
	if err := ValidateDerivedSegmentWindow(0, 240, 240); err != nil {
		t.Fatalf("expected exactly 4 minute segment to pass, got %v", err)
	}
}

func TestBuildSegmentRenderCacheKeyChangesWithSourceWindowAndProfile(t *testing.T) {
	base := SegmentRenderWindow{
		SegmentID:      1,
		SourceKind:     "episode_version",
		SourceIdentity: "variant:1:jellyfin:abc",
		StartSeconds:   0,
		EndSeconds:     80,
		RenderProfile:  DefaultSegmentRenderProfile,
	}
	first, err := BuildSegmentRenderCacheKey(base)
	if err != nil {
		t.Fatalf("build cache key: %v", err)
	}
	second, err := BuildSegmentRenderCacheKey(base)
	if err != nil {
		t.Fatalf("build cache key second: %v", err)
	}
	if first != second {
		t.Fatalf("expected deterministic key, got %q and %q", first, second)
	}

	changed := base
	changed.EndSeconds = 81
	changedKey, err := BuildSegmentRenderCacheKey(changed)
	if err != nil {
		t.Fatalf("build changed key: %v", err)
	}
	if first == changedKey {
		t.Fatal("expected cache key to change when window changes")
	}

	changed = base
	changed.SourceIdentity = "variant:2:jellyfin:def"
	changedKey, err = BuildSegmentRenderCacheKey(changed)
	if err != nil {
		t.Fatalf("build changed source key: %v", err)
	}
	if first == changedKey {
		t.Fatal("expected cache key to change when source changes")
	}
}

func TestSelectSegmentSubtitleStreamPrefersDefaultSuitableSubtitle(t *testing.T) {
	streams := []SegmentProbeMediaStream{
		{Index: 0, Type: "Video", Codec: "h264"},
		{Index: 1, Type: "Subtitle", Codec: "subrip"},
		{Index: 2, Type: "Subtitle", Codec: "ass", IsDefault: true},
	}

	selected := SelectSegmentSubtitleStream(streams)
	if selected == nil {
		t.Fatal("expected subtitle stream")
	}
	if selected.Index != 2 {
		t.Fatalf("expected default ASS subtitle index 2, got %d", selected.Index)
	}
}

func TestBuildFFmpegSegmentArgsMapsVideoAudioAndBurnsSubtitle(t *testing.T) {
	args, err := BuildFFmpegSegmentArgs(SegmentRenderCommandInput{
		FFmpegPath:       "/usr/bin/ffmpeg",
		StreamURL:        "http://jellyfin/Videos/abc/stream?api_key=secret",
		SubtitleFilePath: "/work/ep01.ass",
		OutputPath:       "/cache/clip.mp4",
		StartSeconds:     10,
		DurationSeconds:  80,
	})
	if err != nil {
		t.Fatalf("build ffmpeg args: %v", err)
	}
	joined := strings.Join(args, " ")
	required := []string{
		"-ss 10",
		"-t 80",
		"-map 0:v:0",
		"-map 0:a:0",
		"-c:v libx264",
		"-pix_fmt yuv420p",
		"-c:a aac",
		"-vf subtitles='/work/ep01.ass'",
		"/cache/clip.mp4",
	}
	for _, fragment := range required {
		if !strings.Contains(joined, fragment) {
			t.Fatalf("ffmpeg args missing %q in %q", fragment, joined)
		}
	}
	if strings.Contains(joined, " -an ") {
		t.Fatalf("ffmpeg args must not disable audio: %q", joined)
	}
}

func TestSanitizeSegmentRenderLogRedactsSecrets(t *testing.T) {
	raw := "ffmpeg http://jellyfin/Videos/abc/stream?api_key=super-secret&x=1 X-MediaBrowser-Token: other-secret"
	clean := SanitizeSegmentRenderLog(raw, "super-secret", "other-secret")
	if strings.Contains(clean, "super-secret") || strings.Contains(clean, "other-secret") {
		t.Fatalf("expected secrets redacted, got %q", clean)
	}
	if !strings.Contains(clean, "api_key=[REDACTED]") {
		t.Fatalf("expected api_key redaction, got %q", clean)
	}
}

func TestSanitizeSegmentRenderLogRedactsEmbyToken(t *testing.T) {
	raw := "jellyfin request failed X-Emby-Token: emby-secret-value tail"
	clean := SanitizeSegmentRenderLog(raw)
	if strings.Contains(clean, "emby-secret-value") {
		t.Fatalf("expected X-Emby-Token redacted, got %q", clean)
	}
}
