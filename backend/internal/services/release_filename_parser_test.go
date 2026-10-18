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
		})
	}
}
