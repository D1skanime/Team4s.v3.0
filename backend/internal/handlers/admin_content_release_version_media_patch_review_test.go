package handlers

// Real-Postgres behavioral tests for release-review-metadata-409 (debug session,
// 2026-10-13): a metadata-only edit on an already-confirmed release_version_media must keep
// its existing approval and must not reappear in the review queue; only an actual file
// replacement may reopen review; and a decision against a stale (client-side) revision must
// get its own, distinguishable 409 instead of being folded into "already decided by someone
// else". Every assertion here executes the real AdminContentHandler / ReleaseReviewHandler /
// services.ReviewService code against a real, schema-isolated Postgres fixture -- never a
// fake repository and never a source-text grep (CLAUDE.md Teststil).

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// openRVMReviewFixture is openRVMExecFixture plus 0136's release.contribution point rule and
// the handful of columns releaseReviewQueueBaseSQL's shared queue projection (anime title,
// episode number, release version string, submitter display name, note title/body) selects
// but openRVMExecFixture's intentionally minimal schema never needed before this file --
// ReleaseReviewQueryRepository.List/Detail only run in this debug session's new tests.
func openRVMReviewFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openRVMExecFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		ALTER TABLE anime ADD COLUMN title_de TEXT NULL, ADD COLUMN title_en TEXT NULL, ADD COLUMN title TEXT NULL;
		ALTER TABLE episodes ADD COLUMN episode_number TEXT NULL;
		ALTER TABLE release_versions ADD COLUMN version TEXT NULL;
		ALTER TABLE members ADD COLUMN display_name TEXT NULL, ADD COLUMN nickname TEXT NULL;
		ALTER TABLE release_version_notes
			ADD COLUMN release_version_id BIGINT NULL REFERENCES release_versions(id),
			ADD COLUMN fansub_group_id BIGINT NULL REFERENCES fansub_groups(id),
			ADD COLUMN member_id BIGINT NULL REFERENCES members(id),
			ADD COLUMN title TEXT NULL,
			ADD COLUMN body_html TEXT NULL,
			ADD COLUMN deleted_at TIMESTAMPTZ NULL;
		UPDATE release_versions SET version = 'v1' WHERE id = 41;
		UPDATE episodes SET episode_number = '01' WHERE id = 911;
		UPDATE anime SET title = 'Testanime' WHERE id = 901;
		UPDATE members SET display_name = 'Testmitglied' WHERE id = 101;
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, replaceRVMMigrationPath(t, "0136_release_review_contribution_rule.up.sql"))
	return pool
}

// newRVMReviewHandler builds a real *ReleaseReviewHandler wired to the given fixture pool --
// a real repository.ReleaseReviewQueryRepository, a real permissions.Service over a real
// repository.AuthzRepository, and a real services.ReviewService with the production release
// review adapters. Every identity used alongside it in this file is IsPlatformAdmin so every
// permission check short-circuits without depending on the package-level role-capability
// cache (see rvmExecPlatformAdminIdentity's doc comment).
func newRVMReviewHandler(pool *pgxpool.Pool) *ReleaseReviewHandler {
	return NewReleaseReviewHandler(
		repository.NewReleaseReviewQueryRepository(pool),
		permissions.NewService(repository.NewAuthzRepository(pool)),
		services.NewReviewService(pool, services.ReleaseReviewAdapters()),
		repository.NewAuthzRepository(pool),
	)
}

// rvmReviewReplaceFileRequest is replaceRVMMultipartRequest plus an explicit source_revision
// form field -- ReplaceReleaseVersionMediaFile treats a missing source_revision as "no
// optimistic-concurrency participation", which SubmitMedia's own revision check then rejects
// outright for an uploader resubmitting onto an existing lifecycle row.
func rvmReviewReplaceFileRequest(t *testing.T, target string, expectedRevision int64) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.WriteField("source_revision", strconv.FormatInt(expectedRevision, 10)))
	part, err := w.CreateFormFile("file", "replacement.png")
	require.NoError(t, err)
	_, err = part.Write(tinyValidPNGBytes(t))
	require.NoError(t, err)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPut, target, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

// fixedRVMReviewDecidedAt is a stable timestamp for the synthetic "foreign decision" row
// TestReleaseReviewDecisionDistinguishesStaleRevisionFromForeignDecision inserts directly.
func fixedRVMReviewDecidedAt() time.Time {
	return time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)
}

func rvmReviewDecideRequest(t *testing.T, groupID, reviewID int64, decision string, expectedRevision int64) *http.Request {
	t.Helper()
	encoded, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionMediaReviewSourceType, reviewID)
	require.NoError(t, err)
	body, err := json.Marshal(map[string]any{"decision": decision, "expected_revision": expectedRevision})
	require.NoError(t, err)
	req := httptest.NewRequest(
		http.MethodPost,
		fmt.Sprintf("/api/v1/admin/fansubs/%d/release-reviews/%s/decision", groupID, encoded),
		bytes.NewReader(body),
	)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func rvmReviewDecideParams(t *testing.T, reviewID int64, groupID string) gin.Params {
	t.Helper()
	encoded, err := repository.EncodeReleaseReviewID(repository.ReleaseVersionMediaReviewSourceType, reviewID)
	require.NoError(t, err)
	return gin.Params{{Key: "id", Value: groupID}, {Key: "reviewId", Value: encoded}}
}

// rvmReviewDecisionErrorCode extracts error.code from a non-2xx JSON response body.
func rvmReviewDecisionErrorCode(t *testing.T, body []byte) string {
	t.Helper()
	var parsed struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(body, &parsed))
	return parsed.Error.Code
}

// TestReleaseReviewMetadataEditKeepsConfirmationFileReplaceReopensReview is the end-to-end
// proof for release-review-metadata-409's three acceptance criteria (debug session item 5):
//  1. A metadata-only PATCH on an already-confirmed medium keeps it confirmed and makes it
//     disappear from the open review queue -- it must NOT reopen review.
//  2. An actual file replacement on that same, already-confirmed medium DOES reopen review
//     (review_state back to 'pending', reappears in the open queue) -- by design, unchanged.
//  3. The reviewer can decide the reopened medium again without an unrelated "idempotency
//     mismatch" error blocking a perfectly legitimate second confirmation.
func TestReleaseReviewMetadataEditKeepsConfirmationFileReplaceReopensReview(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMReviewFixture(t)
	adminHandler := newRVMExecHandler(pool, t.TempDir())
	reviewHandler := newRVMReviewHandler(pool)
	const groupID = int64(21)

	relationID := rvmExecUploadOne(t, adminHandler, "screenshot")
	lead := rvmExecSecondLeadIdentity(t, pool)

	confirm := func(expectedRevision int64) (*httptest.ResponseRecorder, map[string]any) {
		req := rvmReviewDecideRequest(t, groupID, relationID, "confirm", expectedRevision)
		c, rec := replaceRVMContext(req, rvmReviewDecideParams(t, relationID, strconv.FormatInt(groupID, 10)), lead)
		reviewHandler.Decide(c)
		var parsed map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &parsed)
		return rec, parsed
	}

	// Step 1: the reviewer (lead, not the uploader) confirms revision 1.
	rec, _ := confirm(1)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	revision, state, _ := rvmExecMediaLifecycleSnapshot(t, pool, relationID)
	require.EqualValues(t, 1, revision)
	require.Equal(t, string(repository.ReleaseReviewStateConfirmed), state)

	// Step 2: a pure metadata edit (caption) by the uploader -- no file involved at all.
	patchBody := bytes.NewBufferString(fmt.Sprintf(`{"caption":"Nur Text geändert","source_revision":%d}`, revision))
	patchReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), patchBody)
	patchReq.Header.Set("Content-Type", "application/json")
	patchC, patchRec := replaceRVMContext(patchReq,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())
	adminHandler.PatchReleaseVersionMedia(patchC)
	require.Equal(t, http.StatusOK, patchRec.Code, patchRec.Body.String())

	revisionAfterPatch, stateAfterPatch, captionAfterPatch := rvmExecMediaLifecycleSnapshot(t, pool, relationID)
	require.EqualValues(t, revision+1, revisionAfterPatch,
		"the optimistic-concurrency revision still advances on a metadata edit")
	require.Equal(t, string(repository.ReleaseReviewStateConfirmed), stateAfterPatch,
		"a metadata-only edit on an already-confirmed medium must NOT reopen review")
	require.Equal(t, "Nur Text geändert", captionAfterPatch)

	// The medium must not reappear in the open review queue after a metadata-only edit.
	listOpen, err := repository.NewReleaseReviewQueryRepository(pool).List(context.Background(), repository.ReleaseReviewQueueOptions{
		Scope:        repository.ReleaseReviewQueueScope{FansubGroupID: groupID, View: repository.ReleaseReviewQueueViewOpen},
		AllowedKinds: []string{string(repository.ReviewKindImage)},
		Limit:        repository.NormalizeReleaseReviewQueueLimit(0),
	})
	require.NoError(t, err)
	for _, item := range listOpen.Items {
		require.NotEqual(t, strconv.FormatInt(relationID, 10), extractReleaseReviewSourceID(t, item.ID),
			"a metadata-only edit must not bring the medium back into the open review queue")
	}

	// Step 3: an actual file replacement on the same, already-confirmed medium. This DOES
	// reopen review by design (BUG-174-04/WR-03) -- only the metadata path changed above.
	replaceReq := rvmReviewReplaceFileRequest(t, fmt.Sprintf("/release-versions/41/media/%d/file", relationID), revisionAfterPatch)
	replaceC, replaceRec := replaceRVMContext(replaceReq,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())
	adminHandler.ReplaceReleaseVersionMediaFile(replaceC)
	require.Equal(t, http.StatusOK, replaceRec.Code, replaceRec.Body.String())

	revisionAfterReplace, stateAfterReplace, _ := rvmExecMediaLifecycleSnapshot(t, pool, relationID)
	require.Equal(t, string(repository.ReleaseReviewStatePending), stateAfterReplace,
		"an actual file replacement must reopen review, unlike a metadata-only edit")

	// Step 4: the reviewer can confirm the reopened medium again. Before this debug
	// session's fix, this failed with a "point award idempotency mismatch" conflict because
	// the submitter's one-time work-contribution credit was not idempotent across revisions.
	rec, body := confirm(revisionAfterReplace)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.NotNil(t, body["data"])

	finalRevision, finalState, _ := rvmExecMediaLifecycleSnapshot(t, pool, relationID)
	require.Equal(t, revisionAfterReplace, finalRevision)
	require.Equal(t, string(repository.ReleaseReviewStateConfirmed), finalState)

	var contributionCredits int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM point_ledger_entries
		WHERE source_type = 'release_version_media' AND source_key = $1
	`, strconv.FormatInt(relationID, 10)).Scan(&contributionCredits))
	require.Equal(t, 1, contributionCredits,
		"the submitter's one-time work-contribution credit must be awarded exactly once, not once per confirmed revision")
}

// TestReleaseReviewDecisionDistinguishesStaleRevisionFromForeignDecision proves writeDecisionError's
// and Decide's revision pre-check's three error buckets (release-review-metadata-409 item 3) are
// genuinely distinguishable in a real decision flow, not just in source text:
//   - a stale client-side revision (the client's own copy is outdated) gets REVIEW_STALE_REVISION
//   - a real foreign decision already recorded for the exact same revision gets REVIEW_ALREADY_DECIDED
func TestReleaseReviewDecisionDistinguishesStaleRevisionFromForeignDecision(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMReviewFixture(t)
	adminHandler := newRVMExecHandler(pool, t.TempDir())
	reviewHandler := newRVMReviewHandler(pool)
	const groupID = int64(21)

	relationID := rvmExecUploadOne(t, adminHandler, "screenshot")
	lead := rvmExecSecondLeadIdentity(t, pool)

	t.Run("stale client-side revision is REVIEW_STALE_REVISION, not REVIEW_ALREADY_DECIDED", func(t *testing.T) {
		// Bump the lifecycle revision via a metadata edit the reviewer's client never saw.
		patchBody := bytes.NewBufferString(`{"caption":"von jemand anderem geändert","source_revision":1}`)
		patchReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), patchBody)
		patchReq.Header.Set("Content-Type", "application/json")
		patchC, patchRec := replaceRVMContext(patchReq,
			gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
			rvmExecPlatformAdminIdentity())
		adminHandler.PatchReleaseVersionMedia(patchC)
		require.Equal(t, http.StatusOK, patchRec.Code, patchRec.Body.String())

		req := rvmReviewDecideRequest(t, groupID, relationID, "confirm", 1 /* stale: current revision is now 2 */)
		c, rec := replaceRVMContext(req, rvmReviewDecideParams(t, relationID, strconv.FormatInt(groupID, 10)), lead)
		reviewHandler.Decide(c)

		require.Equal(t, http.StatusConflict, rec.Code, rec.Body.String())
		require.Equal(t, "REVIEW_STALE_REVISION", rvmReviewDecisionErrorCode(t, rec.Body.Bytes()))
	})

	t.Run("a genuine foreign decision on the exact same revision is REVIEW_ALREADY_DECIDED", func(t *testing.T) {
		// Simulate "someone else's decision for this exact revision landed a moment ago":
		// insert the review_decisions row directly, bypassing the handler entirely, so the
		// lifecycle row itself still reports revision 2 / pending -- only the decision-insert
		// race is real.
		_, err := repository.NewReviewDecisionRepository(pool).InsertDecision(context.Background(), repository.ReviewDecisionInput{
			SourceType: repository.ReleaseVersionMediaReviewSourceType, StableKey: strconv.FormatInt(relationID, 10),
			SourceRevision: 2, ReviewKind: repository.ReviewKindImage, Decision: repository.ReviewDecisionConfirm,
			FansubGroupID: groupID, ReviewerAppUserID: 12, DecidedAt: fixedRVMReviewDecidedAt(),
		})
		require.NoError(t, err)

		req := rvmReviewDecideRequest(t, groupID, relationID, "confirm", 2 /* matches the lifecycle's current revision */)
		c, rec := replaceRVMContext(req, rvmReviewDecideParams(t, relationID, strconv.FormatInt(groupID, 10)), lead)
		reviewHandler.Decide(c)

		require.Equal(t, http.StatusConflict, rec.Code, rec.Body.String())
		require.Equal(t, "REVIEW_ALREADY_DECIDED", rvmReviewDecisionErrorCode(t, rec.Body.Bytes()),
			"a real same-revision decision race must stay distinguishable from a stale-revision client error")
	})
}

// extractReleaseReviewSourceID decodes a queue item's opaque ID back to its source ID string,
// so the "not in the open queue" assertion compares by the actual underlying relation ID
// rather than by the queue's opaque, non-comparable-by-construction string.
func extractReleaseReviewSourceID(t *testing.T, opaqueID string) string {
	t.Helper()
	_, sourceID, err := repository.DecodeReleaseReviewID(opaqueID)
	require.NoError(t, err)
	return strconv.FormatInt(sourceID, 10)
}
