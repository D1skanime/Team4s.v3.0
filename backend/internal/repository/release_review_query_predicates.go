package repository

import "fmt"

// releaseReviewQueuePredicates builds the shared WHERE clause used by both List and Counts
// (Task 1, Plan 141-02). It combines the fansub-group/allowed-kind scope, the pending/
// decided view split, every optional filter, the two-signal self-exclusion (view=open/
// history) or self-inclusion (view=own, D10 capability bypass applies only at the handler
// layer, never here) clause, and -- for List -- the opaque cursor's "next page" predicate.
func releaseReviewQueuePredicates(options ReleaseReviewQueueOptions, includeCursor bool) ([]string, []any, error) {
	scope := options.Scope
	args := []any{scope.FansubGroupID, options.AllowedKinds}
	where := []string{"source.fansub_group_id = $1", "source.review_kind = ANY($2::text[])"}
	// History is the only "not pending" view; both Open and Own only ever surface
	// currently-pending submissions (D01/D14 -- own-pending never shows decided items).
	if scope.View == ReleaseReviewQueueViewHistory {
		where = append(where, "source.review_state <> 'pending'")
	} else {
		where = append(where, "source.review_state = 'pending'")
	}
	add := func(value any, expression string) {
		args = append(args, value)
		where = append(where, fmt.Sprintf(expression, len(args)))
	}
	if scope.AnimeID > 0 {
		add(scope.AnimeID, "source.anime_id = $%d")
	}
	if scope.ReleaseVersionID > 0 {
		add(scope.ReleaseVersionID, "source.release_version_id = $%d")
	}
	if scope.ReviewKind != "" {
		add(scope.ReviewKind, "source.review_kind = $%d")
	}
	if scope.Category != "" {
		add(scope.Category, "source.category = $%d")
	}
	if scope.Search != "" {
		add("%"+scope.Search+"%", "source.search_text ILIKE $%d")
	}
	// Two-signal actor identity clause (RQUE-02/D01/D06), mirroring review_service.go's
	// decision-time definition exactly: app_user_id match OR verified member-claim match.
	// Zero-value ActorAppUserID/ActorMemberIDs (pre-existing call sites that never set
	// these fields) safely no-op the exclusion branch -- no real submitter has id 0, and
	// NOT (member_id = ANY('{}'::bigint[])) is always true. A nil ActorMemberIDs slice
	// must be normalized to a non-nil empty slice first: pgx encodes a nil []int64 as SQL
	// NULL rather than '{}', and `x = ANY(NULL::bigint[])` evaluates to NULL (not TRUE),
	// which would silently exclude every row instead of no-op'ing.
	actorMemberIDs := options.ActorMemberIDs
	if actorMemberIDs == nil {
		actorMemberIDs = []int64{}
	}
	if scope.View == ReleaseReviewQueueViewOwn {
		args = append(args, options.ActorAppUserID, actorMemberIDs)
		where = append(where, fmt.Sprintf(
			"(source.submitter_app_user_id = $%d OR source.submitter_member_id = ANY($%d::bigint[]))",
			len(args)-1, len(args),
		))
	} else {
		add(options.ActorAppUserID, "source.submitter_app_user_id <> $%d")
		add(actorMemberIDs, "NOT (source.submitter_member_id = ANY($%d::bigint[]))")
	}
	if includeCursor && options.Cursor != "" {
		key, err := DecodeReleaseReviewQueueCursor(scope, options.Cursor)
		if err != nil {
			return nil, nil, err
		}
		args = append(args, key.SubmittedAt, key.SourceType, key.SourceID)
		// D15: List's ORDER BY is now newest-first (DESC), so "next page" means strictly
		// LESS than the last-seen key, not greater.
		where = append(where, fmt.Sprintf(
			"(source.submitted_at, source.source_type, source.source_id) < ($%d, $%d, $%d)",
			len(args)-2, len(args)-1, len(args),
		))
	}
	return where, args, nil
}
