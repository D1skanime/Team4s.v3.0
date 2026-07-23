package repository

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPhase107ReviewDecisionFirstWins(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	seedPhase107DecisionFixture(t, pool)
	ctx := context.Background()
	input := phase107DecisionInput("release-note:41", 1, ReviewDecisionConfirm, nil)

	first, err := NewReviewDecisionRepository(pool).InsertDecision(ctx, input)
	require.NoError(t, err)
	require.Positive(t, first.ID)

	second, err := NewReviewDecisionRepository(pool).InsertDecision(ctx, input)
	assert.Nil(t, second)
	assert.ErrorIs(t, err, ErrConflict)

	var count int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT count(*)
		FROM review_decisions
		WHERE source_type = $1 AND source_key = $2 AND source_revision = $3
	`, input.SourceType, input.StableKey, input.SourceRevision).Scan(&count))
	assert.Equal(t, 1, count)
}

func TestPhase107ReviewDecisionConcurrent(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	seedPhase107DecisionFixture(t, pool)
	ctx := context.Background()

	confirm := phase107DecisionInput("release-image:52", 3, ReviewDecisionConfirm, nil)
	category := ReviewRejectionCategory("quality.mismatch")
	reject := phase107DecisionInput("release-image:52", 3, ReviewDecisionReject, &category)

	start := make(chan struct{})
	type concurrentResult struct {
		row *ReviewDecisionRow
		err error
	}
	results := make(chan concurrentResult, 2)
	var ready sync.WaitGroup
	ready.Add(2)
	for _, input := range []ReviewDecisionInput{confirm, reject} {
		go func(input ReviewDecisionInput) {
			tx, err := pool.Begin(ctx)
			if err != nil {
				results <- concurrentResult{err: err}
				return
			}
			defer tx.Rollback(ctx)
			ready.Done()
			<-start
			row, insertErr := NewReviewDecisionRepository(tx).InsertDecision(ctx, input)
			if insertErr == nil {
				insertErr = tx.Commit(ctx)
			}
			results <- concurrentResult{row: row, err: insertErr}
		}(input)
	}
	ready.Wait()
	close(start)

	gotResults := []concurrentResult{<-results, <-results}
	var winners, conflicts int
	for _, result := range gotResults {
		switch {
		case result.err == nil:
			winners++
			require.NotNil(t, result.row)
		case errors.Is(result.err, ErrConflict):
			conflicts++
			assert.Nil(t, result.row)
		default:
			t.Fatalf("unexpected concurrent decision error: %v", result.err)
		}
	}
	assert.Equal(t, 1, winners)
	assert.Equal(t, 1, conflicts)

	var count int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT count(*)
		FROM review_decisions
		WHERE source_type = 'release_version_note'
		  AND source_key = 'release-image:52'
		  AND source_revision = 3
	`).Scan(&count))
	assert.Equal(t, 1, count)
}

func TestPhase107ReviewDecisionSameActor(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	seedPhase107DecisionFixture(t, pool)
	ctx := context.Background()
	category := ReviewRejectionCategory(" content.incomplete ")
	input := phase107DecisionInput("release-note:63", 2, ReviewDecisionReject, &category)

	first, err := NewReviewDecisionRepository(pool).InsertDecision(ctx, input)
	require.NoError(t, err)
	assert.Equal(t, ReviewRejectionCategory("content.incomplete"), *first.RejectionCategory)

	retry, err := NewReviewDecisionRepository(pool).InsertDecision(ctx, input)
	assert.Nil(t, retry)
	assert.ErrorIs(t, err, ErrConflict)
}

func TestPhase107ReviewDecisionIndependent(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	seedPhase107DecisionFixture(t, pool)
	ctx := context.Background()
	repo := NewReviewDecisionRepository(pool)

	for _, input := range []ReviewDecisionInput{
		phase107DecisionInput("release-note:71", 1, ReviewDecisionConfirm, nil),
		phase107DecisionInput("release-note:71", 2, ReviewDecisionConfirm, nil),
		phase107DecisionInput("release-note:72", 1, ReviewDecisionConfirm, nil),
	} {
		row, err := repo.InsertDecision(ctx, input)
		require.NoError(t, err)
		require.Positive(t, row.ID)
	}

	var count int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT count(*) FROM review_decisions
		WHERE source_type = 'release_version_note'
		  AND source_key IN ('release-note:71', 'release-note:72')
	`).Scan(&count))
	assert.Equal(t, 3, count)
}

func TestPhase107ReviewDecisionValidation(t *testing.T) {
	category := ReviewRejectionCategory("quality.mismatch")
	valid := phase107DecisionInput("release-note:81", 1, ReviewDecisionReject, &category)
	cases := map[string]func(*ReviewDecisionInput){
		"source type":       func(input *ReviewDecisionInput) { input.SourceType = "\u00a0" },
		"stable key":        func(input *ReviewDecisionInput) { input.StableKey = "\u2028" },
		"revision":          func(input *ReviewDecisionInput) { input.SourceRevision = 0 },
		"review kind":       func(input *ReviewDecisionInput) { input.ReviewKind = "unknown" },
		"decision":          func(input *ReviewDecisionInput) { input.Decision = "unknown" },
		"group":             func(input *ReviewDecisionInput) { input.FansubGroupID = 0 },
		"reviewer app user": func(input *ReviewDecisionInput) { input.ReviewerAppUserID = 0 },
		"reviewer member":   func(input *ReviewDecisionInput) { input.ReviewerMemberID = phase107Int64Ptr(0) },
		"decided at":        func(input *ReviewDecisionInput) { input.DecidedAt = time.Time{} },
		"reject category": func(input *ReviewDecisionInput) {
			blank := ReviewRejectionCategory("\u2003")
			input.RejectionCategory = &blank
		},
		"reject no category": func(input *ReviewDecisionInput) { input.RejectionCategory = nil },
		"confirm category": func(input *ReviewDecisionInput) {
			input.Decision = ReviewDecisionConfirm
			input.RejectionCategory = &category
		},
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			db := &phase107DelegationDB{
				row: phase107DelegationRow(func(...any) error {
					return errors.New("unexpected database call during validation")
				}),
			}
			input := valid
			mutate(&input)
			row, err := NewReviewDecisionRepository(db).InsertDecision(context.Background(), input)
			assert.Nil(t, row)
			assert.ErrorIs(t, err, ErrValidation)
			assert.Empty(t, db.query, "invalid decision must not query the database")
			assert.Empty(t, db.execQueries, "invalid decision must not execute database statements")
		})
	}
}

func phase107DecisionInput(
	stableKey string,
	revision int64,
	decision ReviewDecision,
	category *ReviewRejectionCategory,
) ReviewDecisionInput {
	return ReviewDecisionInput{
		SourceType:         "release_version_note",
		StableKey:          stableKey,
		SourceRevision:     revision,
		ReviewKind:         ReviewKindText,
		Decision:           decision,
		RejectionCategory:  category,
		FansubGroupID:      21,
		ReviewerAppUserID:  11,
		ReviewerMemberID:   phase107Int64Ptr(101),
		IsPlatformOverride: false,
		DecidedAt:          time.Date(2026, 7, 23, 14, 30, 0, 123456789, time.UTC),
	}
}

func seedPhase107DecisionFixture(t *testing.T, db DBTX) {
	t.Helper()
	_, err := db.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status) VALUES (11, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
	`)
	require.NoError(t, err)
}

func phase107Int64Ptr(value int64) *int64 {
	return &value
}
