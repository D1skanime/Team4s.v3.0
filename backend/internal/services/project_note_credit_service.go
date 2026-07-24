package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/repository"
)

const (
	projectNoteCreditRuleCode = "project_text_first_author"
	projectNoteCreditRuleVer  = 1
)

// ProjectNoteCreditService owns canonical note mutation and the complete
// first-author credit lifecycle in one transaction.
type ProjectNoteCreditService struct {
	starter PointTxStarter
	notes   *repository.FansubNotesRepository
	points  *PointService
	now     func() time.Time
}

func NewProjectNoteCreditService(
	starter PointTxStarter,
	notes *repository.FansubNotesRepository,
) *ProjectNoteCreditService {
	return &ProjectNoteCreditService{
		starter: starter,
		notes:   notes,
		points:  NewPointService(nil),
		now:     time.Now,
	}
}

func (s *ProjectNoteCreditService) Upsert(
	ctx context.Context,
	animeID int64,
	fansubGroupID int64,
	actorAppUserID int64,
	req repository.UpsertAnimeFansubProjectNoteRequest,
) (*repository.AnimeFansubProjectNote, error) {
	if s == nil || s.starter == nil || s.notes == nil || actorAppUserID <= 0 {
		return nil, fmt.Errorf("upsert project note credit: %w", repository.ErrValidation)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("upsert project note credit begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err = lockProjectNoteCreditContext(ctx, tx, animeID, fansubGroupID); err != nil {
		return nil, err
	}
	wasNonEmpty, err := activeProjectNoteHasText(ctx, tx, animeID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	note, err := s.notes.UpsertAnimeFansubProjectNoteInTx(
		ctx, tx, animeID, fansubGroupID, actorAppUserID, req,
	)
	if err != nil {
		return nil, err
	}
	if !wasNonEmpty && strings.TrimSpace(req.BodyText) != "" {
		if err = s.consumeFirstAuthorGeneration(ctx, tx, animeID, fansubGroupID, actorAppUserID); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("upsert project note credit commit: %w", err)
	}
	return note, nil
}

func (s *ProjectNoteCreditService) Delete(
	ctx context.Context,
	noteID int64,
	animeID int64,
	fansubGroupID int64,
	actorAppUserID int64,
) error {
	if s == nil || s.starter == nil || s.notes == nil || actorAppUserID <= 0 {
		return fmt.Errorf("delete project note credit: %w", repository.ErrValidation)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return fmt.Errorf("delete project note credit begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err = lockProjectNoteCreditContext(ctx, tx, animeID, fansubGroupID); err != nil {
		return err
	}
	if err = s.notes.DeleteAnimeFansubProjectNoteInTx(
		ctx, tx, noteID, animeID, fansubGroupID, actorAppUserID,
	); err != nil {
		return err
	}
	var lifecycleID, awardEntryID int64
	err = tx.QueryRow(ctx, `
SELECT id, award_entry_id
FROM project_note_credit_lifecycles
WHERE anime_id = $1
  AND fansub_group_id = $2
  AND lifecycle_status = 'awarded'
ORDER BY generation DESC
LIMIT 1
FOR UPDATE`, animeID, fansubGroupID).Scan(&lifecycleID, &awardEntryID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("delete project note credit lock lifecycle: %w", err)
	}
	if err == nil {
		reversal, reverseErr := s.points.ReverseInTx(ctx, tx, ReverseCommand{
			AwardEntryID: awardEntryID, ActorAppUserID: actorAppUserID,
			Reason: "project note deleted", EffectiveAt: s.now(),
		})
		if reverseErr != nil {
			return reverseErr
		}
		tag, updateErr := tx.Exec(ctx, `
UPDATE project_note_credit_lifecycles
SET lifecycle_status = 'reversed', reversal_entry_id = $2, updated_at = NOW()
WHERE id = $1 AND lifecycle_status = 'awarded'`, lifecycleID, reversal.ID)
		if updateErr != nil {
			return fmt.Errorf("delete project note credit reverse lifecycle: %w", updateErr)
		}
		if tag.RowsAffected() != 1 {
			return fmt.Errorf("delete project note credit reverse lifecycle: %w", repository.ErrConflict)
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("delete project note credit commit: %w", err)
	}
	return nil
}

func (s *ProjectNoteCreditService) consumeFirstAuthorGeneration(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	fansubGroupID int64,
	actorAppUserID int64,
) error {
	var generation int
	if err := tx.QueryRow(ctx, `
SELECT COALESCE(MAX(generation), 0) + 1
FROM project_note_credit_lifecycles
WHERE anime_id = $1 AND fansub_group_id = $2`, animeID, fansubGroupID).Scan(&generation); err != nil {
		return fmt.Errorf("project note credit next generation: %w", err)
	}

	memberID, linked, err := resolveProjectNoteAuthorMember(ctx, tx, actorAppUserID)
	if err != nil {
		return err
	}
	if !linked {
		_, err = tx.Exec(ctx, `
INSERT INTO project_note_credit_lifecycles (
    anime_id, fansub_group_id, first_author_app_user_id,
    first_author_member_id, generation, lifecycle_status
) VALUES ($1, $2, $3, NULL, $4, 'skipped_no_member')`,
			animeID, fansubGroupID, actorAppUserID, generation)
		if err != nil {
			return fmt.Errorf("project note credit consume unlinked generation: %w", err)
		}
		return nil
	}

	var lifecycleID int64
	err = tx.QueryRow(ctx, `
INSERT INTO project_note_credit_lifecycles (
    anime_id, fansub_group_id, first_author_app_user_id,
    first_author_member_id, generation, lifecycle_status
) VALUES ($1, $2, $3, $4, $5, 'pending')
RETURNING id`, animeID, fansubGroupID, actorAppUserID, memberID, generation).Scan(&lifecycleID)
	if err != nil {
		return fmt.Errorf("project note credit insert pending generation: %w", err)
	}
	actorID, groupID := actorAppUserID, fansubGroupID
	award, err := s.points.CreditInTx(ctx, tx, CreditCommand{
		MemberID: memberID, ActorAppUserID: &actorID, FansubGroupID: &groupID,
		Source: SourceRef{
			RewardKind: RewardKindWork,
			Type:       "project_text",
			Key:        strconv.FormatInt(animeID, 10) + ":" + strconv.FormatInt(fansubGroupID, 10) + ":" + strconv.Itoa(generation),
			Slot:       "first_author",
		},
		Rule:        RuleRef{Code: projectNoteCreditRuleCode, Version: projectNoteCreditRuleVer},
		EffectiveAt: s.now(),
	})
	if err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `
UPDATE project_note_credit_lifecycles
SET lifecycle_status = 'awarded', award_entry_id = $2, updated_at = NOW()
WHERE id = $1 AND lifecycle_status = 'pending'`, lifecycleID, award.ID)
	if err != nil {
		return fmt.Errorf("project note credit award lifecycle: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return fmt.Errorf("project note credit award lifecycle: %w", repository.ErrConflict)
	}
	return nil
}

func lockProjectNoteCreditContext(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	fansubGroupID int64,
) error {
	if _, err := tx.Exec(ctx, `
SELECT pg_advisory_xact_lock(hashtextextended(
    'project-note:' || $1::text || ':' || $2::text, 0
))`, animeID, fansubGroupID); err != nil {
		return fmt.Errorf("lock project note credit context: %w", err)
	}
	return nil
}

func activeProjectNoteHasText(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	fansubGroupID int64,
) (bool, error) {
	var bodyText string
	err := tx.QueryRow(ctx, `
SELECT body_text
FROM anime_fansub_project_notes
WHERE anime_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL
FOR UPDATE`, animeID, fansubGroupID).Scan(&bodyText)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("lock active project note: %w", err)
	}
	return strings.TrimSpace(bodyText) != "", nil
}

func resolveProjectNoteAuthorMember(
	ctx context.Context,
	tx pgx.Tx,
	actorAppUserID int64,
) (int64, bool, error) {
	var memberID int64
	err := tx.QueryRow(ctx, `
SELECT member_id
FROM member_claims
WHERE app_user_id = $1
  AND claim_status = 'verified'
ORDER BY verified_at DESC NULLS LAST, id DESC
LIMIT 1`, actorAppUserID).Scan(&memberID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("resolve project note author member: %w", err)
	}
	return memberID, true, nil
}
