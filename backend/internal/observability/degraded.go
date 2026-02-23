package observability

import (
	"sync"
	"time"
)

type DegradedCounters struct {
	AuthStateUnavailableCommentAuthTotal uint64 `json:"auth_state_unavailable_comment_auth_total"`
	AuthStateUnavailableAuthIssueTotal   uint64 `json:"auth_state_unavailable_auth_issue_total"`
	CommentRateLimitDegradedTotal        uint64 `json:"comment_rate_limit_degraded_total"`
	GeneratedAt                          int64  `json:"generated_at"`
}

var degradedCountersState = struct {
	mu       sync.Mutex
	counters DegradedCounters
}{}

func IncAuthStateUnavailableCommentAuth() uint64 {
	degradedCountersState.mu.Lock()
	defer degradedCountersState.mu.Unlock()

	degradedCountersState.counters.AuthStateUnavailableCommentAuthTotal++
	return degradedCountersState.counters.AuthStateUnavailableCommentAuthTotal
}

func IncAuthStateUnavailableAuthIssue() uint64 {
	degradedCountersState.mu.Lock()
	defer degradedCountersState.mu.Unlock()

	degradedCountersState.counters.AuthStateUnavailableAuthIssueTotal++
	return degradedCountersState.counters.AuthStateUnavailableAuthIssueTotal
}

func IncCommentRateLimitDegraded() uint64 {
	degradedCountersState.mu.Lock()
	defer degradedCountersState.mu.Unlock()

	degradedCountersState.counters.CommentRateLimitDegradedTotal++
	return degradedCountersState.counters.CommentRateLimitDegradedTotal
}

func GetDegradedCounters() DegradedCounters {
	degradedCountersState.mu.Lock()
	defer degradedCountersState.mu.Unlock()

	snapshot := degradedCountersState.counters
	snapshot.GeneratedAt = time.Now().UTC().Unix()
	return snapshot
}

func resetDegradedCountersForTest() {
	degradedCountersState.mu.Lock()
	defer degradedCountersState.mu.Unlock()

	degradedCountersState.counters = DegradedCounters{}
}
