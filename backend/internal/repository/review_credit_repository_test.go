package repository_test

import (
	"context"
	"encoding/hex"
	"fmt"
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
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPhase107ReviewCreditConcurrent(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	ctx := context.Background()
	stableKey := "release:41:note:7"
	reviewers := []phase107CreditReviewer{
		{appUserID: 11, memberID: 101},
		{appUserID: 12, memberID: 102},
	}
	decisionIDs := []int64{
		insertPhase107CreditDecision(t, pool, "release_version_note", stableKey, 1, repository.ReviewDecisionReject, reviewers[0]),
		insertPhase107CreditDecision(t, pool, "release_version_note", stableKey, 2, repository.ReviewDecisionReject, reviewers[1]),
	}
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
	for index, reviewer := range reviewers {
		go func(tx pgx.Tx, decisionID int64, reviewer phase107CreditReviewer) {
			defer tx.Rollback(ctx)
			ready.Done()
			<-start
			awarded, err := createPhase107ReviewCredit(ctx, tx, slotKey, decisionID, reviewer)
			if err == nil {
				err = tx.Commit(ctx)
			}
			results <- concurrentResult{awarded: awarded, err: err}
		}(txs[index], decisionIDs[index], reviewer)
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
	reviewer := phase107CreditReviewer{appUserID: 11, memberID: 101}
	rejectID := insertPhase107CreditDecision(
		t, pool, "release_version_image", stableKey, 1, repository.ReviewDecisionReject, reviewer,
	)
	confirmID := insertPhase107CreditDecision(
		t, pool, "release_version_image", stableKey, 2, repository.ReviewDecisionConfirm, reviewer,
	)

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
	`, phase107ReviewPointSourceKey("release_version_image", stableKey)).Scan(&ledgerCount))
	assert.Equal(t, 2, slotCount)
	assert.Equal(t, 2, ledgerCount)
}

func TestPhase107ReviewCreditAcrossRevisions(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	stableKey := "release:43:note:9"
	firstReviewer := phase107CreditReviewer{appUserID: 11, memberID: 101}
	secondReviewer := phase107CreditReviewer{appUserID: 12, memberID: 102}
	firstDecisionID := insertPhase107CreditDecision(
		t, pool, "release_version_note", stableKey, 1, repository.ReviewDecisionReject, firstReviewer,
	)
	secondDecisionID := insertPhase107CreditDecision(
		t, pool, "release_version_note", stableKey, 2, repository.ReviewDecisionReject, secondReviewer,
	)
	slotKey := repository.ReviewCreditSlotKey{
		SourceType: "release_version_note",
		StableKey:  stableKey,
		Slot:       repository.ReviewCreditSlotReject,
	}

	assert.True(t, runPhase107ReviewCreditTx(
		t, pool, slotKey, firstDecisionID, firstReviewer,
	))
	assert.False(t, runPhase107ReviewCreditTx(
		t, pool, slotKey, secondDecisionID, secondReviewer,
	))
	assertPhase107CreditCounts(t, pool, slotKey, 1, 1)
}

func TestPhase107ReviewCreditIndependent(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	reviewer := phase107CreditReviewer{appUserID: 11, memberID: 101}

	for index, stableKey := range []string{"release:44:image:10", "release:44:image:11"} {
		decisionID := insertPhase107CreditDecision(
			t, pool, "release_version_image", stableKey, int64(index+1), repository.ReviewDecisionReject, reviewer,
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
	assert.NotContains(t, source, "INSERT INTO POINT_"+"LEDGER_ENTRIES")
	assert.NotContains(t, source, "UPDATE REVIEW_"+"CREDIT_SLOTS")
	assert.NotContains(t, source, "DELETE FROM REVIEW_"+"CREDIT_SLOTS")
	assert.NotContains(t, source, ".BEGIN(")
	assert.NotContains(t, source, ".COMMIT(")
	assert.NotContains(t, source, ".ROLLBACK(")
	assert.Contains(t, source, "PG_ADVISORY_XACT_LOCK")
	assert.Contains(t, source, "HASSLOT")
}

type phase107CreditValidationRow struct{}

func (phase107CreditValidationRow) Scan(...any) error {
	return fmt.Errorf("unexpected database row scan during validation")
}

type phase107CreditValidationDB struct {
	execCalls  int
	queryCalls int
}

func (db *phase107CreditValidationDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	db.execCalls++
	return pgconn.CommandTag{}, fmt.Errorf("unexpected database exec during validation")
}

func (db *phase107CreditValidationDB) QueryRow(context.Context, string, ...any) pgx.Row {
	db.queryCalls++
	return phase107CreditValidationRow{}
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
			db := &phase107CreditValidationDB{}
			key := valid
			mutate(&key)
			err := repository.NewReviewCreditRepository(db).LockSlot(context.Background(), key)
			assert.ErrorIs(t, err, repository.ErrValidation)
			assert.Zero(t, db.execCalls, "invalid credit key must not execute database statements")
			assert.Zero(t, db.queryCalls, "invalid credit key must not query the database")
		})
	}
}

func TestPhase107ReviewCreditRelationalContract(t *testing.T) {
	pool := openPhase107CreditPool(t)
	seedPhase107CreditFixture(t, pool)
	ctx := context.Background()

	type linkedFixture struct {
		sourceType string
		stableKey  string
		slot       repository.ReviewCreditSlot
		decisionID int64
		ledgerID   int64
		reviewer   phase107CreditReviewer
	}
	createLinkedFixture := func(
		stableKey string,
		decision repository.ReviewDecision,
		reviewer phase107CreditReviewer,
	) linkedFixture {
		t.Helper()
		slot := repository.ReviewCreditSlotConfirm
		if decision == repository.ReviewDecisionReject {
			slot = repository.ReviewCreditSlotReject
		}
		decisionID := insertPhase107CreditDecision(
			t, pool, "release_version_note", stableKey, 1, decision, reviewer,
		)
		entry, err := services.NewPointService(nil).CreditInTx(ctx, pool, services.CreditCommand{
			MemberID:       reviewer.memberID,
			ActorAppUserID: phase107CreditInt64Ptr(reviewer.appUserID),
			FansubGroupID:  phase107CreditInt64Ptr(21),
			Source: services.SourceRef{
				RewardKind: services.RewardKindReview,
				Type:       "review_decision",
				Key:        phase107ReviewPointSourceKey("release_version_note", stableKey),
				Slot:       string(slot),
			},
			Rule:        services.RuleRef{Code: "review.decision", Version: 1},
			EffectiveAt: time.Date(2026, 7, 23, 15, 0, 0, 0, time.UTC),
		})
		require.NoError(t, err)
		return linkedFixture{
			sourceType: "release_version_note",
			stableKey:  stableKey,
			slot:       slot,
			decisionID: decisionID,
			ledgerID:   entry.ID,
			reviewer:   reviewer,
		}
	}
	insertSlot := func(
		fixture linkedFixture,
		sourceType, stableKey string,
		slot repository.ReviewCreditSlot,
		reviewerMemberID int64,
		decisionID *int64,
		ledgerID int64,
	) error {
		t.Helper()
		_, err := pool.Exec(ctx, `
INSERT INTO review_credit_slots (
    source_type, source_key, credit_slot, reviewer_member_id,
    review_decision_id, point_ledger_entry_id
) VALUES ($1, $2, $3, $4, $5, $6)`,
			sourceType, stableKey, slot, reviewerMemberID, decisionID, ledgerID)
		return err
	}

	reject := createLinkedFixture(
		"release:46:note:13",
		repository.ReviewDecisionReject,
		phase107CreditReviewer{appUserID: 11, memberID: 101},
	)
	confirm := createLinkedFixture(
		"release:47:note:14",
		repository.ReviewDecisionConfirm,
		phase107CreditReviewer{appUserID: 11, memberID: 101},
	)
	otherReviewer := createLinkedFixture(
		"release:48:note:15",
		repository.ReviewDecisionReject,
		phase107CreditReviewer{appUserID: 12, memberID: 102},
	)

	t.Run("null decision", func(t *testing.T) {
		require.Error(t, insertSlot(
			reject, reject.sourceType, reject.stableKey, reject.slot,
			reject.reviewer.memberID, nil, reject.ledgerID,
		))
	})
	t.Run("cross source", func(t *testing.T) {
		require.Error(t, insertSlot(
			reject, reject.sourceType, reject.stableKey+"-other", reject.slot,
			reject.reviewer.memberID, &reject.decisionID, reject.ledgerID,
		))
	})
	t.Run("wrong decision kind", func(t *testing.T) {
		require.Error(t, insertSlot(
			confirm, confirm.sourceType, confirm.stableKey, repository.ReviewCreditSlotReject,
			confirm.reviewer.memberID, &confirm.decisionID, confirm.ledgerID,
		))
	})
	t.Run("wrong reviewer", func(t *testing.T) {
		require.Error(t, insertSlot(
			otherReviewer, otherReviewer.sourceType, otherReviewer.stableKey, otherReviewer.slot,
			101, &otherReviewer.decisionID, otherReviewer.ledgerID,
		))
	})
	t.Run("unrelated ledger", func(t *testing.T) {
		require.Error(t, insertSlot(
			reject, reject.sourceType, reject.stableKey, reject.slot,
			reject.reviewer.memberID, &reject.decisionID, confirm.ledgerID,
		))
	})
	t.Run("matching decision and PointService award", func(t *testing.T) {
		require.NoError(t, insertSlot(
			reject, reject.sourceType, reject.stableKey, reject.slot,
			reject.reviewer.memberID, &reject.decisionID, reject.ledgerID,
		))
	})

	var slots int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM review_credit_slots`).Scan(&slots))
	require.Equal(t, 1, slots, "rejected malformed links must not consume append-only slots")
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
			Key:        phase107ReviewPointSourceKey(key.SourceType, key.StableKey),
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
	sourceType string,
	stableKey string,
	revision int64,
	decision repository.ReviewDecision,
	reviewer phase107CreditReviewer,
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
			SourceType:        sourceType,
			StableKey:         stableKey,
			SourceRevision:    revision,
			ReviewKind:        repository.ReviewKindText,
			Decision:          decision,
			RejectionCategory: category,
			FansubGroupID:     21,
			ReviewerAppUserID: reviewer.appUserID,
			ReviewerMemberID:  phase107CreditInt64Ptr(reviewer.memberID),
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
		WHERE source_type = 'review_decision'
		  AND source_key = $1
		  AND entry_kind = 'award'
	`, phase107ReviewPointSourceKey(key.SourceType, key.StableKey)).Scan(&ledgerCount))
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

func phase107ReviewPointSourceKey(sourceType, stableKey string) string {
	return "source:" + fmt.Sprint(len([]byte(sourceType))) + ":" +
		hex.EncodeToString([]byte(sourceType)) + ":key:" +
		fmt.Sprint(len([]byte(stableKey))) + ":" + hex.EncodeToString([]byte(stableKey))
}
