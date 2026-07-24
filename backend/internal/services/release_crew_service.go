package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/repository"
)

const (
	releaseRoleRuleCode    = "release_role_work"
	releaseRoleRuleVersion = 1
)

type ReleaseCrewReplaceCommand struct {
	ReleaseVersionID int64
	FansubGroupID    int64
	ActorAppUserID   int64
	Rows             []repository.ReleaseCrewRow
}

type ConfirmContributionCommand struct {
	FansubGroupID, ContributionID, ActorAppUserID int64
	MemberID                                      *int64
	ForbidSelfCreated                             bool
}

type ProjectRosterMutationCommand struct {
	FansubGroupID, AnimeID, ActorAppUserID int64
	Mutation                               repository.ProjectRosterMutation
}

type ReleaseCrewService struct {
	starter PointTxStarter
	points  *PointService
	now     func() time.Time
}

func NewReleaseCrewService(starter PointTxStarter, points *PointService) *ReleaseCrewService {
	if points == nil {
		points = NewPointService(nil)
	}
	return &ReleaseCrewService{starter: starter, points: points, now: time.Now}
}

type releaseCrewUnit struct {
	MemberID int64
	RoleCode string
}

func flattenReleaseCrewRows(rows []repository.ReleaseCrewRow) []releaseCrewUnit {
	seen := map[releaseCrewUnit]struct{}{}
	for _, row := range rows {
		for _, role := range row.RoleCodes {
			if row.MemberID > 0 && role != "" {
				seen[releaseCrewUnit{MemberID: row.MemberID, RoleCode: role}] = struct{}{}
			}
		}
	}
	out := make([]releaseCrewUnit, 0, len(seen))
	for unit := range seen {
		out = append(out, unit)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].MemberID == out[j].MemberID {
			return out[i].RoleCode < out[j].RoleCode
		}
		return out[i].MemberID < out[j].MemberID
	})
	return out
}

func diffReleaseCrewUnits(before, after []releaseCrewUnit) (removed, unchanged, added []releaseCrewUnit) {
	old, next := map[releaseCrewUnit]struct{}{}, map[releaseCrewUnit]struct{}{}
	for _, unit := range before {
		old[unit] = struct{}{}
	}
	for _, unit := range after {
		next[unit] = struct{}{}
	}
	for _, unit := range before {
		if _, ok := next[unit]; ok {
			unchanged = append(unchanged, unit)
		} else {
			removed = append(removed, unit)
		}
	}
	for _, unit := range after {
		if _, ok := old[unit]; !ok {
			added = append(added, unit)
		}
	}
	return
}

func releaseCrewSourceKey(releaseVersionID, fansubGroupID int64, unit releaseCrewUnit, generation int) string {
	return fmt.Sprintf("release-version:%d:group:%d:member:%d:role:%s:generation:%d",
		releaseVersionID, fansubGroupID, unit.MemberID, unit.RoleCode, generation)
}

func (s *ReleaseCrewService) Replace(ctx context.Context, cmd ReleaseCrewReplaceCommand) (*repository.ReleaseCrewSnapshot, error) {
	if s == nil || s.starter == nil || cmd.ReleaseVersionID <= 0 || cmd.FansubGroupID <= 0 || cmd.ActorAppUserID <= 0 {
		return nil, repository.ErrValidation
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("replace release crew: begin: %w", err)
	}
	defer tx.Rollback(ctx)
	repo := repository.NewReleaseCrewSnapshotRepository(tx)
	change, err := repo.ReplaceInTx(ctx, tx, cmd.ReleaseVersionID, cmd.FansubGroupID, cmd.Rows)
	if err != nil {
		return nil, err
	}
	if err := s.applyDiff(ctx, tx, cmd.ReleaseVersionID, cmd.FansubGroupID, cmd.ActorAppUserID, change); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("replace release crew: commit: %w", err)
	}
	return &repository.ReleaseCrewSnapshot{Mode: repository.SnapshotModeIndependent, Rows: change.After}, nil
}

func (s *ReleaseCrewService) SeedCreatedReleaseInTx(ctx context.Context, tx pgx.Tx, releaseVersionID, fansubGroupID int64) error {
	repo := repository.NewReleaseCrewSnapshotRepository(tx)
	change, err := repo.SeedInheritedInTx(ctx, tx, releaseVersionID, fansubGroupID)
	if err != nil {
		return err
	}
	return s.applyDiff(ctx, tx, releaseVersionID, fansubGroupID, 0, change)
}

func (s *ReleaseCrewService) SyncProjectInTx(ctx context.Context, tx pgx.Tx, animeID, fansubGroupID, actorID int64) error {
	changes, err := repository.NewReleaseCrewSnapshotRepository(tx).SyncInheritedForProjectInTx(ctx, tx, animeID, fansubGroupID)
	if err != nil {
		return err
	}
	for i := range changes {
		if err := s.applyDiff(ctx, tx, changes[i].ReleaseVersionID, changes[i].FansubGroupID, actorID, &changes[i]); err != nil {
			return err
		}
	}
	return nil
}

func (s *ReleaseCrewService) ApplyProjectRosterMutation(ctx context.Context, cmd ProjectRosterMutationCommand) (*repository.ProjectRosterMutationResult, error) {
	if s == nil || s.starter == nil || cmd.FansubGroupID <= 0 || cmd.AnimeID <= 0 || cmd.ActorAppUserID <= 0 {
		return nil, repository.ErrValidation
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("project roster mutation: begin: %w", err)
	}
	defer tx.Rollback(ctx)
	result, err := repository.ApplyProjectRosterMutationInTx(ctx, tx, cmd.FansubGroupID, cmd.AnimeID, cmd.Mutation)
	if err != nil {
		return nil, err
	}
	if result.WasConfirmed || result.IsConfirmed {
		if err := s.SyncProjectInTx(ctx, tx, cmd.AnimeID, cmd.FansubGroupID, cmd.ActorAppUserID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("project roster mutation: commit: %w", err)
	}
	return result, nil
}

func (s *ReleaseCrewService) ConfirmContribution(ctx context.Context, cmd ConfirmContributionCommand) error {
	if s == nil || s.starter == nil || cmd.FansubGroupID <= 0 || cmd.ContributionID <= 0 || cmd.ActorAppUserID <= 0 {
		return repository.ErrValidation
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var animeID, memberID, createdBy int64
	var releaseVersionID *int64
	var status string
	err = tx.QueryRow(ctx, `
		SELECT anime_id, member_id, release_version_id, status, COALESCE(created_by,0)
		FROM anime_contributions
		WHERE id=$1 AND fansub_group_id=$2
		FOR UPDATE
	`, cmd.ContributionID, cmd.FansubGroupID).Scan(&animeID, &memberID, &releaseVersionID, &status, &createdBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return repository.ErrNotFound
	}
	if err != nil {
		return err
	}
	if status != "proposed" || (cmd.MemberID != nil && memberID != *cmd.MemberID) ||
		(cmd.ForbidSelfCreated && createdBy == cmd.ActorAppUserID) {
		return repository.ErrConflict
	}
	if _, err := tx.Exec(ctx, `
		UPDATE anime_contributions
		SET status='confirmed', confirmed_by=$2, confirmed_at=NOW(),
		    is_public_on_anime_page=true, is_public_on_member_profile=true, updated_at=NOW()
		WHERE id=$1
	`, cmd.ContributionID, cmd.ActorAppUserID); err != nil {
		return err
	}
	if releaseVersionID == nil {
		if err := s.SyncProjectInTx(ctx, tx, animeID, cmd.FansubGroupID, cmd.ActorAppUserID); err != nil {
			return err
		}
	} else {
		rows, err := loadConfirmedCrewForService(ctx, tx, *releaseVersionID, cmd.FansubGroupID)
		if err != nil {
			return err
		}
		change, err := repository.NewReleaseCrewSnapshotRepository(tx).ReplaceInTx(ctx, tx, *releaseVersionID, cmd.FansubGroupID, rows)
		if err != nil {
			return err
		}
		if err := s.applyDiff(ctx, tx, *releaseVersionID, cmd.FansubGroupID, cmd.ActorAppUserID, change); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func loadConfirmedCrewForService(ctx context.Context, tx pgx.Tx, releaseVersionID, fansubGroupID int64) ([]repository.ReleaseCrewRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT ac.member_id, ARRAY_AGG(acr.role_code ORDER BY acr.role_code)
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id=ac.id
		WHERE ac.release_version_id=$1 AND ac.fansub_group_id=$2 AND ac.status='confirmed'
		GROUP BY ac.member_id ORDER BY ac.member_id
	`, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []repository.ReleaseCrewRow
	for rows.Next() {
		var row repository.ReleaseCrewRow
		if err := rows.Scan(&row.MemberID, &row.RoleCodes); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (s *ReleaseCrewService) applyDiff(ctx context.Context, tx pgx.Tx, releaseVersionID, fansubGroupID, actorID int64, change *repository.ReleaseCrewSnapshotChange) error {
	removed, _, added := diffReleaseCrewUnits(flattenReleaseCrewRows(change.Before), flattenReleaseCrewRows(change.After))
	now := s.now().UTC()
	for _, unit := range removed {
		var lifecycleID, awardID int64
		err := tx.QueryRow(ctx, `
			SELECT id, award_entry_id
			FROM release_role_credit_lifecycles
			WHERE release_version_id=$1 AND fansub_group_id=$2 AND member_id=$3 AND role_code=$4
			  AND lifecycle_status='awarded'
			ORDER BY generation DESC LIMIT 1 FOR UPDATE
		`, releaseVersionID, fansubGroupID, unit.MemberID, unit.RoleCode).Scan(&lifecycleID, &awardID)
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			return fmt.Errorf("release crew reverse lifecycle: %w", err)
		}
		if actorID <= 0 {
			return fmt.Errorf("release crew reverse requires actor: %w", repository.ErrValidation)
		}
		reversal, err := s.points.ReverseInTx(ctx, tx, ReverseCommand{
			AwardEntryID: awardID, ActorAppUserID: actorID,
			Reason: "release crew role removed", EffectiveAt: now,
		})
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE release_role_credit_lifecycles SET lifecycle_status='reversed', reversal_entry_id=$2, updated_at=NOW() WHERE id=$1`, lifecycleID, reversal.ID); err != nil {
			return fmt.Errorf("release crew store reversal: %w", err)
		}
	}
	for _, unit := range added {
		var generation int
		var status string
		err := tx.QueryRow(ctx, `
			SELECT generation, lifecycle_status
			FROM release_role_credit_lifecycles
			WHERE release_version_id=$1 AND fansub_group_id=$2 AND member_id=$3 AND role_code=$4
			ORDER BY generation DESC LIMIT 1 FOR UPDATE
		`, releaseVersionID, fansubGroupID, unit.MemberID, unit.RoleCode).Scan(&generation, &status)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("release crew load lifecycle: %w", err)
		}
		if err == nil && status == "awarded" {
			continue
		}
		generation++
		var lifecycleID int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO release_role_credit_lifecycles
			  (release_version_id,fansub_group_id,member_id,role_code,generation,lifecycle_status)
			VALUES ($1,$2,$3,$4,$5,'pending')
			RETURNING id
		`, releaseVersionID, fansubGroupID, unit.MemberID, unit.RoleCode, generation).Scan(&lifecycleID); err != nil {
			return fmt.Errorf("release crew create lifecycle: %w", err)
		}
		groupID, versionID := fansubGroupID, releaseVersionID
		award, err := s.points.CreditInTx(ctx, tx, CreditCommand{
			MemberID: unit.MemberID, ActorAppUserID: optionalPositiveID(actorID),
			FansubGroupID: &groupID, ReleaseVersionID: &versionID,
			Source: SourceRef{RewardKind: RewardKindWork, Type: "release_role_work", Key: releaseCrewSourceKey(releaseVersionID, fansubGroupID, unit, generation), Slot: unit.RoleCode},
			Rule:   RuleRef{Code: releaseRoleRuleCode, Version: releaseRoleRuleVersion}, EffectiveAt: now,
		})
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE release_role_credit_lifecycles SET lifecycle_status='awarded', award_entry_id=$2, updated_at=NOW() WHERE id=$1`, lifecycleID, award.ID); err != nil {
			return fmt.Errorf("release crew store award: %w", err)
		}
	}
	return nil
}

func optionalPositiveID(id int64) *int64 {
	if id <= 0 {
		return nil
	}
	return &id
}
