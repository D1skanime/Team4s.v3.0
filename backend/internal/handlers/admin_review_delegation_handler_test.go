package handlers

import (
	"testing"

	"team4s.v3/backend/internal/repository"
)

func TestReviewDelegationRowsUseFixedOrderAndEligibility(t *testing.T) {
	memberID := int64(5)
	rows := reviewDelegationRows(&repository.ReviewDelegationSnapshot{
		MembershipID: 9, FansubGroupID: 3, AppUserID: 7, MemberID: &memberID,
		MembershipStatus: "active", AppUserStatus: "active", HasVerifiedMemberClaim: true,
		GrantedActionCodes: []string{"review.contribution.decide", "review.image.decide"},
	})
	want := []string{"review.image.decide", "review.text.decide", "review.contribution.decide"}
	if len(rows) != len(want) { t.Fatalf("expected three rows, got %d", len(rows)) }
	for index, action := range want {
		if rows[index].ActionCode != action { t.Fatalf("row %d action = %q, want %q", index, rows[index].ActionCode, action) }
		if !rows[index].EligibleForGrant { t.Fatalf("row %d should be eligible", index) }
	}
	if !rows[0].Granted || rows[1].Granted || !rows[2].Granted { t.Fatalf("unexpected grants: %#v", rows) }
}

func TestReviewDelegationRowsRequireVerifiedActiveMembership(t *testing.T) {
	rows := reviewDelegationRows(&repository.ReviewDelegationSnapshot{MembershipID: 1, FansubGroupID: 1, AppUserID: 1, MembershipStatus: "active", AppUserStatus: "disabled", HasVerifiedMemberClaim: true})
	if rows[0].EligibleForGrant { t.Fatal("disabled account must not be eligible") }
}