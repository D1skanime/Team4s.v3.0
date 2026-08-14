package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/models"
)

type badgeProgressThreshold struct {
	count int64
	tier  string
}

func buildBadgeProgress(family string, currentCount int64, thresholds []badgeProgressThreshold) models.PublicMemberBadgeProgress {
	if currentCount < 0 {
		currentCount = 0
	}
	progress := models.PublicMemberBadgeProgress{Family: family, CurrentCount: currentCount, Complete: true}
	for _, threshold := range thresholds {
		if currentCount >= threshold.count {
			continue
		}
		nextThreshold, remainingCount, nextTier := threshold.count, threshold.count-currentCount, threshold.tier
		progress.NextThreshold, progress.RemainingCount, progress.NextTier = &nextThreshold, &remainingCount, &nextTier
		progress.Complete = false
		break
	}
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

	return []models.PublicMemberBadgeProgress{
		buildBadgeProgress("progress", projectCount, []badgeProgressThreshold{
			{1, "first_contribution"}, {10, "productive_bronze"}, {25, "productive_silver"}, {50, "productive_gold"},
		}),
		buildBadgeProgress("points", totalPoints, []badgeProgressThreshold{
			{1, "point_milestone_first"}, {50, "point_milestone_active"}, {200, "point_milestone_experienced"},
			{500, "point_milestone_engaged"}, {1000, "point_milestone_veteran"}, {2500, "point_milestone_legend"},
		}),
		buildBadgeProgress("contribution_projects", projectsCount, []badgeProgressThreshold{{1, "bronze"}, {5, "silver"}, {15, "gold"}}),
		buildBadgeProgress("contribution_chronicle", chronicleCount, []badgeProgressThreshold{{10, "bronze"}, {50, "silver"}, {150, "gold"}}),
		buildBadgeProgress("contribution_archivist", archivistCount, []badgeProgressThreshold{{10, "bronze"}, {50, "silver"}, {150, "gold"}}),
		buildBadgeProgress("membership", membershipYears, []badgeProgressThreshold{
			{5, "long_term_member"}, {7, "membership_7_years"}, {10, "membership_10_years"},
		}),
	}, nil
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
