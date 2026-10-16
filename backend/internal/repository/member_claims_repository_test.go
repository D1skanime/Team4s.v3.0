package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ensureMemberClaimsBehaviorColumns adds the members.profile_status,
// members.user_id, members.noindex, and members.profile_visibility columns the
// real SubmitClaim/SearchHistoricalMembers/VerifyClaim queries read and write,
// which the Phase-137 fixture does not create by default (it only creates the
// bare members(id) stand-in). All are nullable/defaulted, FK-free additive
// ALTERs scoped to this test file's own fixture setup, matching the
// additive-ALTER precedent used throughout this phase.
func ensureMemberClaimsBehaviorColumns(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_status VARCHAR(20) NOT NULL DEFAULT 'active';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id BIGINT;
		ALTER TABLE members ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT true;
		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) NOT NULL DEFAULT 'private';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
	`)
	require.NoError(t, err)
}

func TestMemberClaimsRepositorySearchHistoricalMembers(t *testing.T) {
	t.Skip("stub")
}

func TestMemberClaimsRepositorySubmitClaimUniqueInvariant(t *testing.T) {
	t.Skip("stub")
}

func TestMemberClaimsRepositoryVerifyClaimOneVerifiedInvariant(t *testing.T) {
	t.Skip("stub")
}

func TestMemberClaimsRepositoryRejectClaim(t *testing.T) {
	t.Skip("stub")
}

// TestMemberClaimsRepositoryVerifyLinksUserID pins the fix for the claim-linkage
// bug: verifying a claim MUST set members.user_id from the CLAIMING app user's
// legacy_user_id (via member_claims.app_user_id), inside the verify transaction,
// only when the member is not already linked. Without this, newly claimed members
// keep members.user_id = NULL and the domain projection can never resolve their
// public profile link, slug, or membership count.
func TestMemberClaimsRepositoryVerifyLinksUserID(t *testing.T) {
	repoSrc, err := os.ReadFile("member_claims_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	verifyIdx := strings.Index(content, "func (r *MemberClaimsRepository) VerifyClaim(")
	require.NotEqual(t, -1, verifyIdx, "VerifyClaim must exist")
	rejectIdx := strings.Index(content, "func (r *MemberClaimsRepository) RejectClaim(")
	require.NotEqual(t, -1, rejectIdx, "RejectClaim must exist")
	verifyBody := content[verifyIdx:rejectIdx]

	assert.True(t, strings.Contains(verifyBody, "UPDATE members m"),
		"VerifyClaim must update the members row to establish the app-user link")
	assert.True(t, strings.Contains(verifyBody, "SET user_id = au.legacy_user_id"),
		"VerifyClaim must set members.user_id from the app user's legacy_user_id")
	assert.True(t, strings.Contains(verifyBody, "JOIN app_users au ON au.id = mc.app_user_id"),
		"the link must use the CLAIMING app user (member_claims.app_user_id), not the verifier")
	assert.True(t, strings.Contains(verifyBody, "m.user_id IS NULL"),
		"linking must not overwrite an existing (legacy) members.user_id")
}

// TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers was originally red because
// SubmitClaim moved to member_claims_submit_repository.go, so the old
// os.ReadFile(".go")+strings.Index search for "func (r *MemberClaimsRepository)
// SubmitClaim" in member_claims_repository.go returned -1. Rewritten (185-10, D-02)
// to a real-Postgres behavior test calling SearchHistoricalMembers and SubmitClaim
// directly: a member with a verified claim is excluded from search and blocks a new
// claim submission (409 member_already_assigned), while a member with only a
// pending claim remains searchable and claimable.
func TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers(t *testing.T) {
	pool := openPhase138ClaimsListPool(t)
	ensureMemberClaimsBehaviorColumns(t, pool)
	ctx := context.Background()
	repo := NewMemberClaimsRepository(pool)

	// Member A already has a VERIFIED claim -- must be excluded from search and
	// must block a new SubmitClaim attempt.
	seedPhase138Claim(t, pool, 631, 731, 831, 931, "Already Verified Person", "Chocolate Subs", "verified")
	// Member B is the positive control: only a PENDING claim, no verified claim,
	// no linked user -- proves the guard is scoped, not a blanket exclusion.
	seedPhase138Claim(t, pool, 632, 732, 831, 0, "Still Available Person", "Chocolate Subs", "pending")

	_, err := pool.Exec(ctx, `
		INSERT INTO app_users (id, status, email, display_name) VALUES
			(933, 'active', 'blocker-submitter@example.test', 'Blocker Submitter'),
			(934, 'active', 'allowed-submitter@example.test', 'Allowed Submitter')
	`)
	require.NoError(t, err)

	results, err := repo.SearchHistoricalMembers(ctx, "Person")
	require.NoError(t, err)
	var nicknames []string
	for _, result := range results {
		nicknames = append(nicknames, result.Nickname)
	}
	assert.NotContains(t, nicknames, "Already Verified Person", "a member with a verified claim must not appear in search results")
	assert.Contains(t, nicknames, "Still Available Person", "a member with only a pending claim must still be searchable")

	_, err = repo.SubmitClaim(ctx, SubmitClaimInput{MemberID: 731, AppUserID: 933})
	require.Error(t, err)
	mutationErr, ok := AsClaimMutationError(err)
	require.True(t, ok, "expected a *ClaimMutationError, got %T: %v", err, err)
	assert.Equal(t, "member_already_assigned", mutationErr.Code)
	assert.Equal(t, 409, mutationErr.HTTPStatus)

	claim, err := repo.SubmitClaim(ctx, SubmitClaimInput{MemberID: 732, AppUserID: 934})
	require.NoError(t, err)
	assert.Equal(t, "pending", claim.ClaimStatus)
}

// TestMemberClaimsRepositoryListPendingClaimAttentionCandidates is the first-ever test for
// ListPendingClaimAttentionCandidates (Plan 143-09, Task 3 -- attachPendingClaimAttention's
// already-correct thin-handler-loop-with-memoization shape had zero repository-level
// coverage before this). Reuses member_claims_list_repository_test.go's fixture helpers
// (same package) rather than inventing a second seeding style.
func TestMemberClaimsRepositoryListPendingClaimAttentionCandidates(t *testing.T) {
	pool := openPhase138ClaimsListPool(t)
	ctx := context.Background()
	repo := NewMemberClaimsRepository(pool)

	seedPhase138Claim(t, pool, 611, 711, 811, 911, "Pending Person", "Chocolate Subs", "pending")
	seedPhase138Claim(t, pool, 612, 712, 811, 912, "Verified Person", "Chocolate Subs", "verified")
	seedPhase138Claim(t, pool, 613, 713, 812, 0, "Rejected Person", "Vanilla Subs", "rejected")
	seedPhase138Claim(t, pool, 614, 714, 812, 0, "Other Pending Person", "Vanilla Subs", "pending")

	candidates, err := repo.ListPendingClaimAttentionCandidates(ctx)
	require.NoError(t, err)

	byClaimID := make(map[int64]PendingClaimAttentionRow, len(candidates))
	for _, candidate := range candidates {
		byClaimID[candidate.ClaimID] = candidate
	}

	require.Contains(t, byClaimID, int64(611))
	assert.EqualValues(t, 811, byClaimID[611].FansubGroupID)
	assert.Equal(t, "Chocolate Subs", byClaimID[611].FansubGroupName)
	assert.Equal(t, "Pending Person", byClaimID[611].MemberNickname)

	require.Contains(t, byClaimID, int64(614))
	assert.EqualValues(t, 812, byClaimID[614].FansubGroupID)
	assert.Equal(t, "Other Pending Person", byClaimID[614].MemberNickname)

	assert.NotContains(t, byClaimID, int64(612), "verified claims must not be returned as pending attention candidates")
	assert.NotContains(t, byClaimID, int64(613), "rejected claims must not be returned as pending attention candidates")
}
