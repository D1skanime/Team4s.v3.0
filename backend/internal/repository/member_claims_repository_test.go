package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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

func TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers(t *testing.T) {
	repoSrc, err := os.ReadFile("member_claims_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	searchStart := strings.Index(content, "func (r *MemberClaimsRepository) SearchHistoricalMembers")
	submitStart := strings.Index(content, "func (r *MemberClaimsRepository) SubmitClaim")
	require.NotEqual(t, -1, searchStart)
	require.NotEqual(t, -1, submitStart)

	searchBody := content[searchStart:submitStart]
	submitBody := content[submitStart:]
	assert.Contains(t, searchBody, "AND m.user_id IS NULL")
	assert.Contains(t, submitBody, "Code:       \"member_already_assigned\"")
	assert.Contains(t, submitBody, "AND mc.claim_status = 'verified'")
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
