package services

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
)

// TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes proves D06's
// concurrency requirement using the exact example from 137-CONTEXT.md:
//
//	Admin A: allow -> deny
//	Admin B: allow -> remove
//
// Unlike release_review_concurrency_test.go's optimistic first-decision-wins race (no
// DB row lock, arbitration via a revision-number compare-and-swap), override mutation
// uses real Postgres pessimistic locking: LockTargetMembership's SELECT ... FOR UPDATE
// OF fgm and UpsertOverride/DeleteOverride's own SELECT ... FOR UPDATE serialize
// conflicting transactions against the exact same row. Both commands therefore always
// succeed -- there is no loser -- but the second transaction to acquire the lock must
// observe the FIRST transaction's already-committed state, not the stale "allow" both
// commands were issued against. The stored history must describe the actual previous
// state and actual committed transition (D06), never the two admins' original intent.
//
// The barrier below reuses the release-review concurrency test's channel-signaling
// shape (loaded/release channels, goroutines launched via a WaitGroup) but adapted to
// pessimistic locking: only the transaction that actually wins the real Postgres row
// lock ever reaches the "locked_membership" barrier stage, so waiting for exactly one
// "loaded" signal -- not two -- is itself proof that the lock genuinely serialized the
// two transactions rather than relying on accidental goroutine scheduling.
func TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes(t *testing.T) {
	fx := openPhase137EffectiveRightsPostgres(t)
	fx.resetOverrideState(t, 12, 21, effectiveRightsFixtureAction)
	fx.seedOverride(t, 12, 21, effectiveRightsFixtureAction, "allow", 11)

	service := NewEffectiveRightsService(fx.pool)
	var winnerEntered int32
	loaded := make(chan struct{})
	release := make(chan struct{})
	service.testBarrier = func(stage string) {
		if stage != "locked_membership" {
			return
		}
		if atomic.CompareAndSwapInt32(&winnerEntered, 0, 1) {
			close(loaded)
			<-release
		}
	}

	type labeledResult struct {
		label  string
		result *EffectiveRightsOverrideMutationResult
		err    error
	}

	commands := []struct {
		label string
		cmd   EffectiveRightsOverrideMutationCommand
	}{
		{"set_deny", EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationSetDeny,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		}},
		{"remove", EffectiveRightsOverrideMutationCommand{
			Actor: leadActor(), TargetAppUserID: 12, FansubGroupID: 21,
			ActionCode: permissions.Action(effectiveRightsFixtureAction), Kind: OverrideMutationRemove,
			ReasonCategory: OverrideReasonCategoryTaskDelegation,
		}},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	results := make(chan labeledResult, len(commands))
	var ready sync.WaitGroup
	ready.Add(len(commands))
	for _, entry := range commands {
		entry := entry
		go func() {
			ready.Done()
			result, err := service.MutateOverride(ctx, entry.cmd)
			results <- labeledResult{label: entry.label, result: result, err: err}
		}()
	}
	ready.Wait()

	select {
	case <-loaded:
	case <-time.After(2 * time.Second):
		close(release)
		for range commands {
			<-results
		}
		t.Fatal("neither transaction reached the target-membership lock before the timeout")
	}
	close(release)

	collected := make(map[string]labeledResult, len(commands))
	for range commands {
		select {
		case r := <-results:
			require.NoError(t, r.err, "%s: concurrent mutation must not fail once serialized", r.label)
			collected[r.label] = r
		case <-time.After(3 * time.Second):
			t.Fatal("timed out waiting for both concurrent mutations to complete")
		}
	}

	setDeny := collected["set_deny"]
	remove := collected["remove"]
	require.NotNil(t, setDeny.result)
	require.NotNil(t, remove.result)
	assert.True(t, setDeny.result.Changed, "set_deny must be a real change regardless of race order")
	assert.True(t, remove.result.Changed, "remove must be a real change regardless of race order")

	// Determine which command actually won the row lock first: whichever observed
	// "allow" (the seeded value) as its own Before state ran first.
	first, second := setDeny, remove
	if strOrNone(first.result.BeforeEffect) != "allow" {
		first, second = remove, setDeny
	}
	require.Equal(t, "allow", strOrNone(first.result.BeforeEffect), "the first-serialized transaction must observe the real seeded state")
	assert.Equal(
		t, strOrNone(first.result.AfterEffect), strOrNone(second.result.BeforeEffect),
		"the second-serialized transaction must observe the first transaction's committed state, not the stale value both admins read",
	)

	// Exactly two immutable history rows, in real committed order, chained
	// before/after -- never the two admins' original stale intent.
	require.Equal(t, 2, fx.historyCount(t, 12, 21, effectiveRightsFixtureAction))
	rows := fx.listHistoryOrdered(t, 12, 21, effectiveRightsFixtureAction)
	require.Len(t, rows, 2)
	assert.Equal(t, "allow", strOrNone(rows[0].before))
	assert.Equal(t, strOrNone(first.result.AfterEffect), strOrNone(rows[0].after))
	assert.Equal(t, strOrNone(rows[0].after), strOrNone(rows[1].before), "history chain must reflect the actual committed sequence")
	assert.Equal(t, strOrNone(second.result.AfterEffect), strOrNone(rows[1].after))

	// Final committed state matches whichever mutation actually committed last.
	assert.Equal(t, strOrNone(second.result.AfterEffect), strOrNone(fx.currentEffect(t, 12, 21, effectiveRightsFixtureAction)))
}

type effectiveRightsHistoryRow struct {
	before *string
	after  *string
}

func (f *effectiveRightsPostgresFixture) listHistoryOrdered(t *testing.T, appUserID, fansubGroupID int64, actionCode string) []effectiveRightsHistoryRow {
	t.Helper()
	rows, err := f.pool.Query(context.Background(), `
		SELECT before_effect, after_effect
		FROM user_group_capability_override_history
		WHERE app_user_id = $1 AND fansub_group_id = $2 AND action_code = $3
		ORDER BY occurred_at ASC, id ASC
	`, appUserID, fansubGroupID, actionCode)
	require.NoError(t, err)
	defer rows.Close()

	var out []effectiveRightsHistoryRow
	for rows.Next() {
		var row effectiveRightsHistoryRow
		require.NoError(t, rows.Scan(&row.before, &row.after))
		out = append(out, row)
	}
	require.NoError(t, rows.Err())
	return out
}
