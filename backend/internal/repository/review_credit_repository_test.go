package repository_test

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPhase107ReviewCreditConcurrent(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	ctx := context.Background()
	stableKey := "release:41:note:7"
	decisionID := insertPhase107CreditDecision(t, pool, stableKey, 1, repository.ReviewDecisionReject)
	slotKey := repository.ReviewCreditSlotKey{
		SourceType: "release_version_note",
		StableKey:  stableKey,
		Slot:       repository.ReviewCreditSlotReject,
	}

	txs := make([]pgx.Tx, 2)
	for index := range txs {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		txs[index] = tx
	}
	type concurrentResult struct {
		awarded bool
		err     error
	}
	results := make(chan concurrentResult, 2)
	start := make(chan struct{})
	var ready sync.WaitGroup
	ready.Add(2)
	for index, reviewer := range []phase107CreditReviewer{
		{appUserID: 11, memberID: 101},
		{appUserID: 12, memberID: 102},
	} {
		go func(tx pgx.Tx, reviewer phase107CreditReviewer) {
			defer tx.Rollback(ctx)
			ready.Done()
			<-start
			awarded, err := createPhase107ReviewCredit(ctx, tx, slotKey, decisionID, reviewer)
			if err == nil {
				err = tx.Commit(ctx)
			}
			results <- concurrentResult{awarded: awarded, err: err}
		}(txs[index], reviewer)
	}
	ready.Wait()
	close(start)

	var awards int
	for range 2 {
		result := <-results
		require.NoError(t, result.err)
		if result.awarded {
			awards++
		}
	}
	assert.Equal(t, 1, awards)
	assertPhase107CreditCounts(t, pool, slotKey, 1, 1)
}

func TestPhase107ReviewCreditRejectConfirm(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	ctx := context.Background()
	stableKey := "release:42:image:8"
	rejectID := insertPhase107CreditDecision(t, pool, stableKey, 1, repository.ReviewDecisionReject)
	confirmID := insertPhase107CreditDecision(t, pool, stableKey, 2, repository.ReviewDecisionConfirm)
	reviewer := phase107CreditReviewer{appUserID: 11, memberID: 101}

	for _, testCase := range []struct {
		slot       repository.ReviewCreditSlot
		decisionID int64
	}{
		{slot: repository.ReviewCreditSlotReject, decisionID: rejectID},
		{slot: repository.ReviewCreditSlotConfirm, decisionID: confirmID},
	} {
		slotKey := repository.ReviewCreditSlotKey{
			SourceType: "release_version_image",
			StableKey:  stableKey,
			Slot:       testCase.slot,
		}
		awarded := runPhase107ReviewCreditTx(t, pool, slotKey, testCase.decisionID, reviewer)
		assert.True(t, awarded)
	}

	var slotCount, ledgerCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT count(*) FROM review_credit_slots
		WHERE source_type = 'release_version_image' AND source_key = $1
	`, stableKey).Scan(&slotCount))
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT count(*) FROM point_ledger_entries
		WHERE source_type = 'review_decision' AND source_key = $1
	`, stableKey).Scan(&ledgerCount))
	assert.Equal(t, 2, slotCount)
	assert.Equal(t, 2, ledgerCount)
}

func TestPhase107ReviewCreditAcrossRevisions(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	stableKey := "release:43:note:9"
	firstDecisionID := insertPhase107CreditDecision(t, pool, stableKey, 1, repository.ReviewDecisionReject)
	secondDecisionID := insertPhase107CreditDecision(t, pool, stableKey, 2, repository.ReviewDecisionReject)
	slotKey := repository.ReviewCreditSlotKey{
		SourceType: "release_version_note",
		StableKey:  stableKey,
		Slot:       repository.ReviewCreditSlotReject,
	}

	assert.True(t, runPhase107ReviewCreditTx(
		t, pool, slotKey, firstDecisionID, phase107CreditReviewer{appUserID: 11, memberID: 101},
	))
	assert.False(t, runPhase107ReviewCreditTx(
		t, pool, slotKey, secondDecisionID, phase107CreditReviewer{appUserID: 12, memberID: 102},
	))
	assertPhase107CreditCounts(t, pool, slotKey, 1, 1)
}

func TestPhase107ReviewCreditIndependent(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	reviewer := phase107CreditReviewer{appUserID: 11, memberID: 101}

	for index, stableKey := range []string{"release:44:image:10", "release:44:image:11"} {
		decisionID := insertPhase107CreditDecision(
			t, pool, stableKey, int64(index+1), repository.ReviewDecisionReject,
		)
		slotKey := repository.ReviewCreditSlotKey{
			SourceType: "release_version_image",
			StableKey:  stableKey,
			Slot:       repository.ReviewCreditSlotReject,
		}
		assert.True(t, runPhase107ReviewCreditTx(t, pool, slotKey, decisionID, reviewer))
		assertPhase107CreditCounts(t, pool, slotKey, 1, 1)
	}
}

func TestPhase107ReviewCreditNoLedgerInsert(t *testing.T) {
	content, err := os.ReadFile("review_credit_repository.go")
	require.NoError(t, err)
	source := strings.ToUpper(string(content))
	assert.NotContains(t, source, "INSERT INTO POINT_LEDGER_ENTRIES")
	assert.NotContains(t, source, "UPDATE REVIEW_CREDIT_SLOTS")
	assert.NotContains(t, source, "DELETE FROM REVIEW_CREDIT_SLOTS")
	assert.NotContains(t, source, ".BEGIN(")
	assert.NotContains(t, source, ".COMMIT(")
	assert.NotContains(t, source, ".ROLLBACK(")
	assert.Contains(t, source, "PG_ADVISORY_XACT_LOCK")
	assert.Contains(t, source, "HASSLOT")
}

func TestPhase107ReviewCreditValidation(t *testing.T) {
	valid := repository.ReviewCreditSlotKey{
		SourceType: "release_version_note",
		StableKey:  "release:45:note:12",
		Slot:       repository.ReviewCreditSlotReject,
	}
	for name, mutate := range map[string]func(*repository.ReviewCreditSlotKey){
		"source": func(key *repository.ReviewCreditSlotKey) { key.SourceType = "\u00a0" },
		"key":    func(key *repository.ReviewCreditSlotKey) { key.StableKey = "\u2028" },
		"slot":   func(key *repository.ReviewCreditSlotKey) { key.Slot = "retry" },
	} {
		t.Run(name, func(t *testing.T) {
			key := valid
			mutate(&key)
			err := repository.NewReviewCreditRepository(nil).LockSlot(context.Background(), key)
			assert.ErrorIs(t, err, repository.ErrValidation)
		})
	}
}

type phase107CreditReviewer struct {
	appUserID int64
	memberID  int64
}

func createPhase107ReviewCredit(
	ctx context.Context,
	tx pgx.Tx,
	key repository.ReviewCreditSlotKey,
	decisionID int64,
	reviewer phase107CreditReviewer,
) (bool, error) {
	creditRepo := repository.NewReviewCreditRepository(tx)
	if err := creditRepo.LockSlot(ctx, key); err != nil {
		return false, err
	}
	hasSlot, err := creditRepo.HasSlot(ctx, key)
	if err != nil || hasSlot {
		return false, err
	}

	entry, err := services.NewPointService(nil).CreditInTx(ctx, tx, services.CreditCommand{
		MemberID:       reviewer.memberID,
		ActorAppUserID: phase107CreditInt64Ptr(reviewer.appUserID),
		FansubGroupID:  phase107CreditInt64Ptr(21),
		Source: services.SourceRef{
			RewardKind: services.RewardKindReview,
			Type:       "review_decision",
			Key:        key.StableKey,
			Slot:       string(key.Slot),
		},
		Rule:        services.RuleRef{Code: "review.decision", Version: 1},
		EffectiveAt: time.Date(2026, 7, 23, 14, 45, 0, 123456789, time.UTC),
	})
	if err != nil {
		return false, err
	}
	_, err = creditRepo.InsertSlot(ctx, repository.ReviewCreditSlotInput{
		ReviewCreditSlotKey: key,
		ReviewerMemberID:    reviewer.memberID,
		ReviewDecisionID:    decisionID,
		PointLedgerEntryID:  entry.ID,
		CreatedAt:           time.Date(2026, 7, 23, 14, 45, 1, 123456789, time.UTC),
	})
	return err == nil, err
}

func runPhase107ReviewCreditTx(
	t *testing.T,
	pool *pgxpool.Pool,
	key repository.ReviewCreditSlotKey,
	decisionID int64,
	reviewer phase107CreditReviewer,
) bool {
	t.Helper()
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx)
	awarded, err := createPhase107ReviewCredit(ctx, tx, key, decisionID, reviewer)
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	return awarded
}

func insertPhase107CreditDecision(
	t *testing.T,
	pool *pgxpool.Pool,
	stableKey string,
	revision int64,
	decision repository.ReviewDecision,
) int64 {
	t.Helper()
	var category *repository.ReviewRejectionCategory
	if decision == repository.ReviewDecisionReject {
		value := repository.ReviewRejectionCategory("quality.mismatch")
		category = &value
	}
	row, err := repository.NewReviewDecisionRepository(pool).InsertDecision(
		context.Background(),
		repository.ReviewDecisionInput{
			SourceType:        "release_version_note",
			StableKey:         stableKey,
			SourceRevision:    revision,
			ReviewKind:        repository.ReviewKindText,
			Decision:          decision,
			RejectionCategory: category,
			FansubGroupID:     21,
			ReviewerAppUserID: 11,
			ReviewerMemberID:  phase107CreditInt64Ptr(101),
			DecidedAt:         time.Date(2026, 7, 23, 14, 44, 0, 123456789, time.UTC),
		},
	)
	require.NoError(t, err)
	return row.ID
}

func assertPhase107CreditCounts(
	t *testing.T,
	pool *pgxpool.Pool,
	key repository.ReviewCreditSlotKey,
	wantSlots int,
	wantLedgerEntries int,
) {
	t.Helper()
	var slotCount, ledgerCount int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM review_credit_slots
		WHERE source_type = $1 AND source_key = $2 AND credit_slot = $3
	`, key.SourceType, key.StableKey, key.Slot).Scan(&slotCount))
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM point_ledger_entries
		WHERE source_type = 'review_decision' AND source_key = $1 AND idempotency_key LIKE $2
	`, key.StableKey, "%|slot:"+string(key.Slot)).Scan(&ledgerCount))
	assert.Equal(t, wantSlots, slotCount)
	assert.Equal(t, wantLedgerEntries, ledgerCount)
}

func seedPhase107CreditFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(id) VALUES (101), (102);
		INSERT INTO app_users(id, status) VALUES (11, 'active'), (12, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
	`)
	require.NoError(t, err)
}

func openPhase107CreditPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0134_review_foundation.up.sql"),
	)
	return pool
}

func phase107CreditInt64Ptr(value int64) *int64 {
	return &value
}
