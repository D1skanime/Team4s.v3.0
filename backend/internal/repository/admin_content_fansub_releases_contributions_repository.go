package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EffectiveContributionRow struct {
	ContributionID  int64    `json:"contribution_id"`
	MemberID        int64    `json:"member_id"`
	MemberName      string   `json:"member_display_name"`
	MemberAvatarURL *string  `json:"member_avatar_url,omitempty"`
	RoleCodes       []string `json:"role_codes"`
}

type EffectiveContributionsResult struct {
	Rows         []EffectiveContributionRow `json:"data"`
	SnapshotMode string                     `json:"snapshot_mode"`
}

type FansubReleasesContributionsRepository struct {
	snapshots *ReleaseCrewSnapshotRepository
}

func NewFansubReleasesContributionsRepository(db *pgxpool.Pool) *FansubReleasesContributionsRepository {
	return &FansubReleasesContributionsRepository{
		snapshots: NewReleaseCrewSnapshotRepository(db),
	}
}

// ListEffectiveContributionsForVersion returns only the complete persisted,
// confirmed snapshot. It never substitutes current project contributions.
func (r *FansubReleasesContributionsRepository) ListEffectiveContributionsForVersion(
	ctx context.Context,
	releaseVersionID int64,
	fansubGroupID int64,
) (*EffectiveContributionsResult, error) {
	if releaseVersionID <= 0 || fansubGroupID <= 0 {
		return nil, ErrNotFound
	}
	snapshot, err := r.snapshots.LoadComplete(ctx, releaseVersionID, fansubGroupID)
	if errors.Is(err, ErrNotFound) {
		exists, contextErr := r.snapshots.ReleaseContextExists(ctx, releaseVersionID, fansubGroupID)
		if contextErr != nil {
			return nil, contextErr
		}
		if !exists {
			return nil, ErrNotFound
		}
		return &EffectiveContributionsResult{
			Rows:         []EffectiveContributionRow{},
			SnapshotMode: SnapshotModeUninitialized,
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf(
			"list effective contributions version=%d group=%d: %w",
			releaseVersionID,
			fansubGroupID,
			err,
		)
	}
	rows := make([]EffectiveContributionRow, 0, len(snapshot.Rows))
	for _, stored := range snapshot.Rows {
		rows = append(rows, EffectiveContributionRow{
			ContributionID:  stored.ContributionID,
			MemberID:        stored.MemberID,
			MemberName:      stored.MemberName,
			MemberAvatarURL: stored.MemberAvatarURL,
			RoleCodes:       stored.RoleCodes,
		})
	}
	return &EffectiveContributionsResult{
		Rows:         rows,
		SnapshotMode: snapshot.Mode,
	}, nil
}
