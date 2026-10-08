---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
fixed_at: 2026-10-08T21:34:06Z
review_path: .planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 8
skipped: 1
status: partial
---

# Phase 176: Code Review Fix Report

**Fixed at:** 2026-10-08T21:34:06Z
**Source review:** .planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (fix_scope "all" — 6 warnings + 3 info, per explicit user instruction)
- Fixed: 8
- Skipped: 1 (IN-03 — confirmed NOT dead code; kept intentionally, see below)

Each fix below is its own atomic commit on `main` (no worktree was used for this run —
see note at the end of this report for why). Isolated git worktrees for this fixer run
were not created; see "Process note" at the bottom for the reasoning.

## Fixed Issues

### WR-02: Non-uploader metadata edit silently skipped the revision guard when `source_revision` was omitted

**Files modified:** `backend/internal/handlers/admin_content_release_version_media_patch.go`,
`backend/internal/handlers/admin_content_release_version_media_test.go`,
`frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx`,
`frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx`,
`shared/contracts/openapi.yaml`
**Commit:** `2b0e3957`
**Applied fix:** `CheckMediaRevisionConflict` treated a missing `source_revision` as an
opt-out no-op. Added an explicit check in the handler's non-uploader branch: if
`expectedRevision == nil`, reject with `400 SOURCE_REVISION_REQUIRED` (German message with
correct umlauts) instead of silently skipping the optimistic-concurrency check. Audited
every frontend caller of `patchReleaseVersionMediaItem`:
- `useReleaseVersionMedia.ts`'s `patchItem` already conditionally attaches
  `source_revision` when the in-memory item has one — left unchanged (it was correctly
  sending it already).
- `ReleaseVersionMediaReviewSection.tsx`'s `handleSave` (the Leitungs-/Review-Fläche) never
  sent `source_revision` at all — fixed to include it from the item when known.
Added a new real-Postgres subtest
(`TestPatchReleaseVersionMediaNonUploaderRevisionConflictProtection/missing_source_revision_from_a_non-uploader_is_rejected_and_changes_nothing`)
proving the 400 rejection and that the relation is left untouched, plus a frontend test
proving the fixed caller now forwards `source_revision`. Documented the new 400/409
contract in `openapi.yaml`.
**Live check needed:** YES. This changes real request/response behavior for the
Fansub-Leitung "Medien prüfen" save flow and any other non-uploader media-metadata edit.
Manually exercise: (1) a group leader editing another member's uploaded release-version
media caption/category and saving successfully, (2) the same edit after another edit
raced it (expect a clear 409 toast, not a silent no-op), (3) confirm the "Prüfstatus
aktualisiert." toast still appears for the review section after this change.

### WR-04: Native `<button>` left in a page this phase migrated to `@/components/ui` primitives

**Files modified:** `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`
**Commit:** `2257e2f3`
**Applied fix:** Replaced the raw `<button type="button" className={styles.buttonSecondary}>`
"Auto" slug-regeneration control with `<Button type="button" variant="secondary">`, matching
the rest of the already-migrated section. Ran `page.test.tsx` (7 tests),
`adminFansubCreateHelpers.test.ts` (41 tests), `useAdminFansubCreateActions.test.ts` (11
tests) — all green; `eslint` on the file is clean.
**Live check needed:** YES. Pure visual/interaction swap with no existing test covering the
"Auto" button's click behavior directly — open `/admin/fansubs/create`, confirm the "Auto"
button still visually matches its neighbors and still regenerates the slug on click.

### WR-01: `theme_types.kuerzel` backfill keyed on hardcoded row IDs, not names

**Files modified:** `database/migrations/0181_theme_types_kuerzel_by_name.up.sql`,
`database/migrations/0181_theme_types_kuerzel_by_name.down.sql`
**Commit:** `c5f601aa`
**Applied fix:** Per explicit instruction, migration 0179 was NOT edited (already applied
against the live dev database). Added idempotent follow-up migration 0181 that re-asserts
the same `kuerzel` values keyed on the theme_type's current **name** instead of its id.
Important correction made during implementation: the review's own name-reconstruction
(`'OP'`/`'ED'`/`'Insert'`/`'Outro'`, derived purely from migrations 0044→0048→0050) turned
out to be **stale** — a live `psql` check against this environment's `theme_types` table
showed the real current names are `'OP Kara'`/`'ED Kara'`/`'Insert Kara'`/`'Outro'`
(migration `0058_rename_theme_types_kara.up.sql`, which the original review trace missed,
renamed them after 0050). The migration was written against the verified live names, not
the names implied by the finding text. Applied via `go run ./cmd/migrate up` inside the
running backend container and verified via live `psql`:
`id=4 → 'OP Kara' → 'OP'`, `id=6 → 'ED Kara' → 'ED'`, `id=8 → 'Insert Kara' → 'IN'`,
`id=9 → 'Outro' → 'OUT'`. Also verified in an isolated transaction that the name-keyed
`UPDATE` actually matches and sets the row (not a silent no-op from a name mismatch).
**Live check needed:** NO — fully verified via live `psql` and backend rebuild/health check;
automated migration re-run (`up`/`down`/`up`) confirmed idempotent.

### WR-03: `FansubRepository.DeleteMember` was dead code after route removal

**Files modified:** `backend/internal/repository/fansub_repository_members.go`
**Commit:** `d8ef6692`
**Applied fix:** Grepped the entire backend tree (production AND test files) for
`DeleteMember` — the only match was the method's own definition, confirming zero remaining
callers. Removed the method. `go build ./...` and `go vet ./...` clean; ran
`go test ./internal/repository/... -run 'TestFansub'` (all green).
**Live check needed:** NO — pure dead-code removal, no behavior change, confirmed by build.

### WR-05: Flaky/order-dependent permission-cache mutation in `authz_permissions_test.go`

**Files modified:** `backend/internal/permissions/cache_test_support.go` (new),
`backend/internal/repository/authz_permissions_test.go`,
`backend/internal/repository/testmain_test.go`
**Commit:** `c0948aa0`
**Applied fix:** Added `permissions.SnapshotLoadedCacheForTests`/`RestoreLoadedCacheForTests`
(test-only, package-exported since `loadedCache` is private) and wired them into
`TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase` via `t.Cleanup`, so its
narrower `LoadCache` stub is undone after the test instead of leaking into whatever test
runs next.
**Important finding from actually running the tests (not just reading the diff):** naively
restoring the cache to its pre-test state (`nil`, since nothing had loaded it yet) would
have **broken** `TestEvaluateMemberMutationConflictBlocksLastActiveManager`, which turned
out to depend on exactly the leak this fix removes (confirmed via a real before/after
`go test` run with `TEAM4S_PHASE107_TEST_DSN` set: that test passed at baseline via the
leak, and failed immediately after a naive snapshot/restore). Root-caused and fixed
properly: `testmain_test.go`'s existing `TestMain` now also calls `LoadCache` with the same
comprehensive stub (`authzRepositoryReviewCapabilityCacheLoaderStub`, already built to
satisfy `LoadCache`'s D-10 completeness check) once, before any test runs, giving the whole
binary a deterministic baseline regardless of execution order or whether the DSN is set.
Verified via diffed `go test ./internal/repository/...` output with and without
`TEAM4S_PHASE107_TEST_DSN` set, both before and after the fix: the previously
order-dependent test now passes deterministically in both modes, and no other test's
pass/fail status changed (only pre-existing, unrelated, differently-DSN-gated failures
remain, matching the documented baseline from 176-01/176-12-SUMMARY.md).
**Live check needed:** NO — backend-test-only change, fully covered by the before/after
`go test` diff described above.

### WR-06: `member_group_stories` down migration recreates the table but nothing can write to it

**Files modified:** `database/migrations/0178_drop_member_group_stories.down.sql`
**Commit:** `3dfec857`
**Applied fix:** Evaluated and made the call explicitly rather than skipping silently:
accepted the "down migrations are for emergency schema rollback of their own paired up
migration, not for restoring deleted application code" tradeoff as intentional and
defensible, but added a comment to the `.down.sql` header documenting exactly that — this
file alone is not a functional rollback; reverting commits `a272acdc`/`e7481732` (or
re-implementing equivalent code) is also required to make the feature usable again.
**Live check needed:** NO — comment-only change to a migration file; SQL body unchanged
(verified via diff), no re-apply needed.

### IN-01: Outro CSS badge class still named `badgePv`

**Files modified:**
`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`,
`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`
**Commit:** `d3eb5ade`
**Applied fix:** Renamed `.badgePv` to `.badgeOut` in the CSS module and its one reference in
`getTypeBadgeClass`. Grepped for any other usage — none found. Ran
`SegmenteTab.assignment-conflicts.test.tsx` (19 tests) and `SegmenteTab.test.tsx` (101
tests) — all green.
**Live check needed:** LOW PRIORITY / optional — purely a CSS class rename with identical
computed styles (same color/background), fully covered by the 120 passing tests above. A
quick visual confirmation that the Outro badge in the segment editor still renders its grey
color is a nice-to-have, not a requirement.

### IN-02: Remaining source-grep assertion in `fansub_notes_repository_test.go`

**Files modified:** `backend/internal/repository/fansub_notes_repository_test.go`
**Commit:** `6c19307a`
**Applied fix:** Replaced the `os.ReadFile` + `strings.Contains` assertion (which only
proved the literal SQL text `"AND fansub_group_id = $2"` exists somewhere in the source)
with a real-Postgres-fixture test, mirroring 176-12's conversion pattern for
`admin_content_fansub_notes_test.go`/`admin_content_theme_asset_locks_test.go` in this same
phase. The new test calls `UpdateFansubGroupNote`/`DeleteFansubGroupNote` against a real
database with a note that genuinely belongs to a *different* fansub group than the one
passed in, proving the parent-scoping actually rejects the cross-group call (`ErrNotFound`,
row provably untouched via a follow-up `SELECT`) before proving the correctly-scoped call
succeeds and persists. All 4 subtests pass with `TEAM4S_PHASE107_TEST_DSN` set; skips
cleanly (not fail) without it, matching the established convention.
**Live check needed:** NO — backend-test-only change, fully covered by the 4 passing
subtests against a real database.

## Skipped Issues

### IN-03: `RoleCodeExistsForContext` claimed unused — NOT actually dead code

**File:** `backend/internal/repository/hist_group_member_roles_repository.go:320-328`
**Reason:** Per explicit instruction, grepped ALL callers (including tests) before
deleting anything. The finding itself already hedged ("I did not exhaustively grep the
entire handlers/repository packages outside the files listed for this review, so this may
have callers elsewhere"). The grep confirms it: `RoleCodeExistsForContext` is called by
`HistGroupMemberRolesRepository.IsHistoricalMemberRoleCode` (same file, line 283), which is
itself called by `FansubHistGroupMemberRolesHandler.CreateHistGroupMemberRole`
(`backend/internal/handlers/fansub_hist_group_member_roles_handler.go:321`) — a live
production handler, not a test-only reference. Deleting it would have broken that handler.
Left unchanged; no code change, no commit. This is exactly the "document why it is
intentionally kept as a narrower existence-only check" alternative the finding's own Fix
section offered.
**Original issue:** IN-03 claimed `RoleCodeExistsForContext` had no remaining production
caller after this phase switched three OTHER call sites to
`RoleCodeIsAssignableForContext`, but explicitly noted the grep was not exhaustive.

---

## Process notes

**No isolated git worktree was used for this run.** My default operating instructions
mandate creating a `/tmp` git worktree for every review-fix run. However, this
repository's `CLAUDE.md` explicitly states (and marks as overriding default agent
behavior) that GSD workflows on this repo run directly on `main` with no sibling
worktrees, because an earlier worktree convention caused real breakage (empty
`frontend/node_modules` cross-links, stale builds, tests silently not running). On top of
that, this task's own user-mandated process rules require rebuilding/restarting the live
`team4sv30-backend`/`team4sv30-frontend` Docker containers to verify each fix — those
containers bind-mount `/home/d1sk/team4s` specifically, so an ephemeral `/tmp` worktree
would have been unreachable by them, making the mandated "rebuild and confirm healthy"
verification impossible. Given CLAUDE.md's explicit override and the task's own
verification requirements, all 8 fixes were made directly in `/home/d1sk/team4s` on
`main`, one commit per finding, exactly as the user's process rules specify.

**Files deliberately not touched:** `.planning/sketches/MANIFEST.md` (pre-existing
uncommitted change) and `.planning/sketches/010-galerie-detailansicht/` (pre-existing
untracked directory) — both present in `git status` before this run started and explicitly
out of scope per instruction. No commit in this report touches either path.

**Container state at end of run:** `team4sv30-backend` and `team4sv30-frontend` were
rebuilt/restarted multiple times across the fixes above and are both healthy
(`/health` returns `{"status":"ok"}`; frontend root returns HTTP 200) as of the final
commit.

---

_Fixed: 2026-10-08T21:34:06Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
