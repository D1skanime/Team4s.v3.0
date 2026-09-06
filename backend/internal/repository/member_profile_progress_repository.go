package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/badges"
	"team4s.v3/backend/internal/models"
)

type badgeProgressThreshold struct {
	count int64
	tier  string
}

// thresholdsFromFamily projects a badges.Family's ascending Tiers into the local
// badgeProgressThreshold shape buildBadgeProgress expects (Phase 150, D-02): the
// registry stays the single source for every family's numbers, this is only a
// type-shape adapter at the call site.
func thresholdsFromFamily(family badges.Family) []badgeProgressThreshold {
	thresholds := make([]badgeProgressThreshold, 0, len(family.Tiers))
	for _, tier := range family.Tiers {
		thresholds = append(thresholds, badgeProgressThreshold{count: tier.Threshold, tier: tier.Code})
	}
	return thresholds
}

// buildBadgeProgress computes both the terminal-vs-in-progress fields (NextThreshold/
// RemainingCount/NextTier/Complete, unchanged since before Phase 150) and, new in
// Phase 150 (D-05/D-24), CurrentTier and the full ascending Stages ladder for one
// badge family. It visits every threshold (never breaking early) so Stages is always
// complete regardless of currentCount -- an ascending list guarantees that once one
// threshold has failed currentCount>=threshold.count, no later (larger) threshold can
// satisfy it either, so the first-match NextThreshold/RemainingCount/NextTier/Complete
// guarded by nextFound below is unaffected by continuing the loop.
func buildBadgeProgress(family string, currentCount int64, thresholds []badgeProgressThreshold) models.PublicMemberBadgeProgress {
	if currentCount < 0 {
		currentCount = 0
	}
	progress := models.PublicMemberBadgeProgress{Family: family, CurrentCount: currentCount, Complete: true}
	stages := make([]models.BadgeProgressStage, 0, len(thresholds))
	nextFound := false
	for _, threshold := range thresholds {
		stages = append(stages, models.BadgeProgressStage{Code: threshold.tier, Threshold: threshold.count})
		if currentCount >= threshold.count {
			// Ascending order: the last threshold reached wins, so the highest
			// tier the member actually holds survives.
			progress.CurrentTier = threshold.tier
			continue
		}
		if nextFound {
			continue
		}
		nextFound = true
		nextThreshold, remainingCount, nextTier := threshold.count, threshold.count-currentCount, threshold.tier
		progress.NextThreshold, progress.RemainingCount, progress.NextTier = &nextThreshold, &remainingCount, &nextTier
		progress.Complete = false
	}
	progress.Stages = stages
	return progress
}

func (r *MemberProfileRepository) loadBadgeProgress(ctx context.Context, memberID int64, totalPoints int64) ([]models.PublicMemberBadgeProgress, error) {
	var projectCount int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ac.anime_id)
		FROM anime_contributions ac
		WHERE ac.member_id = $1 AND ac.status = 'confirmed'
		  AND ac.is_public_on_member_profile = true
	`, memberID).Scan(&projectCount); err != nil {
		return nil, fmt.Errorf("load badge progress project count for member %d: %w", memberID, err)
	}
	projectsCount, err := r.loadContribProjectsCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	chronicleCount, err := r.loadContribChronicleCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	archivistCount, err := r.loadContribArchivistCount(ctx, memberID)
	if err != nil {
		return nil, err
	}

	var membershipYears int64
	if err := r.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(EXTRACT(YEAR FROM age(COALESCE(left_date, CURRENT_DATE), joined_date))), 0)::bigint
		FROM hist_fansub_group_members
		WHERE member_id = $1 AND joined_date IS NOT NULL
		  AND COALESCE(left_date, CURRENT_DATE) >= joined_date
	`, memberID).Scan(&membershipYears); err != nil {
		return nil, fmt.Errorf("load badge progress membership duration for member %d: %w", memberID, err)
	}

	progress := []models.PublicMemberBadgeProgress{
		buildBadgeProgress("progress", projectCount, thresholdsFromFamily(badges.Progress)),
		buildBadgeProgress("points", totalPoints, thresholdsFromFamily(badges.Points)),
		buildBadgeProgress("contribution_projects", projectsCount, thresholdsFromFamily(badges.ContributionProjects)),
		buildBadgeProgress("contribution_chronicle", chronicleCount, thresholdsFromFamily(badges.ContributionChronicle)),
		buildBadgeProgress("contribution_archivist", archivistCount, thresholdsFromFamily(badges.ContributionArchivist)),
		buildBadgeProgress("membership", membershipYears, thresholdsFromFamily(badges.Membership)),
	}

	// role_volume (D-06/D-24): one badge_progress entry per role the member has ANY
	// awarded credit in (mirrors loadRoleVolumeCounts's own "only rows with awarded
	// credits" behavior -- a member with zero awarded roles gets zero entries here,
	// not one with CurrentCount 0). This is a NEW, separate contract surface from the
	// public_badges role_entry_/role_volume_<tier> badge codes built by
	// roleVolumeProgressBadge (member_profile_role_volume_repository.go): CurrentTier
	// here is plain "" below bronze, consistent with every other family in this same
	// array -- the "entry" relabeling only appears in this family's Stages list below.
	roleVolumeCounts, err := r.loadRoleVolumeCounts(ctx, memberID)
	if err != nil {
		return nil, err
	}
	if len(roleVolumeCounts) > 0 {
		// Built once: identical for every role_volume entry. badges.RoleVolume.Tiers
		// intentionally excludes an "entry" tier (registry only holds bronze/silver/
		// gold/platinum) -- the entry stage (threshold 1) is synthesized HERE in Go,
		// the only place in the whole phase this literal is written down, so the
		// frontend never needs it (D-24).
		roleVolumeStages := make([]models.BadgeProgressStage, 0, len(badges.RoleVolume.Tiers)+1)
		roleVolumeStages = append(roleVolumeStages, models.BadgeProgressStage{Code: "entry", Threshold: 1})
		for _, tier := range badges.RoleVolume.Tiers {
			roleVolumeStages = append(roleVolumeStages, models.BadgeProgressStage{Code: tier.Code, Threshold: tier.Threshold})
		}

		for _, entry := range roleVolumeCounts {
			entry := entry
			roleEntryProgress := models.PublicMemberBadgeProgress{
				Family:       "role_volume",
				CurrentCount: entry.Count,
				CurrentTier:  badges.RoleVolume.CurrentTier(entry.Count),
				RoleCode:     &entry.RoleCode,
				Complete:     true,
				Stages:       roleVolumeStages,
			}
			if next, ok := badges.RoleVolume.NextTier(entry.Count); ok {
				nextThreshold, nextTier := next.Threshold, next.Code
				remaining := badges.RoleVolume.Remaining(entry.Count)
				roleEntryProgress.NextThreshold = &nextThreshold
				roleEntryProgress.RemainingCount = &remaining
				roleEntryProgress.NextTier = &nextTier
				roleEntryProgress.Complete = false
			}
			progress = append(progress, roleEntryProgress)
		}
	}

	return progress, nil
}

func (p OwnDashboardCategoryProgress) MarshalJSON() ([]byte, error) {
	type categoryProgressJSON struct {
		Family         string  `json:"family"`
		CurrentTier    string  `json:"current_tier"`
		CurrentCount   int64   `json:"current_count"`
		NextThreshold  *int64  `json:"next_threshold"`
		RemainingCount *int64  `json:"remaining_count"`
		NextTier       *string `json:"next_tier"`
		Complete       bool    `json:"complete"`
	}
	return json.Marshal(categoryProgressJSON{
		Family: p.Family, CurrentTier: p.CurrentTier, CurrentCount: p.CurrentCount,
		NextThreshold: p.NextThreshold, RemainingCount: p.RemainingCount, NextTier: p.NextTier,
		Complete: p.NextThreshold == nil,
	})
}
