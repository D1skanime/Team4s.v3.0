package services

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const DefaultSegmentRenderProfile = "mp4-h264-aac-ass-v1"

type SegmentRenderWindow struct {
	SegmentID      int64
	SourceKind     string
	SourceIdentity string
	StartSeconds   int32
	EndSeconds     int32
	RenderProfile  string
}

type SegmentRenderCommandInput struct {
	FFmpegPath       string
	StreamURL        string
	SubtitleFilePath string
	OutputPath       string
	StartSeconds     int32
	DurationSeconds  int32
}

type SegmentProbeMediaStream struct {
	Index     int32
	Type      string
	Codec     string
	IsDefault bool
	IsForced  bool
}

func ValidateDerivedSegmentWindow(startSeconds int32, endSeconds int32, maxSeconds int32) error {
	if startSeconds < 0 || endSeconds <= startSeconds {
		return fmt.Errorf("segment render window must have start before end")
	}
	duration := endSeconds - startSeconds
	if maxSeconds > 0 && duration > maxSeconds {
		return fmt.Errorf("segment render window exceeds maximum duration")
	}
	return nil
}

func BuildSegmentRenderCacheKey(input SegmentRenderWindow) (string, error) {
	if input.SegmentID <= 0 {
		return "", fmt.Errorf("segment id is required")
	}
	if strings.TrimSpace(input.SourceKind) == "" {
		return "", fmt.Errorf("source kind is required")
	}
	if strings.TrimSpace(input.SourceIdentity) == "" {
		return "", fmt.Errorf("source identity is required")
	}
	if err := ValidateDerivedSegmentWindow(input.StartSeconds, input.EndSeconds, 0); err != nil {
		return "", err
	}
	profile := strings.TrimSpace(input.RenderProfile)
	if profile == "" {
		profile = DefaultSegmentRenderProfile
	}

	raw := strings.Join([]string{
		strconv.FormatInt(input.SegmentID, 10),
		strings.TrimSpace(input.SourceKind),
		strings.TrimSpace(input.SourceIdentity),
		strconv.FormatInt(int64(input.StartSeconds), 10),
		strconv.FormatInt(int64(input.EndSeconds), 10),
		profile,
	}, "\x00")
	sum := sha256.Sum256([]byte(raw))
	return "theme-segment-" + hex.EncodeToString(sum[:]), nil
}

func SelectSegmentSubtitleStream(streams []SegmentProbeMediaStream) *SegmentProbeMediaStream {
	suitable := make([]SegmentProbeMediaStream, 0, len(streams))
	for _, stream := range streams {
		if !isSupportedSubtitleStream(stream) {
			continue
		}
		suitable = append(suitable, stream)
	}
	if len(suitable) == 0 {
		return nil
	}
	for _, stream := range suitable {
		if stream.IsDefault || stream.IsForced {
			selected := stream
			return &selected
		}
	}
	selected := suitable[0]
	return &selected
}

func BuildFFmpegSegmentArgs(input SegmentRenderCommandInput) ([]string, error) {
	ffmpegPath := strings.TrimSpace(input.FFmpegPath)
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	if strings.TrimSpace(input.StreamURL) == "" {
		return nil, fmt.Errorf("stream url is required")
	}
	if strings.TrimSpace(input.OutputPath) == "" {
		return nil, fmt.Errorf("output path is required")
	}
	if input.StartSeconds < 0 || input.DurationSeconds <= 0 {
		return nil, fmt.Errorf("valid start and duration are required")
	}

	args := []string{
		ffmpegPath,
		"-ss", strconv.FormatInt(int64(input.StartSeconds), 10),
		"-t", strconv.FormatInt(int64(input.DurationSeconds), 10),
		"-i", strings.TrimSpace(input.StreamURL),
	}
	if strings.TrimSpace(input.SubtitleFilePath) != "" {
		args = append(args, "-vf", "subtitles="+escapeFFmpegSubtitlePath(input.SubtitleFilePath))
	}
	args = append(args,
		"-map", "0:v:0",
		"-map", "0:a:0",
		"-sn",
		"-dn",
		"-map_metadata", "-1",
		"-c:v", "libx264",
		// 8-bit 4:2:0 erzwingen: viele Anime-Quellen (Jellyfin) sind 10-bit (yuv420p10le),
		// was Browser in <video> nicht abspielen koennen. yuv420p sichert Browser-Playback.
		"-pix_fmt", "yuv420p",
		"-preset", "veryfast",
		"-crf", "26",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		strings.TrimSpace(input.OutputPath),
	)
	return args, nil
}

func SanitizeSegmentRenderLog(raw string, secrets ...string) string {
	out := raw
	for _, secret := range secrets {
		trimmed := strings.TrimSpace(secret)
		if trimmed == "" {
			continue
		}
		out = strings.ReplaceAll(out, trimmed, "[REDACTED]")
	}
	for _, re := range []*regexp.Regexp{
		regexp.MustCompile(`(?i)(api_key=)[^&\s]+`),
		regexp.MustCompile(`(?i)(api_key%3d)[^&\s]+`),
		regexp.MustCompile(`(?i)(access_token=)[^&\s]+`),
		regexp.MustCompile(`(?i)(token=)[^&\s]+`),
		regexp.MustCompile(`(?i)(x-mediabrowser-token:?\s*)[^\s]+`),
		regexp.MustCompile(`(?i)(x-emby-token:?\s*)[^\s]+`),
	} {
		out = re.ReplaceAllString(out, "${1}[REDACTED]")
	}
	return out
}

func isSupportedSubtitleStream(stream SegmentProbeMediaStream) bool {
	if !strings.EqualFold(strings.TrimSpace(stream.Type), "Subtitle") {
		return false
	}
	codec := strings.ToLower(strings.TrimSpace(stream.Codec))
	return codec == "ass" || codec == "ssa" || codec == "subrip" || codec == "srt"
}

func escapeFFmpegSubtitlePath(path string) string {
	normalized := filepath.ToSlash(strings.TrimSpace(path))
	normalized = strings.ReplaceAll(normalized, `\`, `/`)
	normalized = strings.ReplaceAll(normalized, `'`, `\'`)
	normalized = strings.ReplaceAll(normalized, `:`, `\:`)
	return "'" + normalized + "'"
}
