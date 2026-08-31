package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

func countReleaseReviewRows(
	t *testing.T,
	fx *releaseReviewSubmissionFixture,
	query string,
	args ...any,
) int {
	t.Helper()
	var count int
	require.NoError(t, fx.pool.QueryRow(context.Background(), query, args...).Scan(&count))
	return count
}

func TestReleaseReviewAtomicDecisionSourceMatrix(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	at := time.Date(2026, 7, 23, 16, 0, 0, 0, time.UTC)
	sources := []repository.ReleaseReviewLifecycle{
		fx.submitNote(t, 501, 11, nil, at),
		fx.submitMedia(t, 601, 11, nil, at),
		fx.submitMedia(t, 602, 11, nil, at),
		fx.submitMedia(t, 603, 11, nil, at),
		fx.submitMedia(t, 604, 11, nil, at),
	}
	service := NewReviewService(fx.pool, ReleaseReviewAdapters())
	reviewer := permissions.Actor{AppUserID: 12, Status: "active"}

	for _, source := range sources {
		_, err := service.Decide(context.Background(), ReviewDecisionCommand{
			Actor: reviewer,
			Target: ReviewTargetRef{
				SourceType: source.SourceType,
				StableKey:  source.StableKey,
			},
			Decision: ReviewDecisionConfirm,
		})
		require.NoError(t, err, "%s:%s", source.SourceType, source.StableKey)
	}

	assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_review_lifecycle_sources WHERE review_state = 'pending'
	`))
	assert.Equal(t, 5, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_review_lifecycle_sources WHERE review_state = 'confirmed'
	`))
	assert.Equal(t, 4, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_version_media_review_lifecycle
		WHERE review_state = 'confirmed'
		  AND category IN ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other')
	`))
	assert.Equal(t, 4, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*)
		FROM release_version_media media
		JOIN media_assets asset ON asset.id = media.media_asset_id
		JOIN visibilities visibility ON visibility.id = asset.visibility_id
		JOIN review_statuses status ON status.id = asset.review_status_id
		WHERE media.id BETWEEN 601 AND 604
		  AND visibility.name = 'public'
		  AND status.code = 'approved'
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM release_version_notes
		WHERE id = 501 AND visibility = 'public' AND status = 'published'
	`))
	assert.Equal(t, 5, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM point_ledger_entries
		WHERE source_type IN ('release_version_note', 'release_version_media')
		  AND member_id = 101
		  AND rule_code_snapshot = $1
		  AND rule_version_snapshot = 1
		  AND rule_category_snapshot = 'platform_contribution'
		  AND rule_point_value_snapshot = 1
		  AND point_value = 1
	`, releaseReviewContributionRuleCode))
	assert.Equal(t, 5, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM point_ledger_entries
		WHERE source_type = 'review_decision'
		  AND member_id = 102
		  AND rule_code_snapshot = 'review.decision'
		  AND point_value = 1
	`))
}

func TestReleaseReviewAtomicPlatformAdminIdentityMatrix(t *testing.T) {
	t.Run("memberless admin reviews a foreign source without review credit", func(t *testing.T) {
		fx := openReleaseReviewSubmissionFixture(t)
		_, err := fx.pool.Exec(context.Background(), `
			INSERT INTO app_users(id, status) VALUES (99, 'active')
		`)
		require.NoError(t, err)
		source := fx.submitNote(
			t, 501, 11, nil, time.Date(2026, 7, 23, 16, 10, 0, 0, time.UTC),
		)

		_, err = NewReviewService(fx.pool, ReleaseReviewAdapters()).Decide(
			context.Background(),
			ReviewDecisionCommand{
				Actor: permissions.Actor{
					AppUserID: 99, Status: "active", IsPlatformAdmin: true,
				},
				Target: ReviewTargetRef{
					SourceType: source.SourceType,
					StableKey:  source.StableKey,
				},
				Decision: ReviewDecisionConfirm,
			},
		)
		require.NoError(t, err)
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries
			WHERE source_type = 'release_version_note' AND member_id = 101
		`))
		assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries WHERE source_type = 'review_decision'
		`))
		assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM review_credit_slots
		`))
	})

	t.Run("admin self review needs a unicode-nonblank reason and earns no review credit", func(t *testing.T) {
		fx := openReleaseReviewSubmissionFixture(t)
		source := fx.submitMedia(
			t, 601, 11, nil, time.Date(2026, 7, 23, 16, 20, 0, 0, time.UTC),
		)
		service := NewReviewService(fx.pool, ReleaseReviewAdapters())
		admin := permissions.Actor{AppUserID: 11, Status: "active", IsPlatformAdmin: true}
		command := ReviewDecisionCommand{
			Actor: admin,
			Target: ReviewTargetRef{
				SourceType: source.SourceType,
				StableKey:  source.StableKey,
			},
			Decision:           ReviewDecisionConfirm,
			SelfReviewOverride: true,
			OverrideReason:     "\u2003\u00a0",
		}
		_, err := service.Decide(context.Background(), command)
		assert.ErrorIs(t, err, ErrReviewOverrideReasonRequired)

		command.OverrideReason = "Dokumentierte Plattform-Ausnahme"
		_, err = service.Decide(context.Background(), command)
		require.NoError(t, err)
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM review_reason_texts WHERE reason_kind = 'override'
		`))
		assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries
			WHERE source_type = 'release_version_media' AND member_id = 101
		`))
		assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
			SELECT COUNT(*) FROM point_ledger_entries WHERE source_type = 'review_decision'
		`))
	})
}

func TestReleaseReviewResubmitKeepsStableContributionAndReviewLimits(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	first := fx.submitNote(
		t, 501, 11, nil, time.Date(2026, 7, 23, 17, 0, 0, 0, time.UTC),
	)
	service := NewReviewService(fx.pool, ReleaseReviewAdapters())
	reviewer := permissions.Actor{AppUserID: 12, Status: "active"}
	rejectionReason := "Der Text benötigt noch eine fachliche Überarbeitung."

	_, err := service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: reviewer,
		Target: ReviewTargetRef{
			SourceType: first.SourceType,
			StableKey:  first.StableKey,
		},
		Decision:          ReviewDecisionReject,
		RejectionCategory: repository.ReviewRejectionCategory("quality.mismatch"),
		RejectReason:      rejectionReason,
	})
	require.NoError(t, err)
	assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM point_ledger_entries
		WHERE source_type = 'release_version_note'
	`))

	second := fx.submitNote(
		t,
		501,
		11,
		releaseReviewRevision(first.SourceRevision),
		time.Date(2026, 7, 23, 18, 0, 0, 0, time.UTC),
	)
	assert.Equal(t, first.SourceID, second.SourceID)
	assert.Equal(t, int64(2), second.SourceRevision)
	_, err = service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: reviewer,
		Target: ReviewTargetRef{
			SourceType: second.SourceType,
			StableKey:  second.StableKey,
		},
		Decision: ReviewDecisionConfirm,
	})
	require.NoError(t, err)

	assert.Equal(t, 2, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM review_decisions
		WHERE source_type = 'release_version_note'
		  AND source_key = '501'
		  AND source_revision IN (1, 2)
	`))
	assert.Equal(t, 2, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM review_credit_slots
		WHERE source_type = 'release_version_note'
		  AND source_key = '501'
		  AND credit_slot IN ('reject', 'confirm')
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM point_ledger_entries
		WHERE source_type = 'release_version_note'
		  AND source_key = '501'
		  AND member_id = 101
	`))
	assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
		SELECT COUNT(*) FROM review_reason_texts WHERE reason_text = $1
	`, rejectionReason))
	var structuredAudit string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT COALESCE(string_agg(row_to_json(event)::text, ''), '')
		FROM review_audit_events event
	`).Scan(&structuredAudit))
	assert.NotContains(t, structuredAudit, rejectionReason)

	tx, err := fx.pool.Begin(context.Background())
	require.NoError(t, err)
	defer tx.Rollback(context.Background()) //nolint:errcheck
	_, err = repository.NewReleaseReviewLifecycleRepository(tx).SubmitNote(
		context.Background(),
		repository.ReleaseReviewSubmissionInput{
			SourceID:         501,
			ActorAppUserID:   11,
			ExpectedRevision: releaseReviewRevision(1),
			LastActivityAt:   time.Date(2026, 7, 23, 19, 0, 0, 0, time.UTC),
		},
	)
	assert.ErrorIs(t, err, repository.ErrConflict)
}

type releaseReviewCommitFailStarter struct {
	pool *pgxpool.Pool
}

func (s releaseReviewCommitFailStarter) Begin(ctx context.Context) (pgx.Tx, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	return &releaseReviewCommitFailTx{Tx: tx}, nil
}

type releaseReviewCommitFailTx struct {
	pgx.Tx
}

func (tx *releaseReviewCommitFailTx) Commit(context.Context) error {
	return errors.New("forced commit failure")
}

func installReleaseReviewFailureTrigger(
	t *testing.T,
	fx *releaseReviewSubmissionFixture,
	name, table, timing, condition string,
) {
	t.Helper()
	functionName := "fail_release_review_" + strings.ReplaceAll(name, "-", "_")
	_, err := fx.pool.Exec(context.Background(), fmt.Sprintf(`
		CREATE FUNCTION %s() RETURNS trigger
		LANGUAGE plpgsql AS $$
		BEGIN
			RAISE EXCEPTION 'forced %s failure';
		END;
		$$;
		CREATE TRIGGER %s
		%s ON %s
		FOR EACH ROW %s
		EXECUTE FUNCTION %s();
	`, functionName, name, functionName, timing, table, condition, functionName))
	require.NoError(t, err)
}

func TestReleaseReviewAtomicRollbackFailureMatrix(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(*testing.T, *releaseReviewSubmissionFixture)
		reject  bool
		commit  bool
	}{
		{
			name: "adapter",
			prepare: func(t *testing.T, fx *releaseReviewSubmissionFixture) {
				installReleaseReviewFailureTrigger(
					t, fx, "adapter", "release_version_notes",
					"BEFORE UPDATE", "WHEN (NEW.status = 'published')",
				)
			},
		},
		{
			name: "contribution-credit",
			prepare: func(t *testing.T, fx *releaseReviewSubmissionFixture) {
				installReleaseReviewFailureTrigger(
					t, fx, "contribution-credit", "point_ledger_entries",
					"BEFORE INSERT", "WHEN (NEW.source_type = 'release_version_note')",
				)
			},
		},
		{
			name: "decision-audit",
			prepare: func(t *testing.T, fx *releaseReviewSubmissionFixture) {
				installReleaseReviewFailureTrigger(
					t, fx, "decision-audit", "review_audit_events",
					"BEFORE INSERT", "WHEN (NEW.event_code = 'review.confirmed')",
				)
			},
		},
		{
			name: "review-credit",
			prepare: func(t *testing.T, fx *releaseReviewSubmissionFixture) {
				installReleaseReviewFailureTrigger(
					t, fx, "review-credit", "point_ledger_entries",
					"BEFORE INSERT", "WHEN (NEW.source_type = 'review_decision')",
				)
			},
		},
		{
			name:   "rejection-reason",
			reject: true,
			prepare: func(t *testing.T, fx *releaseReviewSubmissionFixture) {
				installReleaseReviewFailureTrigger(
					t, fx, "rejection-reason", "review_reason_texts",
					"BEFORE INSERT", "",
				)
			},
		},
		{name: "commit", commit: true},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			fx := openReleaseReviewSubmissionFixture(t)
			source := fx.submitNote(
				t, 501, 11, nil, time.Date(2026, 7, 23, 20, 0, 0, 0, time.UTC),
			)
			if testCase.prepare != nil {
				testCase.prepare(t, fx)
			}
			var starter PointTxStarter = fx.pool
			if testCase.commit {
				starter = releaseReviewCommitFailStarter{pool: fx.pool}
			}
			command := ReviewDecisionCommand{
				Actor: permissions.Actor{AppUserID: 12, Status: "active"},
				Target: ReviewTargetRef{
					SourceType: source.SourceType,
					StableKey:  source.StableKey,
				},
				Decision: ReviewDecisionConfirm,
			}
			if testCase.reject {
				command.Decision = ReviewDecisionReject
				command.RejectionCategory = "quality.mismatch"
				command.RejectReason = "Der Inhalt benötigt eine nachvollziehbare Korrektur."
			}
			_, err := NewReviewService(starter, ReleaseReviewAdapters()).Decide(
				context.Background(),
				command,
			)
			require.Error(t, err)

			assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
				SELECT COUNT(*) FROM release_version_note_review_lifecycle
				WHERE release_version_note_id = 501 AND review_state = 'pending'
			`))
			assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
				SELECT COUNT(*) FROM release_version_notes
				WHERE id = 501 AND visibility = 'internal' AND status = 'draft'
			`))
			for label, query := range map[string]string{
				"decision": `SELECT COUNT(*) FROM review_decisions`,
				"reason":   `SELECT COUNT(*) FROM review_reason_texts`,
				"slot":     `SELECT COUNT(*) FROM review_credit_slots`,
				"ledger":   `SELECT COUNT(*) FROM point_ledger_entries`,
			} {
				assert.Equal(t, 0, countReleaseReviewRows(t, fx, query), label)
			}
			assert.Equal(t, 1, countReleaseReviewRows(t, fx, `
				SELECT COUNT(*) FROM review_audit_events WHERE event_code = 'source.submitted'
			`))
			assert.Equal(t, 0, countReleaseReviewRows(t, fx, `
				SELECT COUNT(*) FROM review_audit_events WHERE event_code <> 'source.submitted'
			`))
		})
	}
}
