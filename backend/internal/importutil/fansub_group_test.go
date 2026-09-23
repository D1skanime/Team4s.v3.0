package importutil

import "testing"

// TestDeriveFansubGroupName is the D-10 table-driven test: it covers all 13
// real filenames from 167-USER-REQUEST.md's measurement table verbatim
// (proving D-05's filename-only rule since fullPath is left empty for every
// one of them), plus 3 additional edge cases covering D-05's path-fallback
// rule and Pitfall 4's bracket-ordering risk.
func TestDeriveFansubGroupName(t *testing.T) {
	tests := []struct {
		name     string
		fileName string
		fullPath string
		want     string
	}{
		// --- 13 real filenames from 167-USER-REQUEST.md's measurement table ---
		{
			name:     "SHFS bracket prefix with trailing technical brackets (codec/resolution/CRC)",
			fileName: `[SHFS]07-Ghost_01_[H.264][1280x720][3390FBD1].mkv`,
			want:     "SHFS",
		},
		{
			name:     "GFE bracket prefix with trailing CRC bracket",
			fileName: `[GFE]Hand_Maid_May_01_[97D9369A].ogm`,
			want:     "GFE",
		},
		{
			name:     "FH-Subs bracket prefix, space before title, parenthesised language tag",
			fileName: `[FH-Subs]Needless EP01 720p (ger.sub).mp4`,
			want:     "FH-Subs",
		},
		{
			name:     "BDnP bracket prefix, scene-style dotted title with trailing compound codec bracket",
			fileName: `[BDnP]NIGHT.HEAD.2041.S01E01[Web.1080p.AAC].mkv`,
			want:     "BDnP",
		},
		{
			name:     "BnP bracket prefix, same NIGHT.HEAD release, second group tag for the same fansub group",
			fileName: `[BnP]NIGHT.HEAD.2041.S01E09[Web.1080p.AAC].mkv`,
			want:     "BnP",
		},
		{
			name:     "GK bracket prefix, glued v4 version suffix directly after a checksum bracket",
			fileName: `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv`,
			want:     "GK",
		},
		{
			name:     "Pure-Ani-me bracket prefix with space, multi-hyphen group name",
			fileName: `[Pure-Ani-me] Macross Delta 01 Ger Sub.mkv`,
			want:     "Pure-Ani-me",
		},
		{
			name:     "L-S bracket prefix with space, trailing compound codec parens and CRC bracket",
			fileName: `[L-S] Natsume Yuujinchou S1 - 02.x264 (1280x720 h264 AAC)[C4B217BC].1080P.mkv`,
			want:     "L-S",
		},
		{
			name:     "no group in filename, language tag only ('Sub' must not be mistaken for a group)",
			fileName: `Naruto Ger Sub 012.avi`,
			want:     "",
		},
		{
			name:     "double episode, no group, no scene marker",
			fileName: `Naruto_026-027_ger_Sub_Uncut(1920).mkv`,
			want:     "",
		},
		{
			name:     "Jellyfin rename suffix schema Title.SxxEyy-Group",
			fileName: `Naruto.S01E01-AnimeOwnage.avi`,
			want:     "AnimeOwnage",
		},
		{
			name:     "D-07 scene-schema prefix gruppe-titel.sXXeYY... (was empty, must now match)",
			fileName: `dmpd-mashle.magic.and.muscles.s01e17.german.dl.anime.1080p.web.h264.mkv`,
			want:     "dmpd",
		},
		{
			name:     "D-06 sole bracket is an 8-hex-char CRC checksum (was wrongly returned, must now be empty)",
			fileName: `Serie_01_[AEC71BC3].mkv`,
			want:     "",
		},

		// --- Additional edge cases (Pitfall 4 bracket ordering + D-05 filename-only rule) ---
		{
			name:     "edge: checksum bracket appears before the real group bracket, first non-technical bracket wins",
			fileName: `[3390FBD1]Title[SHFS].mkv`,
			want:     "SHFS",
		},
		{
			name:     "edge: empty filename falls back to the bracketed group in the last path segment",
			fileName: "",
			fullPath: `D:\Anime\Show\[SHFS]Show_01.mkv`,
			want:     "SHFS",
		},
		{
			name:     "edge: filename's own bracketed group wins; unrelated bracket in a parent directory name is never considered",
			fileName: `[SHFS]Show_01.mkv`,
			fullPath: `D:\Anime\[UnrelatedTag]\[SHFS]Show_01.mkv`,
			want:     "SHFS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DeriveFansubGroupName(tt.fileName, tt.fullPath)
			if got != tt.want {
				t.Fatalf("DeriveFansubGroupName(%q, %q) = %q, want %q", tt.fileName, tt.fullPath, got, tt.want)
			}
		})
	}
}
