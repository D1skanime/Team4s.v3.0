package repository

import (
	"context"
	"path/filepath"
	"runtime"
	"strconv"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// openReleaseVersionMediaReplaceFixture mirrors
// backend/internal/services/release_review_submission_test.go's
// openReleaseReviewSubmissionFixture (same schema shape), but lives in package
// repository (not services) to avoid an import cycle: this test needs
// MemberProfileRepository.loadContribArchivistCount, an unexported method only
// callable from inside package repository itself.
//
// testsupport.OpenPhase107Postgres already applies migrations
// 0131_member_point_foundation.up.sql/0132/0133 as part of its own prerequisites
// (createPhase107Prerequisites) — re-applying 0131 here would fail with a duplicate
// table error, so only 0134/0135 are layered on top, exactly like the services
// fixture already does.
func openReleaseVersionMediaReplaceFixture(t *testing.T) *pgxpool.Pool {
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
		CREATE UNIQUE INDEX uq_rvm_replace_app_users_legacy
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
			status TEXT NOT NULL DEFAULT 'processing',
			visibility_id BIGINT NOT NULL REFERENCES visibilities(id),
			review_status_id BIGINT NOT NULL REFERENCES review_statuses(id)
		);
		CREATE TABLE media_files (
			id BIGSERIAL PRIMARY KEY,
			media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL
		);
		-- Unused by this file's tests, but 0135_release_review_lifecycle.up.sql's
		-- release_version_note_review_lifecycle table has a hard FK to it.
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NULL REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);

		INSERT INTO users(id) VALUES (2001);
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (11, 'active', 2001);
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO release_versions(id) VALUES (41);
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21);
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at) VALUES
			(201, 101, 11, 'verified', NOW());
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role)
		VALUES (31, 'fansub_lead');

		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved'), (3, 'rejected');
		-- 701: the relation-under-test's original ("old") file.
		-- 702: a spare free-standing asset used as the "new" file in replace calls.
		-- 703: a control asset that already satisfies the archivist-badge filter
		--      (ready/public/approved), attached to a second, unrelated relation.
		INSERT INTO media_assets(id, status, visibility_id, review_status_id) VALUES
			(701, 'processing', 1, 1),
			(702, 'processing', 1, 1),
			(703, 'ready', 2, 2);
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, uploaded_by_user_id
		) VALUES
			(601, 41, 21, 701, 'screenshot', 2001),
			(602, 41, 21, 703, 'screenshot', 2001);
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	return pool
}

// submitMedia is a thin wrapper around ReleaseReviewLifecycleRepository.SubmitMedia,
// mirroring release_review_submission_test.go's fixture.submitMedia helper.
func submitMedia(
	t *testing.T,
	pool *pgxpool.Pool,
	sourceID, appUserID int64,
	expectedRevision *int64,
	at time.Time,
) *ReleaseReviewLifecycle {
	t.Helper()
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck

	lifecycle, err := NewReleaseReviewLifecycleRepository(tx).SubmitMedia(ctx, ReleaseReviewSubmissionInput{
		SourceID:         sourceID,
		ActorAppUserID:   appUserID,
		ExpectedRevision: expectedRevision,
		LastActivityAt:   at,
	})
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	return lifecycle
}

// rejectLifecycle simulates a prior reviewer rejection by mutating the lifecycle
// table's own state directly — this repository-layer test only needs the lifecycle
// row's state, not a full review_decisions/review_audit_events fabrication.
func rejectLifecycle(t *testing.T, pool *pgxpool.Pool, relationID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		UPDATE release_version_media_review_lifecycle
		SET review_state = 'rejected', decided_at = NOW()
		WHERE release_version_media_id = $1
	`, relationID)
	require.NoError(t, err)
}

// replaceFile opens one transaction and composes ReplaceReleaseVersionMediaFile,
// EnqueueReleaseVersionMediaFileDeleteJob (for the returned previous asset id), and
// SubmitMedia — mirroring the exact three-call composition 144-04's handler will
// later perform.
func replaceFile(
	t *testing.T,
	pool *pgxpool.Pool,
	relationID, newMediaAssetID, actorAppUserID int64,
	expectedRevision *int64,
	at time.Time,
) (previousMediaAssetID int64, lifecycle *ReleaseReviewLifecycle) {
	t.Helper()
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck

	repo := NewMediaRepository(pool, "")

	previousMediaAssetID, err = repo.ReplaceReleaseVersionMediaFile(ctx, tx, relationID, newMediaAssetID)
	require.NoError(t, err)

	require.NoError(t, repo.EnqueueReleaseVersionMediaFileDeleteJob(ctx, tx, relationID, previousMediaAssetID, at))

	lifecycle, err = NewReleaseReviewLifecycleRepository(tx).SubmitMedia(ctx, ReleaseReviewSubmissionInput{
		SourceID:         relationID,
		ActorAppUserID:   actorAppUserID,
		ExpectedRevision: expectedRevision,
		LastActivityAt:   at,
	})
	require.NoError(t, err)

	require.NoError(t, tx.Commit(ctx))
	return previousMediaAssetID, lifecycle
}

func rvmReplaceRevision(value int64) *int64 {
	return &value
}

func TestReleaseVersionMediaReplaceFilePreservesIdentityAndResetsLifecycle(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	startedAt := time.Now().UTC().Add(-10 * time.Minute)

	submitMedia(t, pool, 601, 11, nil, startedAt)
	rejectLifecycle(t, pool, 601)

	var relationCountBefore int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_media`).Scan(&relationCountBefore))

	replacedAt := startedAt.Add(time.Hour)
	_, lifecycle := replaceFile(t, pool, 601, 702, 11, rvmReplaceRevision(1), replacedAt)

	var idAfter, mediaAssetIDAfter int64
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT id, media_asset_id FROM release_version_media WHERE id = 601
	`).Scan(&idAfter, &mediaAssetIDAfter))
	assert.EqualValues(t, 601, idAfter)
	assert.EqualValues(t, 702, mediaAssetIDAfter)

	var relationCountAfter int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_media`).Scan(&relationCountAfter))
	assert.Equal(t, relationCountBefore, relationCountAfter)

	assert.EqualValues(t, 2, lifecycle.SourceRevision)

	var reviewState string
	var decidedAt *time.Time
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT review_state, decided_at
		FROM release_version_media_review_lifecycle
		WHERE release_version_media_id = 601
	`).Scan(&reviewState, &decidedAt))
	assert.Equal(t, string(ReleaseReviewStatePending), reviewState)
	assert.Nil(t, decidedAt)
}

func TestReleaseVersionMediaReplaceFileHandlesPriorFile(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO media_files(media_id, variant) VALUES (701, 'original'), (701, 'thumb')
	`)
	require.NoError(t, err)

	repo := NewMediaRepository(pool, "")
	at := time.Now().UTC()

	for i := 0; i < 2; i++ {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, repo.EnqueueReleaseVersionMediaFileDeleteJob(ctx, tx, 601, 701, at))
		require.NoError(t, tx.Commit(ctx))
	}

	var jobCount int64
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM release_review_file_delete_jobs
		WHERE release_version_media_id = 601 AND media_asset_id = 701
	`).Scan(&jobCount))
	assert.EqualValues(t, 2, jobCount)
}

func TestReleaseVersionMediaReplaceFileDoesNotCreditPoints(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	startedAt := time.Now().UTC().Add(-10 * time.Minute)
	sourceKey := strconv.FormatInt(601, 10)

	countCreditEntries := func() int64 {
		var count int64
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM point_ledger_entries
			WHERE source_type = 'release_version_media' AND source_key = $1
		`, sourceKey).Scan(&count))
		return count
	}

	assert.EqualValues(t, 0, countCreditEntries())

	submitMedia(t, pool, 601, 11, nil, startedAt)
	rejectLifecycle(t, pool, 601)
	replaceFile(t, pool, 601, 702, 11, rvmReplaceRevision(1), startedAt.Add(time.Hour))

	assert.EqualValues(t, 0, countCreditEntries())
}

func TestReleaseVersionMediaReplaceFileArchivistCountUnchanged(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	startedAt := time.Now().UTC().Add(-10 * time.Minute)
	const memberID int64 = 101

	profileRepo := NewMemberProfileRepository(pool, "")

	countBefore, err := profileRepo.loadContribArchivistCount(ctx, memberID)
	require.NoError(t, err)
	assert.EqualValues(t, 1, countBefore, "only the control relation (602/703) should count before replace")

	submitMedia(t, pool, 601, 11, nil, startedAt)
	rejectLifecycle(t, pool, 601)
	replaceFile(t, pool, 601, 702, 11, rvmReplaceRevision(1), startedAt.Add(time.Hour))

	countAfter, err := profileRepo.loadContribArchivistCount(ctx, memberID)
	require.NoError(t, err)
	assert.EqualValues(t, countBefore, countAfter, "replacing the file must not change the archivist badge count")
}
