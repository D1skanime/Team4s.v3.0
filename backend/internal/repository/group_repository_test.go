package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestGroupRepository_GetGroupDetail(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	// Create test anime
	animeID := createTestAnime(t, repo.db)

	// Create test fansub group
	fansubRepo := NewFansubRepository(repo.db)
	group, err := fansubRepo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "test-group",
		Name:   "Test Group",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("failed to create test group: %v", err)
	}

	// Create anime-fansub relation
	_, err = fansubRepo.AttachAnimeFansub(ctx, animeID, group.ID, models.AnimeFansubAttachInput{
		IsPrimary: true,
		Notes:     stringPtr("Test notes"),
	})
	if err != nil {
		t.Fatalf("failed to attach group to anime: %v", err)
	}

	// Create test members
	_, err = fansubRepo.CreateMember(ctx, group.ID, models.FansubMemberCreateInput{
		Handle: "member1",
		Role:   "translator",
	})
	if err != nil {
		t.Fatalf("failed to create member: %v", err)
	}

	// Test: Get group detail
	groupRepo := NewGroupRepository(repo.db)
	detail, err := groupRepo.GetGroupDetail(ctx, animeID, group.ID)
	if err != nil {
		t.Fatalf("GetGroupDetail failed: %v", err)
	}

	if detail.AnimeID != animeID {
		t.Errorf("expected anime_id %d, got %d", animeID, detail.AnimeID)
	}
	if detail.FansubID != group.ID {
		t.Errorf("expected fansub_id %d, got %d", group.ID, detail.FansubID)
	}
	if detail.Fansub.Name != "Test Group" {
		t.Errorf("expected fansub name 'Test Group', got %q", detail.Fansub.Name)
	}
	if detail.Stats.MemberCount != 1 {
		t.Errorf("expected member_count 1, got %d", detail.Stats.MemberCount)
	}
	if detail.Stats.EpisodeCount != 0 {
		t.Errorf("expected episode_count 0, got %d", detail.Stats.EpisodeCount)
	}

	// Test: Not found
	_, err = groupRepo.GetGroupDetail(ctx, animeID, 999999)
	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestGroupRepository_GetGroupReleases(t *testing.T) {
	repo := setupTestRepo(t)
	ctx := context.Background()

	// Create test anime
	animeID := createTestAnime(t, repo.db)

	// Create test fansub groups
	fansubRepo := NewFansubRepository(repo.db)
	group1, err := fansubRepo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "test-group-1",
		Name:   "Test Group 1",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("failed to create test group 1: %v", err)
	}

	group2, err := fansubRepo.CreateGroup(ctx, models.FansubGroupCreateInput{
		Slug:   "test-group-2",
		Name:   "Test Group 2",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("failed to create test group 2: %v", err)
	}

	// Attach both groups to anime
	_, err = fansubRepo.AttachAnimeFansub(ctx, animeID, group1.ID, models.AnimeFansubAttachInput{
		IsPrimary: true,
	})
	if err != nil {
		t.Fatalf("failed to attach group 1: %v", err)
	}

	_, err = fansubRepo.AttachAnimeFansub(ctx, animeID, group2.ID, models.AnimeFansubAttachInput{
		IsPrimary: false,
	})
	if err != nil {
		t.Fatalf("failed to attach group 2: %v", err)
	}

	// Create release-native rows
	for i := int32(1); i <= 5; i++ {
		var episodeID int64
		if err := repo.db.QueryRow(ctx, `
			INSERT INTO episodes (anime_id, episode_number, title, status)
			VALUES ($1, $2, $3, 'public')
			RETURNING id
		`, animeID, fmt.Sprintf("%d", i), fmt.Sprintf("Episode %d", i)).Scan(&episodeID); err != nil {
			t.Fatalf("failed to create episode row %d: %v", i, err)
		}
		var releaseID int64
		if err := repo.db.QueryRow(ctx, `
			INSERT INTO fansub_releases (episode_id)
			VALUES ($1)
			RETURNING id
		`, episodeID).Scan(&releaseID); err != nil {
			t.Fatalf("failed to create release %d: %v", i, err)
		}
		var releaseVersionID int64
		if err := repo.db.QueryRow(ctx, `
			INSERT INTO release_versions (release_id, version, title)
			VALUES ($1, 'v1', $2)
			RETURNING id
		`, releaseID, fmt.Sprintf("Episode %d", i)).Scan(&releaseVersionID); err != nil {
			t.Fatalf("failed to create release version %d: %v", i, err)
		}
		if _, err := repo.db.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id, fansubgroup_id)
			VALUES ($1, $2, $2)
		`, releaseVersionID, group1.ID); err != nil {
			t.Fatalf("failed to create release version group %d: %v", i, err)
		}
		var variantID int64
		if err := repo.db.QueryRow(ctx, `
			INSERT INTO release_variants (release_version_id, filename, video_quality)
			VALUES ($1, $2, '1080p')
			RETURNING id
		`, releaseVersionID, fmt.Sprintf("episode-%d.mkv", i)).Scan(&variantID); err != nil {
			t.Fatalf("failed to create release variant %d: %v", i, err)
		}
		if _, err := repo.db.Exec(ctx, `
			INSERT INTO release_variant_episodes (release_variant_id, episode_id, position)
			VALUES ($1, $2, 1)
		`, variantID, episodeID); err != nil {
			t.Fatalf("failed to create release coverage %d: %v", i, err)
		}
	}

	// Test: Get releases with default pagination
	groupRepo := NewGroupRepository(repo.db)
	data, total, err := groupRepo.GetGroupReleases(ctx, animeID, group1.ID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
	})
	if err != nil {
		t.Fatalf("GetGroupReleases failed: %v", err)
	}

	if total != 5 {
		t.Errorf("expected total 5, got %d", total)
	}
	if len(data.Episodes) != 5 {
		t.Errorf("expected 5 episodes, got %d", len(data.Episodes))
	}
	for _, episode := range data.Episodes {
		if episode.EpisodeID == nil || *episode.EpisodeID <= 0 {
			t.Fatalf("expected populated episode_id for release %d", episode.ID)
		}
	}
	if data.Group.FansubID != group1.ID {
		t.Errorf("expected group id %d, got %d", group1.ID, data.Group.FansubID)
	}
	if len(data.OtherGroups) != 1 {
		t.Errorf("expected 1 other group, got %d", len(data.OtherGroups))
	}
	if data.OtherGroups[0].ID != group2.ID {
		t.Errorf("expected other group id %d, got %d", group2.ID, data.OtherGroups[0].ID)
	}

	// Test: Pagination
	data, total, err = groupRepo.GetGroupReleases(ctx, animeID, group1.ID, models.GroupReleasesFilter{
		Page:    2,
		PerPage: 2,
	})
	if err != nil {
		t.Fatalf("GetGroupReleases page 2 failed: %v", err)
	}
	if total != 5 {
		t.Errorf("expected total 5, got %d", total)
	}
	if len(data.Episodes) != 2 {
		t.Errorf("expected 2 episodes on page 2, got %d", len(data.Episodes))
	}

	// Test: Text search
	data, total, err = groupRepo.GetGroupReleases(ctx, animeID, group1.ID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
		Q:       "Episode 3",
	})
	if err != nil {
		t.Fatalf("GetGroupReleases with search failed: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total 1 with search, got %d", total)
	}

	// Test: Episode number search
	data, total, err = groupRepo.GetGroupReleases(ctx, animeID, group1.ID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
		Q:       "4",
	})
	if err != nil {
		t.Fatalf("GetGroupReleases with episode-number search failed: %v", err)
	}
	if total != 1 || len(data.Episodes) != 1 || data.Episodes[0].EpisodeNumber != 4 {
		t.Fatalf("expected only episode 4 for numeric search, got total=%d count=%d", total, len(data.Episodes))
	}

	// Test: Release assets are deferred until release-native media linking lands.
	data, total, err = groupRepo.GetGroupReleases(ctx, animeID, group1.ID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
		Q:       "4",
	})
	if err != nil {
		t.Fatalf("GetGroupReleases after seeding screenshots failed: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total 1 after release-native seed, got %d", total)
	}
	if data.Episodes[0].ScreenshotCount != 0 {
		t.Fatalf("expected deferred screenshot_count 0, got %d", data.Episodes[0].ScreenshotCount)
	}
	if data.Episodes[0].ThumbnailURL != nil {
		t.Fatalf("expected deferred thumbnail_url to be nil, got %v", data.Episodes[0].ThumbnailURL)
	}

	// Test: Not found
	_, _, err = groupRepo.GetGroupReleases(ctx, animeID, 999999, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 20,
	})
	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func stringPtr(s string) *string {
	return &s
}
