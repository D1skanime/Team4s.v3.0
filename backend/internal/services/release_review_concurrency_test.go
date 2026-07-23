package services

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

type releaseReviewBarrierAdapter struct {
	delegate ReviewTargetAdapter
	loaded   chan struct{}
	release  <-chan struct{}
}

func (a *releaseReviewBarrierAdapter) LoadForDecision(
	ctx context.Context,
	db repository.DBTX,
	ref ReviewTargetRef,
) (ReviewTarget, error) {
	target, err := a.delegate.LoadForDecision(ctx, db, ref)
	if err != nil {
		return ReviewTarget{}, err
	}
	a.loaded <- struct{}{}
	select {
	case <-a.release:
		return target, nil
	case <-ctx.Done():
		return ReviewTarget{}, ctx.Err()
	}
}

func (a *releaseReviewBarrierAdapter) ApplyDecision(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	decision ReviewDecision,
) error {
	return a.delegate.ApplyDecision(ctx, db, target, decision)
}

func TestReleaseReviewConcurrentFirstDecisionWins(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	seedReleaseReviewContributionRule(t, fx)
	source := fx.submitNote(
		t, 501, 11, nil, time.Date(2026, 7, 23, 21, 0, 0, 0, time.UTC),
	)
	registry := ReleaseReviewAdapters()
	loaded := make(chan struct{}, 2)
	release := make(chan struct{})
	registry[ReleaseVersionNoteReviewSourceType] = &releaseReviewBarrierAdapter{
		delegate: registry[ReleaseVersionNoteReviewSourceType],
		loaded:   loaded,
		release:  release,
	}
	service := NewReviewService(fx.pool, registry)
	commands := []ReviewDecisionCommand{
		{
			Actor: permissions.Actor{AppUserID: 12, Status: "active"},
			Target: ReviewTargetRef{
				SourceType: source.SourceType,
				StableKey:  source.StableKey,
			},
			Decision: ReviewDecisionConfirm,
		},
		{
			Actor: permissions.Actor{AppUserID: 12, Status: "active"},
			Target: ReviewTargetRef{
				SourceType: source.SourceType,
				StableKey:  source.StableKey,
			},
			Decision:          ReviewDecisionReject,
			RejectionCategory: "quality.mismatch",
			RejectReason:      "Der Inhalt benötigt eine nachvollziehbare Korrektur.",
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	results := make(chan error, len(commands))
	var ready sync.WaitGroup
	ready.Add(len(commands))
	for _, command := range commands {
		command := command
		go func() {
			ready.Done()
			_, err := service.Decide(ctx, command)
			results <- err
		}()
	}
	ready.Wait()
	for range commands {
		select {
		case <-loaded:
		case <-time.After(2 * time.Second):
			close(release)
			for range commands {
				<-results
			}
			t.Fatal("both transactions did not load the same pending revision before arbitration")
		}
	}
	close(release)

	var successes, conflicts int
	for range commands {
		err := <-results
		switch {
		case err == nil:
			successes++
		case errors.Is(err, ErrReviewAlreadyDecided):
			conflicts++
		default:
			t.Fatalf("unexpected concurrent result: %v", err)
		}
	}
	assert.Equal(t, 1, successes)
	assert.Equal(t, 1, conflicts)
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM review_decisions
		WHERE source_type = 'release_version_note' AND source_key = '501'
	`))
	assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_review_lifecycle_sources WHERE review_state = 'pending'
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_review_lifecycle_sources WHERE review_state <> 'pending'
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM review_credit_slots
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM point_ledger_entries WHERE source_type = 'review_decision'
	`))

	var decision string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT decision
		FROM review_decisions
		WHERE source_type = 'release_version_note' AND source_key = '501'
	`).Scan(&decision))
	if decision == string(ReviewDecisionConfirm) {
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM release_version_note_review_lifecycle
			WHERE release_version_note_id = 501 AND review_state = 'confirmed'
		`))
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM release_version_notes
			WHERE id = 501 AND visibility = 'public' AND status = 'published'
		`))
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries
			WHERE source_type = 'release_version_note'
		`))
		assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM review_reason_texts
		`))
	} else {
		assert.Equal(t, string(ReviewDecisionReject), decision)
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM release_version_note_review_lifecycle
			WHERE release_version_note_id = 501 AND review_state = 'rejected'
		`))
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM release_version_notes
			WHERE id = 501 AND visibility = 'internal' AND status = 'draft'
		`))
		assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries
			WHERE source_type = 'release_version_note'
		`))
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM review_reason_texts WHERE reason_kind = 'reject'
		`))
	}
}

var _ ReviewTargetAdapter = (*releaseReviewBarrierAdapter)(nil)
