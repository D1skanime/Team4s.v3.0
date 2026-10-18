package handlers

import (
	"strconv"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

// TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames covers
// D-03 (186-02): for all 15 real release_variants.filename values queried
// live from team4s_v2, the OLD (nil-parser, parseEpisodeImportFilenameEpisode
// fallback) and NEW (anitogo-backed ReleaseFilenameParser) paths must return
// identical results. 12 of the 15 have season > 0 and match the unchanged
// SxxExx branch before the fallback is ever reached; the remaining 3
// (S00Exx) fall through to the fallback/parser branch and both OLD and NEW
// return nil for all 3 (a from-nil-to-nil non-regression).
func TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames(t *testing.T) {
	t.Parallel()

	fileNames := []string{
		"07-Ghost.S01E22-ShiroiFansub.mkv",
		"07-Ghost.S01E25-ShiroiFansub.mkv",
		"11 eyes OVA.Bonus.S00E01-strawhat.mp4",
		"11eyes.S01E01-FlameHazeSubs.mp4",
		"11eyes.S01E09-FlameHazeSubs.mp4",
		"11eyes.S01E12-Strawhat.mkv",
		"Accel World.S01E01-Morai.mp4",
		"Buddy Complex.S01E04-NEW-SUBS.mkv",
		"Buddy Complex.S01E12-NEW-SUBS.mkv",
		"Diamond no Ace 2.S02E51-L-S.mp4",
		"hack G U Returner.S00E14-ShayoSubs.avi",
		"hack-G.U.Trilogy.S00E12-GAX.mp4",
		"Naruto.S01E01-AnimeOwnage.avi",
		"Naruto.S01E02-AnimeOwnage.avi",
		"Naruto.S01E05-AnimenOwnage.avi",
	}

	parser := services.NewAnitogoReleaseFilenameParser()
	for _, fileName := range fileNames {
		t.Run(fileName, func(t *testing.T) {
			media := models.EpisodeImportMediaCandidate{FileName: fileName}
			oldResult := episodeImportEvidenceEpisodeNumber(media, nil)
			newResult := episodeImportEvidenceEpisodeNumber(media, parser)

			if (oldResult == nil) != (newResult == nil) {
				t.Fatalf("episodeImportEvidenceEpisodeNumber(%q): old=%v new=%v, expected both nil or both non-nil", fileName, derefInt32Ptr(oldResult), derefInt32Ptr(newResult))
			}
			if oldResult != nil && newResult != nil && *oldResult != *newResult {
				t.Fatalf("episodeImportEvidenceEpisodeNumber(%q): old=%d new=%d, expected identical result (regression)", fileName, *oldResult, *newResult)
			}
		})
	}
}

// derefInt32Ptr is a small nil-safe helper for readable test failure messages.
func derefInt32Ptr(v *int32) string {
	if v == nil {
		return "<nil>"
	}
	return strconv.Itoa(int(*v))
}

// TestPreviewEpisodeImport_CRCTagDoesNotLeakIntoEpisodeNumber is the
// pipeline-integration test for D-03 (186-02): a CRC-tagged filename with no
// Jellyfin metadata and no SxxExx match must resolve to the real episode
// number via the anitogo-backed parser, not the CRC value, when pushed
// through the full buildEpisodeImportPreview pipeline.
func TestPreviewEpisodeImport_CRCTagDoesNotLeakIntoEpisodeNumber(t *testing.T) {
	t.Parallel()

	preview := buildEpisodeImportPreview(
		77,
		"Attack on Titan",
		episodeImportStringPtr("1234"),
		episodeImportStringPtr("series-aot"),
		episodeImportStringPtr("/media/Attack on Titan"),
		[]models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
		[]models.EpisodeImportMediaCandidate{
			{
				MediaItemID: "aot-crc-tagged",
				FileName:    "[SubsPlease] Attack on Titan - 01 (1080p) [E61CA0BA].mkv",
				Path:        "/media/Attack on Titan/[SubsPlease] Attack on Titan - 01 (1080p) [E61CA0BA].mkv",
			},
		},
		0,
		services.NewAnitogoReleaseFilenameParser(),
	)

	if len(preview.Mappings) != 1 {
		t.Fatalf("expected exactly one mapping row, got %d", len(preview.Mappings))
	}
	row := preview.Mappings[0]
	if len(row.SuggestedEpisodeNumbers) != 1 || row.SuggestedEpisodeNumbers[0] != 1 {
		t.Fatalf("expected SuggestedEpisodeNumbers == [1] (not [61], the CRC value), got %v", row.SuggestedEpisodeNumbers)
	}
}
