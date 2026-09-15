package services

import (
	"strings"
	"context"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"path/filepath"
	"slices"
	"sync/atomic"
	"time"
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
		StreamURL:        "http://jellyfin/Videos/abc/stream",
		HTTPHeaders: http.Header{"Authorization": []string{"MediaBrowser Token=\"synthetic-key\""}},
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

func TestBuildFFmpegHeadersAndRedirectOptionsPrecedeInput(t *testing.T) {
 input:=SegmentRenderCommandInput{StreamURL:"http://jellyfin/stream",HTTPHeaders:http.Header{"Authorization":{"MediaBrowser Token=\"fixture-key\""}},OutputPath:"/tmp/fixture.mp4",DurationSeconds:1}
 args,err:=BuildFFmpegSegmentArgs(input)
 if err!=nil {t.Fatal(err)}
 index:=slices.Index(args,"-i")
 headers:=slices.Index(args,"-headers")
 redirects:=slices.Index(args,"-max_redirects")
 if headers<0||redirects<0||headers>=index||redirects>=index||args[redirects+1]!="0" {t.Fatal("missing bounded authenticated input options")}
 if args[headers+1]!="Authorization: MediaBrowser Token=\"fixture-key\"\r\n"||args[index+1]!=input.StreamURL {t.Fatal("headers not separated from key-free URL")}
 input.HTTPHeaders.Set("Authorization","safe\r\nInjected: bad")
 if _,err=BuildFFmpegSegmentArgs(input);err==nil {t.Fatal("header injection accepted")}
}

func TestSanitizeSegmentRenderLogRedactsModernAuthorization(t *testing.T) {
 for _,raw:=range []string{
  "Authorization: MediaBrowser Token=\"private token with spaces\"\r\nnext",
  "authorization: mediabrowser Client=\"Team4s\", Token = \"private token with spaces\"",
  "Authorization: MediaBrowser Token=\"private\\\"quoted-token\"",
 } {
  clean:=SanitizeSegmentRenderLog(raw)
  if strings.Contains(clean,"private")||strings.Contains(clean,"quoted-token")||strings.Contains(clean,"with spaces") {t.Fatal("modern authorization leaked")}
 }
}

func TestFFmpegExecutableAuthenticatedInputRejectsCrossOriginRedirect(t *testing.T) {
 binary,err:=exec.LookPath("ffmpeg")
 if err!=nil {t.Fatal("installed FFmpeg is required for redirect proof")}
 dir:=t.TempDir()
 fixture:=filepath.Join(dir,"fixture.mp4")
 ctx,cancel:=context.WithTimeout(context.Background(),20*time.Second);defer cancel()
 generate:=exec.CommandContext(ctx,binary,"-hide_banner","-loglevel","error","-f","lavfi","-i","color=c=black:s=16x16:r=1","-f","lavfi","-i","anullsrc=r=8000:cl=mono","-t","1","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",fixture)
 if output,err:=generate.CombinedOutput();err!=nil {t.Fatalf("generate tiny fixture: %v %s",err,output)}
 var foreignCalls,authenticatedCalls,redirectCalls atomic.Int32
 foreign:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){foreignCalls.Add(1);http.ServeFile(w,r,fixture)}))
 defer foreign.Close()
 source:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.Header.Get("Authorization")!="MediaBrowser Token=\"ffmpeg-fixture-secret\"" {t.Error("FFmpeg input missing auth")}
  if strings.Contains(r.URL.String(),"ffmpeg-fixture-secret") {t.Error("credential in FFmpeg URL")}
  authenticatedCalls.Add(1)
  if r.URL.Path=="/redirect" {redirectCalls.Add(1);http.Redirect(w,r,foreign.URL+"/fixture",http.StatusFound);return}
  http.ServeFile(w,r,fixture)
 }))
 defer source.Close()
 for _,path:=range []string{"direct","redirect"} {
  input:=SegmentRenderCommandInput{FFmpegPath:binary,StreamURL:source.URL+"/"+path,HTTPHeaders:http.Header{"Authorization":{"MediaBrowser Token=\"ffmpeg-fixture-secret\""}},OutputPath:filepath.Join(dir,path+".mp4"),DurationSeconds:1}
  args,err:=BuildFFmpegSegmentArgs(input);if err!=nil {t.Fatal(err)}
  output,err:=exec.CommandContext(ctx,args[0],args[1:]...).CombinedOutput()
  if path=="direct"&&err!=nil {t.Fatalf("authenticated render failed: %v %s",err,SanitizeSegmentRenderLog(string(output),"ffmpeg-fixture-secret"))}
  if path=="redirect"&&err==nil {t.Fatal("redirect input unexpectedly rendered")}
  if strings.Contains(SanitizeSegmentRenderLog(string(output),"ffmpeg-fixture-secret"),"ffmpeg-fixture-secret") {t.Fatal("stderr leaks key")}
 }
 if authenticatedCalls.Load()<2||redirectCalls.Load()!=1||foreignCalls.Load()!=0 {t.Fatalf("source calls=%d redirect=%d foreign=%d",authenticatedCalls.Load(),redirectCalls.Load(),foreignCalls.Load())}
}
