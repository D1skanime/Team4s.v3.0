package repository

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type phase107AuditRow func(...any) error

func (row phase107AuditRow) Scan(dest ...any) error {
	return row(dest...)
}

type phase107AuditDB struct {
	queryRows   []pgx.Row
	queries     []string
	queryArgs   [][]any
	execQueries []string
	execArgs    [][]any
	execErr     error
}

func (db *phase107AuditDB) QueryRow(_ context.Context, query string, args ...any) pgx.Row {
	db.queries = append(db.queries, query)
	db.queryArgs = append(db.queryArgs, args)
	row := db.queryRows[0]
	db.queryRows = db.queryRows[1:]
	return row
}

func (db *phase107AuditDB) Exec(_ context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	db.execQueries = append(db.execQueries, query)
	db.execArgs = append(db.execArgs, args)
	if db.execErr != nil {
		return pgconn.CommandTag{}, db.execErr
	}
	return pgconn.NewCommandTag("INSERT 0 1"), nil
}

func TestPhase107ReviewAuditEventAppUser(t *testing.T) {
	eventID := int64(77)
	actorAppUserID := int64(11)
	actorMemberID := int64(101)
	decisionID := int64(70)
	decision := "reject"
	occurredAt := time.Date(2026, 7, 23, 12, 0, 0, 987654321, time.UTC)
	db := &phase107AuditDB{
		queryRows: []pgx.Row{
			phase107AuditRow(func(dest ...any) error {
				*dest[0].(*int64) = eventID
				return nil
			}),
		},
	}
	repo := NewReviewAuditRepository(db)

	got, err := repo.InsertEvent(context.Background(), ReviewAuditEventInput{
		EventCode:          ReviewAuditEventReviewRejected,
		ReviewDecisionID:   &decisionID,
		ActorKind:          ReviewAuditActorAppUser,
		ActorAppUserID:     &actorAppUserID,
		ActorMemberID:      &actorMemberID,
		FansubGroupID:      21,
		SourceType:         " fixture ",
		SourceKey:          " source-a ",
		SourceRevision:     2,
		Decision:           &decision,
		IsPlatformOverride: false,
		HasReason:          true,
		OccurredAt:         occurredAt,
	})

	require.NoError(t, err)
	assert.EqualValues(t, eventID, got)
	require.Len(t, db.queries, 1)
	assert.Contains(t, strings.ToUpper(db.queries[0]), "INSERT INTO REVIEW_AUDIT_EVENTS")
	assert.NotContains(t, strings.ToUpper(db.queries[0]), "JSON")
	assert.Equal(t, "fixture", db.queryArgs[0][6])
	assert.Equal(t, "source-a", db.queryArgs[0][7])
	assert.Equal(t, postgresTimestamp(occurredAt), db.queryArgs[0][12])
}

func TestPhase107ReviewAuditSystemActorEvent(t *testing.T) {
	decisionID := int64(70)
	decision := "reject"
	db := &phase107AuditDB{
		queryRows: []pgx.Row{
			phase107AuditRow(func(dest ...any) error {
				*dest[0].(*int64) = 88
				return nil
			}),
		},
	}

	eventID, err := NewReviewAuditRepository(db).InsertEvent(context.Background(), ReviewAuditEventInput{
		EventCode:        ReviewAuditEventReviewCreditReversed,
		ReviewDecisionID: &decisionID,
		ActorKind:        ReviewAuditActorSystem,
		FansubGroupID:    21,
		SourceType:       "fixture",
		SourceKey:        "source-a",
		SourceRevision:   1,
		Decision:         &decision,
		OccurredAt:       time.Now(),
	})

	require.NoError(t, err)
	assert.EqualValues(t, 88, eventID)
	assert.Nil(t, db.queryArgs[0][3])
	assert.Nil(t, db.queryArgs[0][4])
}

func TestPhase107ReviewAuditEventShapeValidation(t *testing.T) {
	appUserID := int64(11)
	decisionID := int64(70)
	confirm := "confirm"
	reject := "reject"
	base := ReviewAuditEventInput{
		ActorKind:      ReviewAuditActorAppUser,
		ActorAppUserID: &appUserID,
		FansubGroupID:  21,
		SourceType:     "fixture",
		SourceKey:      "source-a",
		SourceRevision: 1,
		OccurredAt:     time.Now(),
	}

	cases := map[string]ReviewAuditEventInput{
		"delegation with decision": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventDelegationGranted
			input.ReviewDecisionID = &decisionID
			input.Decision = &confirm
			return input
		}(),
		"confirmed with reject decision": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventReviewConfirmed
			input.ReviewDecisionID = &decisionID
			input.Decision = &reject
			return input
		}(),
		"rejected without decision link": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventReviewRejected
			input.Decision = &reject
			input.HasReason = true
			return input
		}(),
		"rejected without reason marker": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventReviewRejected
			input.ReviewDecisionID = &decisionID
			input.Decision = &reject
			return input
		}(),
		"override without override flag": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventReviewOverride
			input.ReviewDecisionID = &decisionID
			input.Decision = &confirm
			input.HasReason = true
			return input
		}(),
		"credit with reason": func() ReviewAuditEventInput {
			input := base
			input.EventCode = ReviewAuditEventReviewCreditAwarded
			input.ReviewDecisionID = &decisionID
			input.Decision = &confirm
			input.HasReason = true
			return input
		}(),
	}

	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			err := normalizeAndValidateReviewAuditEvent(
				NewReviewAuditRepository(&phase107AuditDB{}),
				&input,
			)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}
}

func TestPhase107ReviewAuditEventValidation(t *testing.T) {
	appUserID := int64(11)
	memberID := int64(101)
	now := time.Now()
	valid := ReviewAuditEventInput{
		EventCode:      ReviewAuditEventDelegationGranted,
		ActorKind:      ReviewAuditActorAppUser,
		ActorAppUserID: &appUserID,
		ActorMemberID:  &memberID,
		FansubGroupID:  21,
		SourceType:     "membership",
		SourceKey:      "31",
		SourceRevision: 1,
		OccurredAt:     now,
	}

	for name, mutate := range map[string]func(*ReviewAuditEventInput){
		"unknown event":        func(input *ReviewAuditEventInput) { input.EventCode = "source.unknown" },
		"unknown actor":        func(input *ReviewAuditEventInput) { input.ActorKind = "robot" },
		"app user missing id":  func(input *ReviewAuditEventInput) { input.ActorAppUserID = nil },
		"app user invalid id":  func(input *ReviewAuditEventInput) { zero := int64(0); input.ActorAppUserID = &zero },
		"invalid member id":    func(input *ReviewAuditEventInput) { zero := int64(0); input.ActorMemberID = &zero },
		"system with app user": func(input *ReviewAuditEventInput) { input.ActorKind = ReviewAuditActorSystem },
		"group":                func(input *ReviewAuditEventInput) { input.FansubGroupID = 0 },
		"source type":          func(input *ReviewAuditEventInput) { input.SourceType = "\u00a0" },
		"source key":           func(input *ReviewAuditEventInput) { input.SourceKey = "\u2028" },
		"revision":             func(input *ReviewAuditEventInput) { input.SourceRevision = 0 },
		"time":                 func(input *ReviewAuditEventInput) { input.OccurredAt = time.Time{} },
	} {
		t.Run(name, func(t *testing.T) {
			input := valid
			mutate(&input)
			_, err := NewReviewAuditRepository(&phase107AuditDB{}).InsertEvent(context.Background(), input)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}

	for name, repo := range map[string]*ReviewAuditRepository{
		"nil repository": nil,
		"nil database":   NewReviewAuditRepository(nil),
	} {
		t.Run(name, func(t *testing.T) {
			_, err := repo.InsertEvent(context.Background(), valid)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}
}

func TestPhase107ReviewAuditReasonTypedAndUnicodeNonblank(t *testing.T) {
	db := &phase107AuditDB{}
	repo := NewReviewAuditRepository(db)

	require.NoError(t, repo.InsertReason(context.Background(), 77, ReviewReasonKindReject, "Inhaltlich unvollständig"))
	require.NoError(t, repo.InsertReason(context.Background(), 77, ReviewReasonKindOverride, "Support-Override"))
	require.Len(t, db.execQueries, 2)
	assert.Equal(t, []any{int64(77), ReviewReasonKindReject, "Inhaltlich unvollständig"}, db.execArgs[0])
	assert.Equal(t, []any{int64(77), ReviewReasonKindOverride, "Support-Override"}, db.execArgs[1])
	for _, query := range db.execQueries {
		assert.Contains(t, strings.ToUpper(query), "INSERT INTO REVIEW_REASON_TEXTS")
		assert.NotContains(t, strings.ToUpper(query), "REVIEW_AUDIT_EVENTS")
	}

	for name, input := range map[string]struct {
		eventID int64
		kind    ReviewReasonKind
		text    string
	}{
		"event":          {kind: ReviewReasonKindReject, text: "reason"},
		"kind":           {eventID: 77, kind: "other", text: "reason"},
		"empty":          {eventID: 77, kind: ReviewReasonKindReject},
		"nonbreaking":    {eventID: 77, kind: ReviewReasonKindReject, text: "\u00a0"},
		"line separator": {eventID: 77, kind: ReviewReasonKindOverride, text: "\u2028"},
	} {
		t.Run(name, func(t *testing.T) {
			err := repo.InsertReason(context.Background(), input.eventID, input.kind, input.text)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}
}

func TestPhase107ReviewAuditReasonErrorDoesNotDiscloseText(t *testing.T) {
	secret := "vertraulicher Ablehnungsgrund"
	db := &phase107AuditDB{execErr: errors.New("database unavailable")}

	err := NewReviewAuditRepository(db).InsertReason(
		context.Background(),
		77,
		ReviewReasonKindReject,
		secret,
	)

	require.Error(t, err)
	assert.NotContains(t, err.Error(), secret)
}

func TestPhase107ReviewAuditEventReasonImmutableReadBoundary(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status) VALUES (11, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO review_decisions (
			id, source_type, source_key, source_revision, review_kind, decision,
			rejection_category, fansub_group_id, reviewer_app_user_id,
			reviewer_member_id, is_platform_override
		) VALUES (
			70, 'fixture', 'source-a', 1, 'text', 'reject',
			'quality', 21, 11, 101, true
		);
	`)
	require.NoError(t, err)
	appUserID := int64(11)
	memberID := int64(101)
	decisionID := int64(70)
	decision := "reject"
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx)
	repo := NewReviewAuditRepository(tx)

	eventID, err := repo.InsertEvent(ctx, ReviewAuditEventInput{
		EventCode:          ReviewAuditEventReviewRejected,
		ReviewDecisionID:   &decisionID,
		ActorKind:          ReviewAuditActorAppUser,
		ActorAppUserID:     &appUserID,
		ActorMemberID:      &memberID,
		FansubGroupID:      21,
		SourceType:         "fixture",
		SourceKey:          "source-a",
		SourceRevision:     1,
		Decision:           &decision,
		IsPlatformOverride: true,
		HasReason:          true,
		OccurredAt:         time.Now(),
	})
	require.NoError(t, err)
	require.NoError(t, repo.InsertReason(ctx, eventID, ReviewReasonKindReject, "Ablehnungsgrund"))

	overrideEventID, err := repo.InsertEvent(ctx, ReviewAuditEventInput{
		EventCode:          ReviewAuditEventReviewOverride,
		ReviewDecisionID:   &decisionID,
		ActorKind:          ReviewAuditActorAppUser,
		ActorAppUserID:     &appUserID,
		ActorMemberID:      &memberID,
		FansubGroupID:      21,
		SourceType:         "fixture",
		SourceKey:          "source-a",
		SourceRevision:     1,
		Decision:           &decision,
		IsPlatformOverride: true,
		HasReason:          true,
		OccurredAt:         time.Now(),
	})
	require.NoError(t, err)
	require.NoError(t, repo.InsertReason(ctx, overrideEventID, ReviewReasonKindOverride, "Override-Grund"))
	require.NoError(t, tx.Commit(ctx))
	repo = NewReviewAuditRepository(pool)

	before, err := repo.GetEvent(ctx, eventID)
	require.NoError(t, err)
	afterReadCount := 0
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM review_audit_events`).Scan(&afterReadCount))
	assert.Equal(t, 2, afterReadCount, "reads must not create audit events")
	assert.Equal(t, ReviewAuditEventReviewRejected, before.EventCode)

	_, err = pool.Exec(ctx, `UPDATE review_audit_events SET event_code = 'review.confirmed' WHERE id = $1`, eventID)
	require.Error(t, err)
	_, err = pool.Exec(ctx, `DELETE FROM review_audit_events WHERE id = $1`, eventID)
	require.Error(t, err)
	_, err = pool.Exec(ctx, `
		DELETE FROM review_reason_texts
		WHERE audit_event_id = $1 AND reason_kind = 'reject'
	`, eventID)
	require.NoError(t, err)

	after, err := repo.GetEvent(ctx, eventID)
	require.NoError(t, err)
	assert.Equal(t, before, after, "reason scrub must not alter the structured parent")
	var reasonCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM review_reason_texts WHERE audit_event_id = $1
	`, overrideEventID).Scan(&reasonCount))
	assert.Equal(t, 1, reasonCount, "override reason remains independently addressable")
}
