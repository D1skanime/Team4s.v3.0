package services

import (
    "context"
    "errors"
    "fmt"
    "strconv"
    "time"

    "github.com/jackc/pgx/v5"
    "team4s.v3/backend/internal/repository"
)

const (
    releaseMetadataCreditRuleCode = "release_metadata_complete"
    releaseMetadataCreditRuleVer  = 1
)

// ReleaseMetadataCreditService awards the single completion bonus for a release version.
type ReleaseMetadataCreditService struct {
    starter PointTxStarter
    points  *PointService
    now     func() time.Time
}

func NewReleaseMetadataCreditService(starter PointTxStarter) *ReleaseMetadataCreditService {
    return &ReleaseMetadataCreditService{starter: starter, points: NewPointService(nil), now: time.Now}
}

func (s *ReleaseMetadataCreditService) AwardIfCompleted(ctx context.Context, versionID, actorAppUserID int64) error {
    if s == nil || s.starter == nil || actorAppUserID <= 0 || versionID <= 0 {
        return fmt.Errorf("award release metadata completion: %w", repository.ErrValidation)
    }
    tx, err := s.starter.Begin(ctx)
    if err != nil { return fmt.Errorf("award release metadata completion begin: %w", err) }
    defer func() { _ = tx.Rollback(ctx) }()

    var releaseVersionID int64
    var startedOn, completedOn *time.Time
    var fansubGroupID *int64
    err = tx.QueryRow(ctx, `
SELECT rev.id, rev.production_started_on, COALESCE(rev.release_date, fr.release_date),
       (SELECT rvg.fansub_group_id FROM release_version_groups rvg WHERE rvg.release_version_id = rev.id ORDER BY rvg.fansub_group_id LIMIT 1)
FROM release_variants rv
JOIN release_versions rev ON rev.id = rv.release_version_id
JOIN fansub_releases fr ON fr.id = rev.release_id
WHERE rv.id = $1 OR rev.id = $1
ORDER BY rv.id LIMIT 1
FOR UPDATE OF rv, rev, fr`, versionID).Scan(&releaseVersionID, &startedOn, &completedOn, &fansubGroupID)
    if errors.Is(err, pgx.ErrNoRows) { return repository.ErrNotFound }
    if err != nil { return fmt.Errorf("award release metadata completion load: %w", err) }
    if startedOn == nil || completedOn == nil { return tx.Commit(ctx) }

    sourceKey := "release-version:" + strconv.FormatInt(releaseVersionID, 10) + ":metadata-complete"
    var alreadyAwarded bool
    if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM point_ledger_entries WHERE source_type = 'release_metadata' AND source_key = $1 AND entry_kind = 'award')`, sourceKey).Scan(&alreadyAwarded); err != nil {
        return fmt.Errorf("award release metadata completion check: %w", err)
    }
    if alreadyAwarded { return tx.Commit(ctx) }

    var memberID int64
    err = tx.QueryRow(ctx, `SELECT member_id FROM member_claims WHERE app_user_id = $1 AND claim_status = 'verified' ORDER BY verified_at DESC NULLS LAST, id DESC LIMIT 1`, actorAppUserID).Scan(&memberID)
    if errors.Is(err, pgx.ErrNoRows) { return tx.Commit(ctx) }
    if err != nil { return fmt.Errorf("award release metadata completion member: %w", err) }

    actorID := actorAppUserID
    if _, err = s.points.CreditInTx(ctx, tx, CreditCommand{
        MemberID: memberID, ActorAppUserID: &actorID, FansubGroupID: fansubGroupID, ReleaseVersionID: &releaseVersionID,
        Source: SourceRef{RewardKind: RewardKindWork, Type: "release_metadata", Key: sourceKey, Slot: "completion"},
        Rule: RuleRef{Code: releaseMetadataCreditRuleCode, Version: releaseMetadataCreditRuleVer}, EffectiveAt: s.now(),
    }); err != nil { return err }
    if err = tx.Commit(ctx); err != nil { return fmt.Errorf("award release metadata completion commit: %w", err) }
    return nil
}