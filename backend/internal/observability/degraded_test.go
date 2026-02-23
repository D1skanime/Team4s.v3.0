package observability

import "testing"

func TestDegradedCounters(t *testing.T) {
	resetDegradedCountersForTest()

	if got := IncAuthStateUnavailableCommentAuth(); got != 1 {
		t.Fatalf("expected comment auth counter to be 1, got %d", got)
	}
	if got := IncAuthStateUnavailableCommentAuth(); got != 2 {
		t.Fatalf("expected comment auth counter to be 2, got %d", got)
	}

	if got := IncAuthStateUnavailableAuthIssue(); got != 1 {
		t.Fatalf("expected auth issue counter to be 1, got %d", got)
	}

	if got := IncCommentRateLimitDegraded(); got != 1 {
		t.Fatalf("expected rate limit degraded counter to be 1, got %d", got)
	}
	if got := IncCommentRateLimitDegraded(); got != 2 {
		t.Fatalf("expected rate limit degraded counter to be 2, got %d", got)
	}

	snapshot := GetDegradedCounters()
	if snapshot.AuthStateUnavailableCommentAuthTotal != 2 {
		t.Fatalf("expected snapshot comment auth total 2, got %d", snapshot.AuthStateUnavailableCommentAuthTotal)
	}
	if snapshot.AuthStateUnavailableAuthIssueTotal != 1 {
		t.Fatalf("expected snapshot auth issue total 1, got %d", snapshot.AuthStateUnavailableAuthIssueTotal)
	}
	if snapshot.CommentRateLimitDegradedTotal != 2 {
		t.Fatalf("expected snapshot rate limit degraded total 2, got %d", snapshot.CommentRateLimitDegradedTotal)
	}
	if snapshot.GeneratedAt <= 0 {
		t.Fatalf("expected snapshot generated_at > 0, got %d", snapshot.GeneratedAt)
	}
}
