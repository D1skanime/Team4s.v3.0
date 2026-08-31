package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type releaseReviewSubmissionFixture struct {
	pool *pgxpool.Pool
}

func openReleaseReviewSubmissionFixture(t *testing.T) *releaseReviewSubmissionFixture {
	t.Helper()

	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))

	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		ALTER TABLE app_users
			ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		CREATE UNIQUE INDEX uq_release_review_app_users_legacy
			ON app_users(legacy_user_id) WHERE legacy_user_id IS NOT NULL;
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		);
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE contributor_roles (
			id BIGINT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NULL REFERENCES fansub_groups(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			visibility TEXT NOT NULL,
			status TEXT NOT NULL,
			deleted_at TIMESTAMPTZ NULL
		);
		CREATE TABLE visibilities (
			id BIGINT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE review_statuses (
			id BIGINT PRIMARY KEY,
			code TEXT NOT NULL UNIQUE
		);
		CREATE TABLE media_assets (
			id BIGINT PRIMARY KEY,
			visibility_id BIGINT NOT NULL REFERENCES visibilities(id),
			review_status_id BIGINT NOT NULL REFERENCES review_statuses(id)
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NULL REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id),
			deleted_at TIMESTAMPTZ NULL
		);

		INSERT INTO users(id) VALUES (1001), (1002), (1003);
		INSERT INTO members(id) VALUES (101), (102), (103), (104);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES
			(11, 'active', 1001),
			(12, 'active', 1002),
			(13, 'active', 1003);
		INSERT INTO fansub_groups(id) VALUES (21), (22);
		INSERT INTO release_versions(id) VALUES (41), (42);
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES
			(41, 21),
			(42, 22);
		INSERT INTO contributor_roles(id, name) VALUES (71, 'translator');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at) VALUES
			(201, 101, 11, 'verified', NOW()),
			(202, 102, 12, 'verified', NOW()),
			(203, 103, 13, 'verified', NOW()),
			(204, 104, 13, 'verified', NOW());
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active'),
			(32, 21, 12, 102, 'active');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role)
		VALUES (31, 'fansub_lead'), (32, 'fansub_lead');

		INSERT INTO release_version_notes(
			id, release_version_id, fansub_group_id, member_id, role_id, visibility, status
		) VALUES
			(501, 41, 21, 101, 71, 'public', 'published'),
			(502, 42, 22, 101, 71, 'internal', 'draft');

		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved'), (3, 'rejected');
		INSERT INTO media_assets(id, visibility_id, review_status_id) VALUES
			(701, 1, 1), (702, 1, 1), (703, 1, 1), (704, 1, 1), (705, 1, 1);
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, uploaded_by_user_id
		) VALUES
			(601, 41, 21, 701, 'screenshot', 1001),
			(602, 41, 21, 702, 'typesetting_karaoke', 1001),
			(603, 41, 21, 703, 'fun_outtake', 1001),
			(604, 41, 21, 704, 'other', 1001),
			(605, 42, 22, 705, 'screenshot', 1001);
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0136_release_review_contribution_rule.up.sql"))

	return &releaseReviewSubmissionFixture{pool: pool}
}

func (f *releaseReviewSubmissionFixture) submitNote(
	t *testing.T,
	sourceID, appUserID int64,
	expectedRevision *int64,
	at time.Time,
) repository.ReleaseReviewLifecycle {
	t.Helper()
	ctx := context.Background()
	tx, err := f.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck

	row, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitNote(
		ctx,
		repository.ReleaseReviewSubmissionInput{
			SourceID:         sourceID,
			ActorAppUserID:   appUserID,
			ExpectedRevision: expectedRevision,
			LastActivityAt:   at,
		},
	)
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	return *row
}

func (f *releaseReviewSubmissionFixture) submitMedia(
	t *testing.T,
	sourceID, appUserID int64,
	expectedRevision *int64,
	at time.Time,
) repository.ReleaseReviewLifecycle {
	t.Helper()
	ctx := context.Background()
	tx, err := f.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck

	row, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
		ctx,
		repository.ReleaseReviewSubmissionInput{
			SourceID:         sourceID,
			ActorAppUserID:   appUserID,
			ExpectedRevision: expectedRevision,
			LastActivityAt:   at,
		},
	)
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	return *row
}

func releaseReviewRevision(value int64) *int64 {
	return &value
}

func TestReleaseSourceSubmitPrivatePendingAndCategoryIdentity(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	startedAt := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)

	note := fx.submitNote(t, 501, 11, nil, startedAt)
	assert.EqualValues(t, 501, note.SourceID)
	assert.EqualValues(t, 1, note.SourceRevision)
	assert.Equal(t, repository.ReleaseReviewStatePending, note.ReviewState)
	assert.EqualValues(t, 21, note.FansubGroupID)
	assert.EqualValues(t, 41, note.ReleaseVersionID)
	assert.EqualValues(t, 11, note.SubmitterAppUserID)
	assert.EqualValues(t, 101, note.SubmitterMemberID)
	assert.True(t, note.LastActivityAt.Equal(startedAt))

	var visibility, status string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT visibility, status FROM release_version_notes WHERE id = 501
	`).Scan(&visibility, &status))
	assert.Equal(t, "internal", visibility)
	assert.Equal(t, "draft", status)

	categories := []string{"screenshot", "typesetting_karaoke", "fun_outtake", "other"}
	for index, category := range categories {
		sourceID := int64(601 + index)
		item := fx.submitMedia(t, sourceID, 11, nil, startedAt.Add(time.Duration(index)*time.Minute))
		assert.EqualValues(t, sourceID, item.SourceID)
		assert.EqualValues(t, 1, item.SourceRevision)
		assert.Equal(t, repository.ReleaseReviewStatePending, item.ReviewState)
		assert.Equal(t, category, item.Category)
		assert.Equal(t, strconv.FormatInt(sourceID, 10), item.StableKey)
	}

	for _, forbiddenTable := range []string{"release_media", "episode_media"} {
		var exists bool
		require.NoError(t, fx.pool.QueryRow(context.Background(), `
			SELECT to_regclass($1) IS NOT NULL
		`, forbiddenTable).Scan(&exists))
		assert.False(t, exists, forbiddenTable)
	}
}

func TestReleaseSourceSubmitRejectEditResubmitKeepsIdentity(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	startedAt := time.Date(2026, 7, 23, 13, 0, 0, 0, time.UTC)
	first := fx.submitNote(t, 501, 11, nil, startedAt)

	service := NewReviewService(fx.pool, ReleaseReviewAdapters())
	_, err := service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: permissions.Actor{
			AppUserID: 12,
			Status:    "active",
		},
		Target: ReviewTargetRef{
			SourceType: ReleaseVersionNoteReviewSourceType,
			StableKey:  first.StableKey,
		},
		Decision:          ReviewDecisionReject,
		RejectionCategory: repository.ReviewRejectionCategory("content.incomplete"),
		RejectReason:      "Der Text braucht noch eine konkrete Korrektur.",
	})
	require.NoError(t, err)

	resubmittedAt := startedAt.Add(2 * time.Hour)
	second := fx.submitNote(t, 501, 11, releaseReviewRevision(1), resubmittedAt)
	assert.EqualValues(t, first.SourceID, second.SourceID)
	assert.Equal(t, first.StableKey, second.StableKey)
	assert.EqualValues(t, 2, second.SourceRevision)
	assert.Equal(t, repository.ReleaseReviewStatePending, second.ReviewState)
	assert.True(t, second.LastActivityAt.Equal(resubmittedAt))

	ctx := context.Background()
	tx, err := fx.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck
	_, err = repository.NewReleaseReviewLifecycleRepository(tx).SubmitNote(
		ctx,
		repository.ReleaseReviewSubmissionInput{
			SourceID:         501,
			ActorAppUserID:   11,
			ExpectedRevision: releaseReviewRevision(1),
			LastActivityAt:   resubmittedAt.Add(time.Hour),
		},
	)
	assert.ErrorIs(t, err, repository.ErrConflict)

	var revision int64
	var lastActivity time.Time
	require.NoError(t, fx.pool.QueryRow(ctx, `
		SELECT source_revision, last_activity_at
		FROM release_version_note_review_lifecycle
		WHERE release_version_note_id = 501
	`).Scan(&revision, &lastActivity))
	assert.EqualValues(t, 2, revision)
	assert.True(t, lastActivity.Equal(resubmittedAt))
}

func TestReleaseReviewOwnershipFailsClosed(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	ctx := context.Background()
	startedAt := time.Date(2026, 7, 23, 14, 0, 0, 0, time.UTC)

	tx, err := fx.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck
	lifecycle := repository.NewReleaseReviewLifecycleRepository(tx)

	_, err = lifecycle.SubmitNote(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID: 999, ActorAppUserID: 11, LastActivityAt: startedAt,
	})
	assert.ErrorIs(t, err, repository.ErrNotFound)

	_, err = lifecycle.SubmitNote(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID: 502, ActorAppUserID: 11, LastActivityAt: startedAt,
	})
	assert.ErrorIs(t, err, repository.ErrNotFound)

	_, err = lifecycle.SubmitMedia(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID: 601, ActorAppUserID: 13, LastActivityAt: startedAt,
	})
	assert.ErrorIs(t, err, repository.ErrValidation)

	fx.submitMedia(t, 601, 11, nil, startedAt)
	service := NewReviewService(fx.pool, ReleaseReviewAdapters())
	_, err = service.Decide(ctx, ReviewDecisionCommand{
		Actor: permissions.Actor{AppUserID: 11, Status: "active"},
		Target: ReviewTargetRef{
			SourceType: ReleaseVersionMediaReviewSourceType,
			StableKey:  "601",
		},
		Decision: ReviewDecisionConfirm,
	})
	assert.ErrorIs(t, err, ErrReviewSelfReviewForbidden)

	_, err = service.Decide(ctx, ReviewDecisionCommand{
		Actor: permissions.Actor{AppUserID: 12, Status: "active"},
		Target: ReviewTargetRef{
			SourceType: ReleaseVersionMediaReviewSourceType,
			StableKey:  "999",
		},
		Decision: ReviewDecisionConfirm,
	})
	assert.ErrorIs(t, err, ErrReviewTargetNotFound)
}

func TestReleaseReviewOwnershipAdaptersApplyAtomicDecisions(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	startedAt := time.Date(2026, 7, 23, 14, 30, 0, 0, time.UTC)
	note := fx.submitNote(t, 501, 11, nil, startedAt)
	media := fx.submitMedia(t, 601, 11, nil, startedAt)
	service := NewReviewService(fx.pool, ReleaseReviewAdapters())
	reviewer := permissions.Actor{AppUserID: 12, Status: "active"}

	_, err := service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: reviewer,
		Target: ReviewTargetRef{
			SourceType: ReleaseVersionNoteReviewSourceType,
			StableKey:  note.StableKey,
		},
		Decision: ReviewDecisionConfirm,
	})
	require.NoError(t, err)

	var noteState, visibility, status string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT lifecycle.review_state, note.visibility, note.status
		FROM release_version_note_review_lifecycle lifecycle
		JOIN release_version_notes note
		  ON note.id = lifecycle.release_version_note_id
		WHERE note.id = 501
	`).Scan(&noteState, &visibility, &status))
	assert.Equal(t, string(repository.ReleaseReviewStateConfirmed), noteState)
	assert.Equal(t, "public", visibility)
	assert.Equal(t, "published", status)

	_, err = service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: reviewer,
		Target: ReviewTargetRef{
			SourceType: ReleaseVersionMediaReviewSourceType,
			StableKey:  media.StableKey,
		},
		Decision:          ReviewDecisionReject,
		RejectionCategory: repository.ReviewRejectionCategory("quality.mismatch"),
		RejectReason:      "Das Bild braucht eine nachvollziehbare Korrektur.",
	})
	require.NoError(t, err)

	var mediaState string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT review_state
		FROM release_version_media_review_lifecycle
		WHERE release_version_media_id = 601
	`).Scan(&mediaState))
	assert.Equal(t, string(repository.ReleaseReviewStateRejected), mediaState)

	var publishedEvents int
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT COUNT(*)
		FROM review_audit_events
		WHERE source_type = $1
		  AND source_key = $2
		  AND event_code = 'source.published'
	`, ReleaseVersionNoteReviewSourceType, note.StableKey).Scan(&publishedEvents))
	assert.Equal(t, 1, publishedEvents)
}

func TestReleaseSourceSubmitRequestSurfacesDoNotOwnReviewState(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	handlers := filepath.Join(filepath.Dir(file), "..", "handlers")

	noteSource, err := os.ReadFile(filepath.Join(handlers, "admin_content_release_version_notes.go"))
	require.NoError(t, err)
	noteRequest := string(noteSource)
	requestStart := strings.Index(noteRequest, "type bulkNoteItemRequest struct")
	require.Greater(t, requestStart, -1)
	requestEnd := strings.Index(noteRequest[requestStart:], "\n}")
	require.Greater(t, requestEnd, -1)
	noteRequest = noteRequest[requestStart : requestStart+requestEnd+len("\n}")]
	for _, forbidden := range []string{
		`json:"member_id"`,
		`json:"role_id"`,
		`json:"fansub_group_id"`,
		`json:"visibility"`,
		`json:"status"`,
		`json:"review_status"`,
		`json:"points"`,
		`json:"rule"`,
		`json:"idempotency_key"`,
	} {
		assert.NotContains(t, noteRequest, forbidden)
	}

	mediaSource, err := os.ReadFile(filepath.Join(handlers, "admin_content_release_version_media.go"))
	require.NoError(t, err)
	for _, forbidden := range []string{
		`c.PostForm("visibility_code")`,
		`c.PostForm("review_status_code")`,
		`c.PostForm("fansub_group_id")`,
		`rawBody["visibility"]`,
		`rawBody["review_status"]`,
	} {
		assert.NotContains(t, string(mediaSource), forbidden)
	}
}

func TestReleaseReviewOwnershipExactLandedErrors(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	fx.submitNote(t, 501, 11, nil, time.Date(2026, 7, 23, 15, 0, 0, 0, time.UTC))

	_, err := NewReviewService(fx.pool, ReleaseReviewAdapters()).Decide(
		context.Background(),
		ReviewDecisionCommand{
			Actor: permissions.Actor{AppUserID: 11, Status: "active"},
			Target: ReviewTargetRef{
				SourceType: ReleaseVersionNoteReviewSourceType,
				StableKey:  "501",
			},
			Decision: ReviewDecisionReject,
		},
	)
	assert.True(t,
		errors.Is(err, ErrReviewRejectionCategoryRequired) ||
			errors.Is(err, ErrReviewSelfReviewForbidden),
		"must preserve an errors.Is-compatible landed Phase-107 sentinel: %v", err,
	)
}
