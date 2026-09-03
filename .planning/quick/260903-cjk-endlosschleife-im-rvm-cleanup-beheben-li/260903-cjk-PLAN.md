---
phase: quick-260903-cjk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/release_version_media_cleanup.go
  - backend/internal/repository/release_version_media_cleanup_test.go
autonomous: true
requirements: []

must_haves:
  truths:
    - "HardDeleteRVMAndAsset deletes the release_version_media_review_lifecycle row for a relation before deleting the release_version_media row itself, inside the same transaction"
    - "A real-Postgres test proves HardDeleteRVMAndAsset succeeds and leaves zero rows in both release_version_media and release_version_media_review_lifecycle when a lifecycle row exists for the relation being deleted, and that same test fails with the live FK error before the fix is applied"
    - "The release_version_notes hard-delete branch is confirmed to have no equivalent hard-delete code path today (only a logical UPDATE-based scrub inside ScrubRejectedBefore), so no notes-side code change is made — this finding is explicit in the SUMMARY, not invented"
    - "After rebuilding and restarting team4sv30-backend, a real periodic cleanup tick is observed to run, the previously-failing 'rvm cleanup: hard delete relation 10' error line no longer appears in logs since the restart, and relation 10 is confirmed gone from both release_version_media and release_version_media_review_lifecycle by directly measured SELECT count(*) queries"
    - "release_version_id 48 relation 11 (review_state=pending, actively under live human review) is never mutated, restarted around destructively, or otherwise disturbed by any command run in this plan — only read-only SELECT queries touch it, solely to prove it is unchanged"
  artifacts:
    - path: "backend/internal/repository/release_version_media_cleanup.go"
      provides: "HardDeleteRVMAndAsset with the added lifecycle-row DELETE inside its existing transaction, before the release_version_media DELETE"
    - path: "backend/internal/repository/release_version_media_cleanup_test.go"
      provides: "TestHardDeleteRVMAndAssetRemovesLifecycleRow — a real-Postgres test that fails without the fix and passes with it"
  key_links:
    - from: "HardDeleteRVMAndAsset tx"
      to: "release_version_media_review_lifecycle"
      via: "DELETE FROM release_version_media_review_lifecycle WHERE release_version_media_id = $1, executed before DELETE FROM release_version_media"
      pattern: "DELETE FROM release_version_media_review_lifecycle"
---

<objective>
Fix the live, repeatedly-failing (83+ times since 2026-09-02 18:55) RVM cleanup hard-delete bug: `HardDeleteRVMAndAsset` in `backend/internal/repository/release_version_media_cleanup.go` deletes `media_files`, `release_version_media`, and `media_assets` in one transaction but never deletes the matching `release_version_media_review_lifecycle` row — a table added later by migration 0135 with an `ON DELETE RESTRICT` FK back to `release_version_media`. Every tick since then has failed identically on relation 10 / asset 29 (SQLSTATE 23503), and the service never remembers the failure, so it retries forever every 10 minutes.

Purpose: Stop the infinite failing retry loop, prove the fix with a real-Postgres test that is RED before the change and GREEN after, confirm (not assume) the sibling `release_version_notes` branch has no equivalent hard-delete path needing the same fix, then deploy and OBSERVE a real cleanup tick succeed against the live dev database — without touching relation 11 (release_version_id 48), which the user is actively reviewing live in the browser right now.

Output: One committed code+test fix, plus a SUMMARY.md documenting the measured live-tick proof (log absence + SELECT count(*) results), not an assertion that it "should work".
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<!-- All backend Go tooling in this repo has a known stale-source problem when run via
`docker compose exec team4sv30-backend` (documented repeatedly in Phase 144's SUMMARYs):
the running container does not live-reflect on-disk edits. Every `go build`/`go vet`/`go test`
verification command in this plan MUST instead run via a throwaway container that bind-mounts
the live repo directly:

docker run --rm --network team4s_default \
  -v /home/d1sk/team4s:/workspace \
  -v team4s-phase143-go-mod:/go/pkg/mod \
  -v team4s-phase143-go-build:/root/.cache/go-build \
  -w /workspace/backend \
  -e TEAM4S_PHASE107_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase107_test_run143?sslmode=disable' \
  golang:1.25-alpine go test ./internal/repository/... -run <TestName> -v -count=1

`team4s_phase107_test_run143` already exists (confirmed via `\l` against team4sv30-db) and was
already reused this way in Phase 144 (144-03-SUMMARY.md / 144-04-SUMMARY.md). Reuse it — do not
provision a new database. Each test gets its own isolated schema via testsupport's per-test
CREATE SCHEMA/search_path mechanism, so reuse is safe. Do NOT set generic DATABASE_URL/
TEST_DATABASE_URL — this area's tests only read TEAM4S_PHASE107_TEST_DSN, and the database name
must match ^team4s_phase107_test_[a-z0-9]+$.

The live backend service (team4sv30-backend) is built from backend/Dockerfile via `build:` in
docker-compose.yml (not a bind-mounted dev container) — `docker compose up -d --build
team4sv30-backend` is the correct, and only necessary, way to ship this fix to the running
periodic cleanup job. -->
</context>

<interfaces>
<!-- Ground truth already established during planning. Do not re-derive — verify nothing drifted, then proceed. -->

**Confirmed live failure** (docker compose logs team4sv30-backend, ticks every 10 min at :X5:41 / :X5:41 minute marks):
```
2026/09/03 08:45:41 rvm cleanup: hard delete relation 10 asset 29: hard delete release_version_media 10: ERROR: update or delete on table "release_version_media" violates foreign key constraint "release_version_media_review_life_release_version_media_id_fkey" on table "release_version_media_review_lifecycle" (SQLSTATE 23503)
```

**Confirmed live data** (team4s_v2, read-only queries run during planning):
```
release_version_media:            id=10, release_version_id=48, media_asset_id=29, deleted_at IS NOT NULL (soft-deleted)
release_version_media:            id=11, release_version_id=48, media_asset_id=31, deleted_at IS NULL
release_version_media_review_lifecycle: id=10, release_version_media_id=10, review_state='tombstoned', source_revision=2
release_version_media_review_lifecycle: id=11, release_version_media_id=11, review_state='pending',    source_revision=4 (LIVE, do not touch)
```
Relation 11's `source_revision` will keep advancing as the user reviews it live — never assert an exact value for it, only that it still exists and is unmutated by anything this plan does.

**Current buggy code** (`backend/internal/repository/release_version_media_cleanup.go`, lines 251-278):
```go
func (r *MediaRepository) HardDeleteRVMAndAsset(
	ctx context.Context,
	relationID int64,
	mediaAssetID int64,
) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin hard delete rvm tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM media_files WHERE media_id = $1`, mediaAssetID,
	); err != nil {
		return fmt.Errorf("hard delete media_files for asset %d: %w", mediaAssetID, err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM release_version_media WHERE id = $1`, relationID,
	); err != nil {
		return fmt.Errorf("hard delete release_version_media %d: %w", relationID, err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM media_assets WHERE id = $1`, mediaAssetID,
	); err != nil {
		return fmt.Errorf("hard delete media_assets %d: %w", mediaAssetID, err)
	}
	return tx.Commit(ctx)
}
```

**Migration 0135** (`database/migrations/0135_release_review_lifecycle.up.sql`) created the FK causing the failure:
```sql
CREATE TABLE release_version_media_review_lifecycle (
    ...
    release_version_media_id BIGINT NOT NULL UNIQUE
        REFERENCES release_version_media(id) ON DELETE RESTRICT,
    ...
);
```
No triggers exist on this table (already confirmed). `review_decisions`/`review_audit_events` address rows via `source_type`/`source_key`, not a FK to this table — deleting the lifecycle row loses no review history.

**Confirmed: no equivalent notes hard-delete path exists.** `release_version_note_review_lifecycle` (also created by 0135) carries the identical `ON DELETE RESTRICT` FK to `release_version_notes(id)`, but repo-wide grep for `DELETE FROM release_version_notes` and for any `HardDelete*Note*` function found nothing. The only code that transitions rejected notes toward removal is `scrubExpiredReleaseReviewNotes` in `backend/internal/repository/release_review_cleanup_repository.go` (lines 74-134), and it only ever `UPDATE`s the note row (title/body cleared, `status='deleted'`) and `UPDATE`s the lifecycle row's `review_state` to `'tombstoned'` — it never issues a `DELETE`, so it can never hit the RESTRICT FK. **No notes-side code change is needed or should be made.** State this finding explicitly in the SUMMARY.

**Reusable test fixture** (`backend/internal/repository/release_version_media_replace_repository_test.go`, same `repository` package — no import needed, just call directly):
```go
func openReleaseVersionMediaReplaceFixture(t *testing.T) *pgxpool.Pool
```
Applies migrations 0134+0135, creates `release_version_media`/`media_assets`/`media_files`/`release_version_notes` tables, and inserts relation **601** (release_version_id=41, media_asset_id=**701**, category='screenshot') and a spare relation 602 (media_asset 703). Also provides:
```go
func submitMedia(t *testing.T, pool *pgxpool.Pool, sourceID, appUserID int64, expectedRevision *int64, at time.Time) *ReleaseReviewLifecycle
```
which inserts a `release_version_media_review_lifecycle` row for `sourceID` via `ReleaseReviewLifecycleRepository.SubmitMedia` (review_state starts `'pending'`).

**Existing companion test file to extend** (`backend/internal/repository/release_version_media_cleanup_test.go`, currently 91 lines, imports only `testing`, `time`, `assert` — no real-Postgres test yet):
```go
package repository

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix HardDeleteRVMAndAsset with a real-Postgres RED/GREEN test, and confirm the notes branch needs no change</name>
  <files>backend/internal/repository/release_version_media_cleanup.go, backend/internal/repository/release_version_media_cleanup_test.go</files>
  <behavior>
    - Test: `TestHardDeleteRVMAndAssetRemovesLifecycleRow` opens `openReleaseVersionMediaReplaceFixture(t)`, submits relation 601 for review via `submitMedia(t, pool, 601, 11, nil, time.Now().UTC().Add(-time.Hour))` (creates a `release_version_media_review_lifecycle` row for relation 601), then calls `NewMediaRepository(pool, "").HardDeleteRVMAndAsset(ctx, 601, 701)`.
    - RED (before the fix): the call returns a non-nil error containing `violates foreign key constraint` and `release_version_media_review_life_release_version_media_id_fkey` (SQLSTATE 23503) — mirrors the exact live production failure.
    - GREEN (after the fix): the call returns `nil`. `SELECT COUNT(*) FROM release_version_media WHERE id = 601` -> 0. `SELECT COUNT(*) FROM release_version_media_review_lifecycle WHERE release_version_media_id = 601` -> 0.
  </behavior>
  <action>
    RED first: in `backend/internal/repository/release_version_media_cleanup_test.go`, add the imports `"context"` and `"github.com/stretchr/testify/require"` alongside the existing `"testing"`, `"time"`, `"github.com/stretchr/testify/assert"`. Add `TestHardDeleteRVMAndAssetRemovesLifecycleRow` exactly per the `<behavior>` block above, using `openReleaseVersionMediaReplaceFixture` and `submitMedia` from the sibling `release_version_media_replace_repository_test.go` in the same package (no import needed — same package, already resolves). Run this test now, against the current unfixed `HardDeleteRVMAndAsset`, and confirm it fails with the FK violation text — this is the RED proof; capture the failure output.

    GREEN: in `backend/internal/repository/release_version_media_cleanup.go`, inside `HardDeleteRVMAndAsset`'s existing transaction, insert one new `tx.Exec` call between the existing `DELETE FROM media_files` block and the existing `DELETE FROM release_version_media` block: `DELETE FROM release_version_media_review_lifecycle WHERE release_version_media_id = $1` using `relationID`, wrapped in the same error-handling shape as the surrounding deletes (`fmt.Errorf("hard delete release_version_media_review_lifecycle for relation %d: %w", relationID, err)` on failure). This must run before the `release_version_media` delete, in the same transaction, so both `defer tx.Rollback(ctx)` and the final `tx.Commit(ctx)` still cover it. Do not reorder or touch the `media_files`/`media_assets` deletes. Re-run the test and confirm it now passes — this is the GREEN proof.

    Notes-branch check (already investigated during planning — this step is confirming, not exploring from scratch): re-run `grep -rn "DELETE FROM release_version_notes" backend/internal` and `grep -rln "HardDelete" backend/internal --include=*.go` to reconfirm no equivalent hard-delete function exists for `release_version_notes`. The only note-removal code path is `scrubExpiredReleaseReviewNotes` (`backend/internal/repository/release_review_cleanup_repository.go`), which only issues `UPDATE`s, never a `DELETE` — it cannot hit the RESTRICT FK. Record this confirmation explicitly in the SUMMARY; make no code change on the notes side.

    Commit both files together once RED->GREEN is proven: `fix(rvm-cleanup): delete review_lifecycle row before hard-deleting release_version_media` (or equivalent conventional message).
  </action>
  <verify>
    <automated>docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -v team4s-phase143-go-mod:/go/pkg/mod -v team4s-phase143-go-build:/root/.cache/go-build -w /workspace/backend -e TEAM4S_PHASE107_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase107_test_run143?sslmode=disable' golang:1.25-alpine go test ./internal/repository/... -run TestHardDeleteRVMAndAssetRemovesLifecycleRow -v -count=1</automated>
  </verify>
  <done>The verify command's output shows `--- PASS: TestHardDeleteRVMAndAssetRemovesLifecycleRow` and ends `ok`. The RED run (captured before the fix) showed `--- FAIL` with the SQLSTATE 23503 FK-violation text. `go build ./...` (same docker-run pattern, no `-run`/DSN needed) succeeds with no output. `go vet ./internal/repository/...` is clean. Exactly one commit exists containing both changed files. SUMMARY explicitly states the notes-branch finding (no hard-delete path exists; only a logical UPDATE-based scrub) rather than silently omitting it.</done>
</task>

<task type="auto">
  <name>Task 2: Ship the fix and measure a real live cleanup tick succeed, without touching relation 11</name>
  <files></files>
  <action>
    Before doing anything else, capture a read-only baseline for the DO-NOT-TOUCH row: `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT id, release_version_id, review_state FROM release_version_media_review_lifecycle WHERE release_version_media_id = 11;"` — record this baseline; it must still match after every later step in this task. Do not run any query in this task that could write to `release_version_media`, `release_version_media_review_lifecycle`, or any related table for id 11 — read-only SELECTs only, and never touch relation 11 at all (not even read-only queries beyond this baseline and the final re-check).

    Record the current UTC time as START (`date -u +%Y-%m-%dT%H:%M:%S`). Deploy the fix: `docker compose up -d --build team4sv30-backend`. Confirm the container comes back up: `docker compose ps team4sv30-backend` shows status `Up`.

    Wait for a real periodic cleanup tick to fire (the ticker interval is a hardcoded 10 minutes — `RVMCleanupInterval`/`ReleaseReviewCleanupInterval` in `backend/internal/services/`; there is no immediate run at startup, only after a full interval elapses). Poll rather than blind-sleep: repeatedly check `docker compose logs team4sv30-backend --since "$START" 2>&1 | grep -c "rvm cleanup:"` every ~30 seconds until it reports at least 1, for up to 12 minutes total (a real 10-minute tick plus safety margin). Run this polling loop in the background and wait for it to signal completion rather than blocking a single foreground command past the 10-minute tool timeout.

    Once a tick has fired, measure (do not assume) the outcome:
    1. `docker compose logs team4sv30-backend --since "$START" 2>&1 | grep -c "hard delete relation 10"` — report the exact count (must be 0; the old FK-violation log line must not reappear).
    2. `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT count(*) FROM release_version_media WHERE id = 10;"` — report the exact returned count (must be 0).
    3. `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT count(*) FROM release_version_media_review_lifecycle WHERE id = 10;"` — report the exact returned count (must be 0).
    4. Cross-check with the actual FK column (belt-and-suspenders, since the lifecycle table's own `id` and `release_version_media_id` only coincide for row 10 today): `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT count(*) FROM release_version_media_review_lifecycle WHERE release_version_media_id = 10;"` — report the exact returned count (must be 0).
    5. Re-run the exact same relation-11 baseline query from the start of this task and confirm it returns an identical row (id=11 still present, still `release_version_id=48`) — only the `review_state`/`source_revision` may legitimately differ if the live human reviewer acted on it in the meantime; the row itself must never have been touched by this plan's own commands.

    Do not restart, rebuild, or otherwise touch any container other than `team4sv30-backend`. Do not run any write query against the live database at any point in this task.
  </action>
  <verify>
    <automated>docker compose logs team4sv30-backend --since "$START" 2>&1 | grep -c "hard delete relation 10"</automated>
  </verify>
  <done>All five measured results from the action section are reported verbatim in the SUMMARY (not paraphrased as "should be fixed"): the grep count for a reappeared "hard delete relation 10" error is 0; `SELECT count(*) FROM release_version_media WHERE id = 10` returns 0; both lifecycle-table count queries (by `id` and by `release_version_media_id`) return 0; relation 11's row is confirmed present and unmutated by this plan's own actions. A real periodic cleanup tick (not a manually triggered one) was observed to run after the restart, evidenced by at least one new "rvm cleanup:" log line appearing after START.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Backend cleanup goroutine -> Postgres | Trusted internal service, no external input; the transaction boundary itself is the only thing being hardened here. |
| Executor shell -> live dev Postgres (team4s_v2) | This plan's own verification commands are a boundary: they must stay strictly read-only against real, currently-in-review data (relation 11 / release_version_id 48). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260903cjk-01 | Tampering | HardDeleteRVMAndAsset transaction | mitigate | New DELETE targets only `release_version_media_id = $1` (the exact relation being hard-deleted), stays inside the existing transaction with its existing rollback-on-error/commit-on-success shape — no broadening of the delete's blast radius. |
| T-quick260903cjk-02 | Repudiation | release_version_media_review_lifecycle history | accept | Deleting the lifecycle row loses no audit trail: `review_decisions`/`review_audit_events` key off `source_type`/`source_key`, not a FK to this table (already confirmed in RESEARCH-equivalent investigation above). |
| T-quick260903cjk-03 | Tampering | Task 2's live psql/docker commands against team4s_v2 | mitigate | Every Task 2 database command is a `SELECT`; the plan explicitly forbids any write and requires a before/after baseline check on relation 11 to prove it was never touched. |
| T-quick260903cjk-04 | Denial of Service | team4sv30-backend restart | accept | A single `docker compose up -d --build` restart of one container is the minimum necessary action to ship a fix to a background goroutine; no other service is restarted, and the fix itself removes an actively-recurring failure loop that is worse for reliability than one restart. |

No package installs in this plan (no Package Legitimacy Gate applicable).
</threat_model>

<verification>
1. `go test ./internal/repository/... -run TestHardDeleteRVMAndAssetRemovesLifecycleRow -v -count=1` (via the documented docker-run pattern) — PASS.
2. `go build ./...` and `go vet ./internal/repository/...` (same pattern) — clean.
3. `git log --oneline -1` — shows the Task 1 fix+test commit.
4. `docker compose logs team4sv30-backend --since "$START"` after the deploy+wait — contains at least one `rvm cleanup:` line and zero `hard delete relation 10` error lines.
5. `SELECT count(*) FROM release_version_media WHERE id = 10;` and both lifecycle-table count variants for id 10 — all return 0, measured directly against the live team4s_v2 database.
6. Relation 11 (release_version_id 48) — confirmed present and unmutated by comparing the Task 2 before/after baseline queries.
</verification>

<success_criteria>
- `HardDeleteRVMAndAsset` deletes the `release_version_media_review_lifecycle` row before deleting `release_version_media`, inside the same transaction, and a real-Postgres test locks this behavior (proven RED before the fix, GREEN after).
- The `release_version_notes` branch is confirmed, not assumed, to need no equivalent change, with the reasoning stated in the SUMMARY.
- After redeploying `team4sv30-backend`, a real (not manually forced) periodic cleanup tick is observed to run cleanly: the specific "hard delete relation 10" FK error no longer appears in logs, and relation 10 is measured gone from both `release_version_media` and `release_version_media_review_lifecycle` via direct SELECT count(*) queries reported in the SUMMARY.
- Relation 11 / release_version_id 48 (live human review in progress) is never mutated or otherwise disturbed by any command this plan runs.
</success_criteria>

<output>
Create `.planning/quick/260903-cjk-endlosschleife-im-rvm-cleanup-beheben-li/260903-cjk-SUMMARY.md` when done.
</output>
