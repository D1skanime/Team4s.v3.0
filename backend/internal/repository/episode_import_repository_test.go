package repository

import (
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestEpisodeImportApply_CreatesCoverageJoinRowsForMultiEpisodeMedia(t *testing.T) {
	t.Parallel()

	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 9},
			{EpisodeNumber: 10},
		},
		Mappings: []models.EpisodeImportMappingRow{{
			MediaItemID:          "jellyfin-naruto-009-010",
			TargetEpisodeNumbers: []int32{9, 10},
			Status:               models.EpisodeImportMappingStatusConfirmed,
		}},
	}

	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		t.Fatalf("build apply plan: %v", err)
	}

	if len(plan.mappings) != 1 {
		t.Fatalf("expected one mapping, got %d", len(plan.mappings))
	}
	targets := plan.mappings[0].TargetEpisodeNumbers
	if len(targets) != 2 || targets[0] != 9 || targets[1] != 10 {
		t.Fatalf("expected normalized multi-episode coverage [9 10], got %v", targets)
	}
	if primary := targets[0]; primary != 9 {
		t.Fatalf("expected compatibility primary episode 9, got %d", primary)
	}
}

func TestEpisodeImportApply_PreservesExistingManualEpisodeTitle(t *testing.T) {
	t.Parallel()

	existingTitle := "Manual curated title"
	incomingTitle := "AniSearch imported title"
	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{
			EpisodeNumber: 9,
			Title:         &incomingTitle,
			ExistingTitle: &existingTitle,
		}},
	}

	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		t.Fatalf("build apply plan: %v", err)
	}

	canonical := plan.canonicalByNumber[9]
	if canonical.ExistingTitle == nil || *canonical.ExistingTitle != existingTitle {
		t.Fatalf("expected existing manual title to stay in apply plan, got %#v", canonical.ExistingTitle)
	}
	if canonical.Title == nil || *canonical.Title != incomingTitle {
		t.Fatalf("expected incoming AniSearch title to remain available for fill-only use, got %#v", canonical.Title)
	}
}

func TestEpisodeImportDisplayTitle_PrefersGermanEnglishJapaneseGenerated(t *testing.T) {
	t.Parallel()

	if got := episodeImportDisplayTitle(models.EpisodeImportCanonicalEpisode{
		EpisodeNumber:    1,
		TitlesByLanguage: map[string]string{"de": "Deutsch", "en": "English", "ja": "日本語"},
	}); got != "Deutsch" {
		t.Fatalf("expected German title, got %q", got)
	}
	if got := episodeImportDisplayTitle(models.EpisodeImportCanonicalEpisode{
		EpisodeNumber:    2,
		TitlesByLanguage: map[string]string{"en": "English", "ja": "日本語"},
	}); got != "English" {
		t.Fatalf("expected English title, got %q", got)
	}
	if got := episodeImportDisplayTitle(models.EpisodeImportCanonicalEpisode{
		EpisodeNumber:    3,
		TitlesByLanguage: map[string]string{"ja": "日本語"},
	}); got != "日本語" {
		t.Fatalf("expected Japanese title, got %q", got)
	}
	if got := episodeImportDisplayTitle(models.EpisodeImportCanonicalEpisode{EpisodeNumber: 4}); got != "Episode 4" {
		t.Fatalf("expected generated fallback, got %q", got)
	}
}

func TestEpisodeImportReleaseGraphHelpers_DeriveGroupAndFilename(t *testing.T) {
	t.Parallel()

	media := models.EpisodeImportMediaCandidate{
		FileName:     "[GroupA] Naruto 009-010.mkv",
		Path:         `D:\Anime\Naruto\[GroupA]\[GroupA] Naruto 009-010.mkv`,
		VideoQuality: episodeImportTestStringPtr("1080p"),
	}
	if got := episodeImportFilename(media); got != "[GroupA] Naruto 009-010.mkv" {
		t.Fatalf("expected filename from media, got %q", got)
	}
	if got := deriveFansubGroupName(media); got != "GroupA" {
		t.Fatalf("expected derived fansub group, got %q", got)
	}

	suffixed := models.EpisodeImportMediaCandidate{
		FileName: "11eyes.S01E01-FlameHazeSubs.mp4",
		Path:     `D:\Anime\11eyes\11eyes.S01E01-FlameHazeSubs.mp4`,
	}
	if got := deriveFansubGroupName(suffixed); got != "FlameHazeSubs" {
		t.Fatalf("expected suffixed fansub group, got %q", got)
	}

	typo := models.EpisodeImportMediaCandidate{
		FileName: "Naruto.S01E01-AnmeOwnage.avi",
		Path:     `D:\Anime\Naruto\Naruto.S01E01-AnmeOwnage.avi`,
	}
	if got := deriveFansubGroupName(typo); got != "AnmeOwnage" {
		t.Fatalf("expected raw typo spelling to stay visible, got %q", got)
	}
}

func TestParseImportFansubGroupNames_SplitsAndCanonicalizesCollaborations(t *testing.T) {
	t.Parallel()

	got := parseImportFansubGroupNames(" ProjectMessiah & AnimeOwnage & animeownage ")
	want := []string{"AnimeOwnage", "ProjectMessiah"}
	if len(got) != len(want) {
		t.Fatalf("expected %d names, got %d: %#v", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected canonicalized names %#v, got %#v", want, got)
		}
	}
}

func TestEpisodeImportApply_UsesReleaseNativeTablesOnly(t *testing.T) {
	t.Parallel()

	applyContent, err := os.ReadFile("episode_import_repository_apply.go")
	if err != nil {
		t.Fatalf("read apply source: %v", err)
	}
	releaseContent, err := os.ReadFile("episode_import_repository_release_helpers.go")
	if err != nil {
		t.Fatalf("read release helper source: %v", err)
	}
	normalized := strings.ToLower(string(applyContent) + "\n" + string(releaseContent))
	required := []string{
		"insert into episodes",
		"insert into episode_titles",
		"insert into fansub_releases",
		"insert into release_versions",
		"insert into release_variants",
		"insert into stream_sources",
		"insert into release_streams",
		"insert into release_version_groups",
		"insert into release_variant_episodes",
		"insert into fansub_collaboration_members",
	}
	for _, fragment := range required {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("expected release-native apply source to contain %q", fragment)
		}
	}
	if strings.Contains(normalized, "episode_versions") || strings.Contains(normalized, "episode_version_episodes") {
		t.Fatalf("release-native apply source must not reference legacy episode version tables")
	}
	if !strings.Contains(normalized, "models.fansubgrouptypecollaboration") {
		t.Fatalf("expected release-native apply source to support collaboration fansub groups")
	}
}

func TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode(t *testing.T) {
	t.Parallel()

	// Multiple distinct Jellyfin files (different release groups) covering the
	// same canonical episode are valid parallel versions and must not be rejected.
	plan, err := buildEpisodeImportApplyPlan(models.EpisodeImportApplyInput{
		AnimeID: 42,
		Mappings: []models.EpisodeImportMappingRow{
			{
				MediaItemID:          "jellyfin-group-a",
				TargetEpisodeNumbers: []int32{9},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
			{
				MediaItemID:          "jellyfin-group-b",
				TargetEpisodeNumbers: []int32{9},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
		},
	})
	if err != nil {
		t.Fatalf("expected parallel releases for same episode to be accepted, got: %v", err)
	}
	if len(plan.mappings) != 2 {
		t.Fatalf("expected both parallel release mappings in plan, got %d", len(plan.mappings))
	}
}

func TestEpisodeImportApply_RejectsDuplicateMediaItemID(t *testing.T) {
	t.Parallel()

	// The same media_item_id appearing twice in the mappings list is a structural
	// error (not a legitimate parallel version), so the plan builder must reject it.
	_, err := buildEpisodeImportApplyPlan(models.EpisodeImportApplyInput{
		AnimeID: 42,
		Mappings: []models.EpisodeImportMappingRow{
			{
				MediaItemID:          "jellyfin-same-id",
				TargetEpisodeNumbers: []int32{9},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
			{
				MediaItemID:          "jellyfin-same-id",
				TargetEpisodeNumbers: []int32{10},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
		},
	})
	if err == nil {
		t.Fatal("expected duplicate media_item_id to be rejected before mutation")
	}
}

func episodeImportTestStringPtr(value string) *string {
	return &value
}
