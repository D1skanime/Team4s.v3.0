package services

import (
	"strconv"
	"testing"
)

// TestAnitogoReleaseFilenameParser_ParseFilename covers D-03 (186-02): CRC/
// hash checksum tags in brackets (e.g. "[E61CA0BA]") must land in the
// Checksum field, never in EpisodeNumber -- the exact bug (Finding #15) the
// old hand-rolled "Exx" fallback regex had. Batch/version suffixes (v2/v3)
// and Specials/OVA naming must not corrupt episode extraction either.
func TestAnitogoReleaseFilenameParser_ParseFilename(t *testing.T) {
	tests := []struct {
		name         string
		fileName     string
		wantEpisode  int32
		wantChecksum string
	}{
		{
			name:         "SubsPlease-style raw filename with CRC tag",
			fileName:     `[SubsPlease] Attack on Titan - 01 (1080p) [E61CA0BA].mkv`,
			wantEpisode:  1,
			wantChecksum: "E61CA0BA",
		},
		{
			name:         "Erai-raws-style raw filename with multiple-subtitle marker and CRC tag",
			fileName:     `[Erai-raws] Mushoku Tensei - 01 [1080p][Multiple Subtitle][1F56D642].mkv`,
			wantEpisode:  1,
			wantChecksum: "1F56D642",
		},
		{
			name:         "v2 batch/version suffix does not corrupt episode number",
			fileName:     `[SubsPlease] Jujutsu Kaisen - 05v2 (1080p) [ABCD1234].mkv`,
			wantEpisode:  5,
			wantChecksum: "ABCD1234",
		},
		{
			name:         "v3 batch/version suffix with multi-digit episode number",
			fileName:     `[Erai-raws] One Piece - 1085v3 [1080p][AAC][FEEDBEEF].mkv`,
			wantEpisode:  1085,
			wantChecksum: "FEEDBEEF",
		},
		{
			name:         "SP01 special resolves to a real episode number",
			fileName:     `[SubsPlease] Demon Slayer - SP01 (1080p) [12345678].mkv`,
			wantEpisode:  1,
			wantChecksum: "12345678",
		},
		{
			name:         "S00E01 special resolves to a real episode number",
			fileName:     `[SubsPlease] Demon Slayer - S00E01 (1080p) [87654321].mkv`,
			wantEpisode:  1,
			wantChecksum: "87654321",
		},
		{
			name:         "single-episode filename yields no EpisodeNumberEnd (no regression)",
			fileName:     `[SubsPlease] Attack on Titan - 09 (1080p) [AAAA1111].mkv`,
			wantEpisode:  9,
			wantChecksum: "AAAA1111",
		},
	}

	parser := NewAnitogoReleaseFilenameParser()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, ok := parser.ParseFilename(tt.fileName)
			if !ok {
				t.Fatalf("ParseFilename(%q) returned ok=false, want ok=true", tt.fileName)
			}
			if result.EpisodeNumber == nil {
				t.Fatalf("ParseFilename(%q) returned nil EpisodeNumber, want %d", tt.fileName, tt.wantEpisode)
			}
			if *result.EpisodeNumber != tt.wantEpisode {
				t.Fatalf("ParseFilename(%q) EpisodeNumber = %d, want %d", tt.fileName, *result.EpisodeNumber, tt.wantEpisode)
			}
			if result.Checksum != tt.wantChecksum {
				t.Fatalf("ParseFilename(%q) Checksum = %q, want %q", tt.fileName, result.Checksum, tt.wantChecksum)
			}
			// Defensive: the checksum string must never equal the episode
			// number's string representation either -- would indicate the
			// CRC-as-episode-number bug (Finding #15) resurfaced.
			if result.Checksum == strconv.Itoa(int(*result.EpisodeNumber)) {
				t.Fatalf("ParseFilename(%q) checksum %q collides with episode number %d", tt.fileName, result.Checksum, *result.EpisodeNumber)
			}
			// None of these filenames encode a multi-episode range -- EpisodeNumberEnd
			// must stay nil (no regression from the fix_3 range extension).
			if result.EpisodeNumberEnd != nil {
				t.Fatalf("ParseFilename(%q) EpisodeNumberEnd = %d, want nil (single-episode filename)", tt.fileName, *result.EpisodeNumberEnd)
			}
		})
	}
}

// TestAnitogoReleaseFilenameParser_ParseFilename_EpisodeRange covers fix_3
// (186 review): anitogo's EpisodeNumber can hold BOTH bounds of a bare
// multi-episode range (no literal "e" required) for separators "-", "~",
// "&", and "+" (parser_number.go matchMultiEpisodePattern). Both bounds must
// surface via EpisodeNumber/EpisodeNumberEnd so neither episode silently
// drops out of the suggested-targets range.
func TestAnitogoReleaseFilenameParser_ParseFilename_EpisodeRange(t *testing.T) {
	tests := []struct {
		name            string
		fileName        string
		wantEpisode     int32
		wantEpisodeEnd  int32
		wantChecksum    string
	}{
		{
			name:           "bare hyphen range without literal e",
			fileName:       `[Group] Show - 01-02 [ABCD1234].mkv`,
			wantEpisode:    1,
			wantEpisodeEnd: 2,
			wantChecksum:   "ABCD1234",
		},
		{
			name:           "bare tilde range without literal e",
			fileName:       `[Group] Show - 01~02 [ABCD1234].mkv`,
			wantEpisode:    1,
			wantEpisodeEnd: 2,
			wantChecksum:   "ABCD1234",
		},
		{
			name:           "bare ampersand range without literal e",
			fileName:       `[Group] Show - 01&02 [ABCD1234].mkv`,
			wantEpisode:    1,
			wantEpisodeEnd: 2,
			wantChecksum:   "ABCD1234",
		},
	}

	parser := NewAnitogoReleaseFilenameParser()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, ok := parser.ParseFilename(tt.fileName)
			if !ok {
				t.Fatalf("ParseFilename(%q) returned ok=false, want ok=true", tt.fileName)
			}
			if result.EpisodeNumber == nil || *result.EpisodeNumber != tt.wantEpisode {
				t.Fatalf("ParseFilename(%q) EpisodeNumber = %v, want %d", tt.fileName, result.EpisodeNumber, tt.wantEpisode)
			}
			if result.EpisodeNumberEnd == nil || *result.EpisodeNumberEnd != tt.wantEpisodeEnd {
				t.Fatalf("ParseFilename(%q) EpisodeNumberEnd = %v, want %d", tt.fileName, result.EpisodeNumberEnd, tt.wantEpisodeEnd)
			}
			if result.Checksum != tt.wantChecksum {
				t.Fatalf("ParseFilename(%q) Checksum = %q, want %q", tt.fileName, result.Checksum, tt.wantChecksum)
			}
		})
	}
}
