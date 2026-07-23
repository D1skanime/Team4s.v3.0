package services

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type releaseReviewCleanupFixture struct {
	*releaseReviewSubmissionFixture
}

func openReleaseReviewCleanupFixture(t *testing.T) *releaseReviewCleanupFixture {
	t.Helper()
	base := openReleaseReviewSubmissionFixture(t)
	_, err := base.pool.Exec(context.Background(), `
		ALTER TABLE release_version_notes
			ADD COLUMN title TEXT NULL,
			ADD COLUMN body_markdown TEXT NOT NULL DEFAULT '',
			ADD COLUMN body_html TEXT NOT NULL DEFAULT '',
			ADD COLUMN body_json JSONB NULL,
			ADD COLUMN body_text TEXT NOT NULL DEFAULT '';
		ALTER TABLE release_version_media
			ADD COLUMN caption TEXT NULL,
			ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0,
			ADD COLUMN is_preview_candidate BOOLEAN NOT NULL DEFAULT false,
			ADD COLUMN updated_at TIMESTAMPTZ NULL;
		ALTER TABLE media_assets
			ADD COLUMN file_path TEXT NOT NULL DEFAULT '',
			ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'image/png',
			ADD COLUMN status TEXT NOT NULL DEFAULT 'ready';
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			variant TEXT NOT NULL,
			path TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'ready'
		);
		CREATE TABLE fansub_group_media (
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			media_id BIGINT NOT NULL REFERENCES media_assets(id),
			PRIMARY KEY (group_id, media_id)
		);
		INSERT INTO release_version_notes(
			id, release_version_id, fansub_group_id, member_id, role_id, visibility, status
		) VALUES
			(503, 41, 21, 101, 71, 'internal', 'draft'),
			(504, 41, 21, 101, 71, 'internal', 'draft'),
			(505, 41, 21, 101, 71, 'internal', 'draft'),
			(506, 41, 21, 101, 71, 'internal', 'draft');
		UPDATE release_version_notes
		SET title = 'Privater Titel',
		    body_markdown = 'privat',
		    body_html = '<p>privat</p>',
		    body_json = '{"type":"doc"}',
		    body_text = 'privat'
		WHERE id BETWEEN 501 AND 506;
	`)
	require.NoError(t, err)
	return &releaseReviewCleanupFixture{releaseReviewSubmissionFixture: base}
}

func (f *releaseReviewCleanupFixture) rejectNote(
	t *testing.T,
	sourceID int64,
	lastActivity time.Time,
) {
	t.Helper()
	source := f.submitNote(t, sourceID, 11, nil, lastActivity)
	_, err := NewReviewService(f.pool, ReleaseReviewAdapters()).Decide(
		context.Background(),
		ReviewDecisionCommand{
			Actor: permissions.Actor{AppUserID: 12, Status: "active"},
			Target: ReviewTargetRef{
				SourceType: ReleaseVersionNoteReviewSourceType,
				StableKey:  source.StableKey,
			},
			Decision:          ReviewDecisionReject,
			RejectionCategory: repository.ReviewRejectionCategory("content.incomplete"),
			RejectReason:      "Dieser private Grund muss nach der Retention verschwinden.",
		},
	)
	require.NoError(t, err)
	_, err = f.pool.Exec(context.Background(), `
		UPDATE release_version_note_review_lifecycle
		SET last_activity_at = $2,
		    cleanup_due_at = $2
		WHERE release_version_note_id = $1
	`, sourceID, lastActivity)
	require.NoError(t, err)
}

func (f *releaseReviewCleanupFixture) rejectMedia(
	t *testing.T,
	relationID, fileID int64,
	path string,
	lastActivity time.Time,
) {
	t.Helper()
	_, err := f.pool.Exec(context.Background(), `
		UPDATE media_assets
		SET file_path = $2, mime_type = 'image/png', status = 'ready'
		WHERE id = (
			SELECT media_asset_id FROM release_version_media WHERE id = $1
		);
		INSERT INTO media_files(id, media_id, variant, path, status)
		SELECT $3, media_asset_id, 'original', $2, 'ready'
		FROM release_version_media
		WHERE id = $1;
		UPDATE release_version_media
		SET caption = 'privat', is_preview_candidate = true
		WHERE id = $1;
	`, relationID, path, fileID)
	require.NoError(t, err)

	source := f.submitMedia(t, relationID, 11, nil, lastActivity)
	_, err = NewReviewService(f.pool, ReleaseReviewAdapters()).Decide(
		context.Background(),
		ReviewDecisionCommand{
			Actor: permissions.Actor{AppUserID: 12, Status: "active"},
			Target: ReviewTargetRef{
				SourceType: ReleaseVersionMediaReviewSourceType,
				StableKey:  source.StableKey,
			},
			Decision:          ReviewDecisionReject,
			RejectionCategory: repository.ReviewRejectionCategory("quality.mismatch"),
			RejectReason:      "Dieses private Bild muss nach der Retention verschwinden.",
		},
	)
	require.NoError(t, err)
	_, err = f.pool.Exec(context.Background(), `
		UPDATE release_version_media_review_lifecycle
		SET last_activity_at = $2,
		    cleanup_due_at = $2
		WHERE release_version_media_id = $1
	`, relationID, lastActivity)
	require.NoError(t, err)
}

type releaseReviewCleanupFileStoreFake struct {
	root          string
	resolveCalls  []string
	removeCalls   []string
	removeFailure map[string]error
}

func (f *releaseReviewCleanupFileStoreFake) ResolveManagedPath(raw string) (string, bool) {
	f.resolveCalls = append(f.resolveCalls, raw)
	clean := filepath.Clean(strings.TrimSpace(raw))
	if clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) ||
		filepath.IsAbs(clean) {
		return "", false
	}
	return filepath.Join(f.root, clean), true
}

func (f *releaseReviewCleanupFileStoreFake) RemoveResolvedManagedFile(path string) error {
	f.removeCalls = append(f.removeCalls, path)
	if err := f.removeFailure[path]; err != nil {
		delete(f.removeFailure, path)
		return err
	}
	return nil
}

func newReleaseReviewCleanupServiceForTest(
	fx *releaseReviewCleanupFixture,
	files ReleaseReviewCleanupFileStore,
	now *time.Time,
	retention time.Duration,
) *ReleaseReviewCleanupService {
	return NewReleaseReviewCleanupService(
		repository.NewReleaseReviewCleanupRepository(fx.pool),
		files,
		retention,
		func() time.Time { return *now },
	)
}

func TestReleaseReviewCleanupControlledCutoffsAndResubmit(t *testing.T) {
	fx := openReleaseReviewCleanupFixture(t)
	now := time.Date(2026, 7, 23, 18, 0, 0, 0, time.UTC)
	cutoff := now.Add(-90 * 24 * time.Hour)
	fx.rejectNote(t, 501, cutoff.Add(-time.Second))
	fx.rejectNote(t, 503, cutoff)
	fx.rejectNote(t, 504, cutoff.Add(time.Second))
	fx.rejectNote(t, 505, cutoff.Add(-time.Hour))

	resubmitted := fx.submitNote(t, 505, 11, releaseReviewRevision(1), now.Add(-time.Hour))
	require.EqualValues(t, 2, resubmitted.SourceRevision)

	files := &releaseReviewCleanupFileStoreFake{
		root:          t.TempDir(),
		removeFailure: map[string]error{},
	}
	service := newReleaseReviewCleanupServiceForTest(fx, files, &now, 90*24*time.Hour)
	require.NoError(t, service.RunOnce(context.Background()))

	rows, err := fx.pool.Query(context.Background(), `
		SELECT release_version_note_id, review_state
		FROM release_version_note_review_lifecycle
		WHERE release_version_note_id IN (501, 503, 504, 505)
		ORDER BY release_version_note_id
	`)
	require.NoError(t, err)
	defer rows.Close()
	states := map[int64]string{}
	for rows.Next() {
		var id int64
		var state string
		require.NoError(t, rows.Scan(&id, &state))
		states[id] = state
	}
	require.NoError(t, rows.Err())
	assert.Equal(t, "tombstoned", states[501], "before cutoff is expired")
	assert.Equal(t, "tombstoned", states[503], "equal cutoff is expired")
	assert.Equal(t, "rejected", states[504], "after cutoff is retained")
	assert.Equal(t, "pending", states[505], "edit/resubmit resets retention")

	assert.Equal(t, 90*24*time.Hour, ReleaseReviewCleanupRetentionForProfile("production"))
	assert.Equal(t, 5*time.Hour, ReleaseReviewCleanupRetentionForProfile("local"))
}

func TestReleaseReviewCleanupTombstoneScrubsContentAndReason(t *testing.T) {
	fx := openReleaseReviewCleanupFixture(t)
	now := time.Date(2026, 7, 23, 19, 0, 0, 0, time.UTC)
	fx.rejectNote(t, 506, now.Add(-5*time.Hour))
	files := &releaseReviewCleanupFileStoreFake{
		root:          t.TempDir(),
		removeFailure: map[string]error{},
	}

	service := newReleaseReviewCleanupServiceForTest(fx, files, &now, 5*time.Hour)
	require.NoError(t, service.RunOnce(context.Background()))

	var state, title, markdown, html, text string
	var bodyJSON []byte
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT lifecycle.review_state, COALESCE(note.title, ''),
		       note.body_markdown, note.body_html, note.body_json, note.body_text
		FROM release_version_note_review_lifecycle lifecycle
		JOIN release_version_notes note
		  ON note.id = lifecycle.release_version_note_id
		WHERE note.id = 506
	`).Scan(&state, &title, &markdown, &html, &bodyJSON, &text))
	assert.Equal(t, "tombstoned", state)
	assert.Empty(t, title)
	assert.Empty(t, markdown)
	assert.Empty(t, html)
	assert.Nil(t, bodyJSON)
	assert.Empty(t, text)

	var reasons, rejectedAudit, scrubAudit int
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT
			COUNT(reason.*),
			COUNT(*) FILTER (WHERE event.event_code = 'review.rejected'),
			COUNT(*) FILTER (WHERE event.event_code = 'reason.scrubbed')
		FROM review_audit_events event
		LEFT JOIN review_reason_texts reason ON reason.audit_event_id = event.id
		WHERE event.source_type = 'release_version_note'
		  AND event.source_key = '506'
	`).Scan(&reasons, &rejectedAudit, &scrubAudit))
	assert.Zero(t, reasons)
	assert.Equal(t, 1, rejectedAudit, "structured rejection audit survives")
	assert.Equal(t, 1, scrubAudit, "structured scrub audit remains")
}

func TestReleaseReviewCleanupPersistentRetryIsIndependentAndIdempotent(t *testing.T) {
	fx := openReleaseReviewCleanupFixture(t)
	now := time.Date(2026, 7, 23, 20, 0, 0, 0, time.UTC)
	const rawPath = "release-review/orphan.png"
	fx.rejectMedia(t, 601, 801, rawPath, now.Add(-5*time.Hour))

	files := &releaseReviewCleanupFileStoreFake{
		root: t.TempDir(),
		removeFailure: map[string]error{
			filepath.Join(t.TempDir(), "unused"): errors.New("unused"),
		},
	}
	resolved, ok := files.ResolveManagedPath(rawPath)
	require.True(t, ok)
	files.resolveCalls = nil
	files.removeFailure = map[string]error{resolved: errors.New("storage unavailable")}
	service := newReleaseReviewCleanupServiceForTest(fx, files, &now, 5*time.Hour)

	require.NoError(t, service.RunOnce(context.Background()))
	var state, jobState, lastError string
	var attempts int
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT lifecycle.review_state, job.job_state, job.attempt_count,
		       COALESCE(job.last_error_code, '')
		FROM release_version_media_review_lifecycle lifecycle
		JOIN release_review_file_delete_jobs job
		  ON job.release_version_media_id = lifecycle.release_version_media_id
		WHERE lifecycle.release_version_media_id = 601
	`).Scan(&state, &jobState, &attempts, &lastError))
	assert.Equal(t, "tombstoned", state, "logical cleanup commits despite storage failure")
	assert.Equal(t, "pending", jobState)
	assert.Equal(t, 1, attempts)
	assert.Equal(t, "storage_remove_failed", lastError)
	require.Len(t, files.removeCalls, 1)

	now = now.Add(ReleaseReviewCleanupRetryDelay + time.Second)
	require.NoError(t, service.RunOnce(context.Background()))
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT job_state, attempt_count, COALESCE(last_error_code, '')
		FROM release_review_file_delete_jobs
		WHERE media_file_id = 801
	`).Scan(&jobState, &attempts, &lastError))
	assert.Equal(t, "completed", jobState)
	assert.Equal(t, 2, attempts)
	assert.Empty(t, lastError)
	require.Len(t, files.removeCalls, 2)

	require.NoError(t, service.RunOnce(context.Background()))
	assert.Len(t, files.removeCalls, 2, "completed retry job is idempotent")
}

func TestReleaseReviewCleanupFinalReferenceAndCanonicalPathGuards(t *testing.T) {
	fx := openReleaseReviewCleanupFixture(t)
	now := time.Date(2026, 7, 23, 21, 0, 0, 0, time.UTC)
	fx.rejectMedia(t, 602, 802, "release-review/shared.png", now.Add(-5*time.Hour))
	fx.rejectMedia(t, 603, 803, "../../history-event-badges-transparent/protected.png", now.Add(-5*time.Hour))
	_, err := fx.pool.Exec(context.Background(), `
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, uploaded_by_user_id
		) VALUES (606, 41, 21, 702, 'screenshot', 1001);
		INSERT INTO fansub_group_media(group_id, media_id) VALUES (21, 702);
	`)
	require.NoError(t, err)

	files := &releaseReviewCleanupFileStoreFake{
		root:          t.TempDir(),
		removeFailure: map[string]error{},
	}
	service := newReleaseReviewCleanupServiceForTest(fx, files, &now, 5*time.Hour)
	require.NoError(t, service.RunOnce(context.Background()))

	var sharedState, escapedState, escapedError string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT job_state FROM release_review_file_delete_jobs WHERE media_file_id = 802
	`).Scan(&sharedState))
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT job_state, COALESCE(last_error_code, '')
		FROM release_review_file_delete_jobs WHERE media_file_id = 803
	`).Scan(&escapedState, &escapedError))
	assert.Equal(t, "completed", sharedState, "shared file is retained without retry churn")
	assert.Equal(t, "pending", escapedState)
	assert.Equal(t, "path_outside_managed_storage", escapedError)
	assert.Empty(t, files.removeCalls, "shared and escaped paths never reach remove")

	var sharedStatus string
	require.NoError(t, fx.pool.QueryRow(context.Background(), `
		SELECT status FROM media_files WHERE id = 802
	`).Scan(&sharedStatus))
	assert.Equal(t, "ready", sharedStatus)
}

func TestReleaseReviewCleanupProductionStorageSeamProtectsBadgeAssets(t *testing.T) {
	storageRoot := t.TempDir()
	storage := NewRVMCleanupService(nil, storageRoot)

	resolved, ok := storage.ResolveManagedPath("release-review/canonical.png")
	require.True(t, ok)
	assert.Equal(t, filepath.Join(storageRoot, "release-review", "canonical.png"), resolved)

	_, ok = storage.ResolveManagedPath(
		"history-event-badges-transparent/production-badge.png",
	)
	assert.False(t, ok, "tracked production milestone badges are never cleanup targets")
}
