---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 15
subsystem: testing
tags: [go-test, vitest, tsc, openapi, docker-build, regression-gate, d-13]

requires:
  - phase: 176-01..176-14 + 5 extra scope additions
    provides: all fixes/refactors/cleanups the phase-wide regression comparison measures
provides:
  - a fresh, numbers-backed before/after full-suite comparison (backend go build/vet/test, frontend tsc/vitest, openapi.yaml duplicate-key scan) proving the phase's baseline error list got strictly shorter, not just "not worse"
  - a clean, from-scratch, no-cache production build proof for both frontend and backend images
  - the consolidated live-UAT checklist (4 D-IDs + 5 extra-scope items) presented as the phase's final blocking checkpoint
affects: []

tech-stack:
  added: []
  patterns: ["temporary git worktree + docker cp into a container path chosen so existing relative-path test fixtures (../../../database/migrations, path.resolve(process.cwd(),'src')) resolve correctly, for a true apples-to-apples before/after suite run without touching the live dev containers"]

key-files:
  created:
    - .planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-15-SUMMARY.md
  modified: []

key-decisions:
  - "Placed the temporary baseline backend copy at container path /app-baseline (not /tmp/app-baseline) so migration-fixture relative paths (../../../database/migrations) resolve to the same mounted /database/migrations the live /app copy uses -- the first attempt at /tmp/app-baseline produced 67 false-positive 'missing migration file' failures that were purely a path artifact, not real baseline failures."
  - "Measured a real baseline frontend vitest run (symlinking /app-baseline/node_modules -> /app/node_modules, package.json/lock unchanged between baseline and HEAD) rather than trusting only the plan's documented 'confirmed live during planning' numbers -- this surfaced one additional pre-existing failure (cssCustomProperties.guard.test.ts, a stale line-number cross-reference) beyond the 6 named in D-05, which is also fixed by HEAD. Documented as a more-complete baseline, not a discrepancy."
  - "Verified the true production backend/Dockerfile (multi-stage, no override) builds clean from scratch in addition to the dev-stack 'docker compose build --no-cache' (which merges docker-compose.override.yml and uses Dockerfile.dev for the backend) -- both exit 0."
  - "Post-checkpoint-approval, investigated the Nutzer's named skip-delta concern (672 -> 701) via go test -json action-count parsing (reproduces the plan's own numbers exactly) plus a skip-name set-diff against the baseline worktree: all 30 new skip names (net +29, 1 restructured into 2 subtests) trace to this phase's own 176-02/04/07/09/12 DSN-gated integration tests, and all 30 pass green against freshly created disposable team4s_phase<N>_test_<ts> databases (dropped after use) -- 0 unexplained skips."

requirements-completed: []

duration: 45min + ~55min skip-delta investigation (Task 2 resume)
completed: 2026-10-08
---

# Phase 176 Plan 15: Final before/after regression gate and live-UAT checkpoint Summary

**Fresh before/after suite comparison (baseline commit `4e9d891e` vs HEAD `87af9f9b`) proves every tracked metric improved or stayed clean -- 0 newly-broken tests, 4 backend + 7 frontend pre-existing failures fixed, 1 openapi.yaml duplicate key removed, 6 pre-existing ReleaseDetailHero tsc errors resolved, plus a clean no-cache production build for both images; final live-UAT checkpoint approved 2026-10-08 (all 10 points + 5 extra-scope items) and the user's 672->701 skip-delta follow-up fully traced to this phase's own new DSN-gated tests, all verified green against disposable fixture databases.**

## Performance

- **Duration:** ~45 min (Task 1) + ~55 min (Task 2 resume: skip-delta investigation + close-out)
- **Started:** 2026-10-08T11:20:00Z (approx.)
- **Completed:** 2026-10-08 (Task 1 ~11:52 UTC; checkpoint approved + skip-delta investigation + close-out same day)
- **Tasks:** 2 of 2 (Task 1 complete; checkpoint approved; skip-delta investigation requested by the Nutzer's approval message completed before close-out)
- **Files modified:** 0 production files (verification-only task); this SUMMARY.md is the sole artifact

## Accomplishments

- Confirmed via a temporary, read-only `git worktree` checkout of the pre-phase baseline commit (`4e9d891e`) that the backend test-failure count dropped from 73 to 69 (4 tests fixed: `TestClaimBlockDeniedAuditOutcomeColocated`, `TestClaimBlockWritesDeniedAudit`, `TestClaimSubmitBlockedForMemorialProfile`, `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`), with **zero newly-broken tests** -- all 69 remaining failures are the same pre-existing, environment-dependent set (missing `TEAM4S_PHASE128_TEST_DSN`, live Keycloak/external-host connectivity refused, missing `docs/audits/2026-09-15-jellyfin12` fixture files, the pre-existing `release_version_media.reorder` capability-registry gap).
- Confirmed frontend `tsc --noEmit` dropped from 6 errors (`ReleaseDetailHero.test.tsx`, D-05) to 0 source errors; separately confirmed the one pre-existing, out-of-scope generated-artifact error (`.next/dev/types/app/admin/anime/create/page.ts`) is still present and unchanged after regenerating it by visiting the route once -- not silently fixed, not newly introduced.
- Confirmed frontend `npx vitest run` dropped from `5 failed | 359 passed | 1 skipped` test files / `7 failed | 3249 passed | 3 todo` tests to `364 passed | 1 skipped` files / `3257 passed | 3 todo` tests -- **0 failures**. The measured baseline (7 failed tests across 5 files) is one file larger than the plan's documented "6 known-red" baseline; the extra file (`cssCustomProperties.guard.test.ts`) is also fully fixed in HEAD, so this is a more complete, not worse, before/after story.
- Confirmed `shared/contracts/openapi.yaml`'s duplicate-key count dropped from 1 (`description` at line 2205, duplicate of line 2167) to 0.
- Ran `docker compose build --no-cache` for both `team4sv30-backend` and `team4sv30-frontend` (the actual local dev-stack config, with `docker-compose.override.yml` auto-merged) -- both exit 0. Additionally built the standalone production `backend/Dockerfile` (multi-stage, no dev override) from scratch -- exit 0.
- Removed the temporary baseline git worktree and both containers' temporary `/app-baseline` copies after use; confirmed via `git worktree list` (only the main `main` worktree remains) and `docker exec ... ls /app-baseline` (removed).

## Task Commits

**Task 1: Full before/after regression comparison and clean production build** -- no production file changes (plan frontmatter `files_modified: []`; this is a verification-only task). Results are recorded entirely in this SUMMARY.md, committed via the plan's final metadata commit (see below) rather than a separate task commit.

**Plan metadata:** committed together with STATE.md/ROADMAP.md updates immediately after this file (see final commit in the completion report).

## Before/After Comparison Table

| Metric | Before (`4e9d891e`) | After (HEAD `87af9f9b`) | Verdict |
|---|---|---|---|
| `go build ./...` (backend) | clean, exit 0 | clean, exit 0 | unchanged (good) |
| `go vet ./...` (backend) | clean, exit 0 | clean, exit 0 | unchanged (good) |
| `go test ./...` tests (backend) | 2496 pass / 672 skip / **73 fail** (3241 total) | 2505 pass / 701 skip / **69 fail** (3275 total) | **improved** (-4 fail, 0 newly broken) |
| `go test ./...` packages (backend) | 14 ok / 4 FAIL | 14 ok / 4 FAIL | unchanged (same 4 packages hold only pre-existing env-dependent failures) |
| `tsc --noEmit` source errors (frontend) | 6 (`ReleaseDetailHero.test.tsx`, D-05) | 0 | **improved** |
| `tsc --noEmit` generated out-of-scope error | n/a (artifact not generated in throwaway checkout) | 1 (`admin/anime/create/page.ts`) -- confirmed present, unchanged | unchanged (expected, out-of-scope) |
| `npx vitest run` test files (frontend) | 5 failed / 359 passed / 1 skipped (365) | **0 failed**, 364 passed / 1 skipped (365) | **improved** |
| `npx vitest run` tests (frontend) | 7 failed / 3249 passed / 3 todo (3259) | **0 failed**, 3257 passed / 3 todo (3260) | **improved** |
| `openapi.yaml` duplicate-key count | 1 (`description` line 2205 dup of 2167) | 0 | **improved** |
| `docker compose build --no-cache` (backend, dev-stack) | n/a | exit 0 | pass |
| `docker compose build --no-cache` (frontend) | n/a | exit 0 | pass |
| `docker build -f backend/Dockerfile --no-cache` (true production) | n/a | exit 0 | pass |

### Backend: fixed tests (baseline-fail -> HEAD-pass)

- `TestClaimBlockDeniedAuditOutcomeColocated`
- `TestClaimBlockWritesDeniedAudit`
- `TestClaimSubmitBlockedForMemorialProfile`
- `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`

### Backend: newly broken

None. Zero tests regressed from pass-at-baseline to fail-at-HEAD.

### Backend: still failing (both baseline and HEAD -- pre-existing, environment-dependent, out of this phase's scope)

69 tests across `internal/handlers` (5: missing `docs/audits/2026-09-15-jellyfin12` fixtures), `internal/migrations` (6: `TEAM4S_PHASE128_TEST_DSN`/live-fixture-proof tests), and `internal/repository`/`internal/services` (58: `TEAM4S_PHASE128_TEST_DSN` missing, live Keycloak/external-host connectivity refused at `192.168.235.196:18093`, invalid Keycloak credentials for the `sheppert`/`csubs-leader` fixture accounts, and the pre-existing `release_version_media.reorder` capability-registry gap already logged under 176-12/176-13/Scope Addition 1's `deferred-items.md` entries). Every one of these matches a `deferred-items.md` entry already logged by an earlier 176 plan or scope addition -- confirmed by cross-referencing the full list, not re-discovered here.

### Frontend: fixed tests (baseline-fail -> HEAD-pass)

- `ReleaseVersionNotesTab.test.tsx` (1 case)
- `PublicReleaseSurfacesShowcase.test.tsx` (1 case)
- `EpisodeImportEpisodeGroup.test.tsx` (2 cases, GAP-13)
- `fansubprojekt/.../mitwirkende/[memberSlug]/page.test.tsx` (1 case, "Vollständiges Memberprofil" text)
- `cssCustomProperties.guard.test.ts` (2 cases -- a stale line-number cross-reference in `KNOWN_NON_CSS_TEXTUAL_MENTIONS` pointed at line 282 in the baseline tree while the actual textual mention in `roleCatalog.accessibility.test.ts` was at line 275 both then and now; the allow-list entry was corrected to the right line number somewhere during the phase, which is why this passes cleanly today)

All five are exactly the pre-existing failures already named in `deferred-items.md`'s 176-02 entry (items 1-4) plus the css-guard item, confirming the measured baseline is consistent with what earlier plans independently observed -- not an artifact of this plan's comparison methodology.

### Frontend: newly broken

None.

## Methodology Notes (temporary baseline checkout)

- Created `git worktree add --detach /tmp/team4s-176-baseline 4e9d891e`, per the plan's `<baseline_commit>`/`<interfaces>` guidance.
- Backend: `docker cp`'d the baseline `backend/` tree into the running `team4sv30-backend` container at `/app-baseline` (not `/tmp/app-baseline` -- the first attempt at the latter broke 67 migration-fixture tests with false "file not found" errors because their `../../../database/migrations`-relative paths resolved one directory level wrong; moving the copy to `/app-baseline`, a sibling of the real `/app`, fixed this). Ran `go build ./... && go vet ./... && go test ./... -json` from that directory using the container's existing Go toolchain/module cache, then deleted `/app-baseline`.
- Frontend: `docker cp`'d the baseline `frontend/` tree into the running `team4sv30-frontend` container at `/app-baseline`, symlinked `node_modules` to the live `/app/node_modules` (safe because `frontend/package.json`/`package-lock.json` are byte-identical between baseline and HEAD, confirmed via `git diff 4e9d891e HEAD -- frontend/package.json frontend/package-lock.json` producing no output), and ran `npx tsc --noEmit` / `npx vitest run` from that directory. Deleted `/app-baseline` afterward.
- `openapi.yaml` duplicate-key scan used a small PyYAML loader override that records every duplicate mapping key (not just the last-wins value) -- run once against the worktree's `shared/contracts/openapi.yaml` (baseline) and once against the live HEAD copy.
- The temporary worktree was removed with `git worktree remove /tmp/team4s-176-baseline --force` immediately after all baseline runs completed; confirmed gone via `git worktree list`. No Docker Compose or dev server was ever pointed at the temporary checkout -- only `go build`/`go vet`/`go test` and `npx tsc`/`npx vitest` ran against it, reusing the already-running containers' toolchains as the plan's `<baseline_commit>` instructions suggested.
- The live `team4sv30-backend`/`team4sv30-frontend` containers were never restarted or disrupted by this comparison; both responded `200` on `/health` and `/` immediately after.

## Skip-Delta Investigation (Backend 672 -> 701, +29) -- Nutzer-Hinweis 2026-10-08

The checkpoint-approval message that closed this plan's Task 2 included one explicit, binding
follow-up before the phase could be finalized (quoted verbatim): *"Backend-Skips stiegen von 672
auf 701 -- bitte aufschlüsseln, welche neuen Tests übersprungen werden und ob sie mit verfügbarer
Test-DB ... tatsächlich laufen und grün sind; Ergebnis im Abschlussbericht nennen."* This section is
that breakdown, backed by fresh test runs (not theory).

**Methodology:** Re-ran `go test ./... -json` against the baseline worktree (`4e9d891e`, already
re-used from Task 1's cleanup-before-removal window) and against HEAD inside `team4sv30-backend`,
and parsed the JSON event stream (`Action: "pass"/"fail"/"skip"` per `Test`) rather than counting
`--- SKIP:` lines from `-v` text output, because the plan's own documented numbers (2496/672/73 and
2505/701/69) only reproduce exactly from the JSON action-count method -- confirmed byte-for-byte:
baseline `{pass: 2496, skip: 672, fail: 73}` (3241 total), HEAD `{pass: 2505, skip: 701, fail: 69}`
(3275 total), matching this plan's own before/after table exactly.

**Set-difference result:** Comparing the sorted set of skipped `package::test[/subtest]` names
between baseline and HEAD: **30 skip names are new at HEAD, 1 skip name present at baseline is gone
at HEAD** (net +29, matching 701-672 exactly). The "gone" one is not a fixed test -- it is
`TestReleaseVersionMedia_ReorderRequiresVersionOwnership`, whose single skip at baseline was
restructured into two named subtests at HEAD (`cross-version_relation_id_is_rejected`,
`same-version_reorder_succeeds`) by 176-12's behavior-test rewrite, a pure Go-test-structure change
with no coverage lost.

**Category breakdown of the 30 new skips (all gated on `t.Skipf` when a `TEAM4S_PHASE*_TEST_DSN` env
var is unset -- the project's standard opt-in Postgres-fixture pattern, see
`backend/internal/testsupport/phase106_postgres.go`):**

| Gate env var | New-skip count | Introduced by (git blame of the test file) | What it tests |
|---|---|---|---|
| `TEAM4S_PHASE117_TEST_DSN` | 20 | `af55927d` test(176-12), `5f8966b4` fix(176-02) | Outro-slot independence from ED (D-01 regression coverage), release-crew-snapshot project-lead-scope-only exclusion (176-04/D-23), segment-playback-resolution and theme-asset-upload-lock real-behavior tests (176-12/D-09 source-grep replacement) |
| `TEAM4S_PHASE107_TEST_DSN` | 5 | `fefda9e6`/`af55927d` test(176-12) | `TestPatchReleaseVersionMediaNonUploaderRevisionConflictProtection`, the 2 reorder-ownership subtests, `TestRVMPreviewAssignmentIsExclusive`, and `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` (this last one is **not new coverage** -- it is one of this plan's own documented "4 fixed tests": at baseline it FAILED on the `release_version_media.reorder` capability-registry gap; 176-09's capability-registry fix lets it now reach the env-gated skip cleanly instead of crashing, i.e. a fail-to-skip conversion that is itself part of the already-reported improvement, not a new gap) |
| `TEAM4S_PHASE167_TEST_DSN` | 4 | `abbbefc5` feat(176) | `phase176_fansub_create_kuerzel_test.go`'s 4 cases for the new Kürzel-conflict-detection logic added by 176-07 (D-03/D-04 Fansub-Anlegeseite) |
| `TEAM4S_PHASE145_TEST_DSN` | 1 | `7c75b80a` fix(176) | `TestRoleCodeIsAssignableForContext`, covering the assignable-roles-only picker fix (176's role-picker D-06-adjacent hardening) |

**Every one of the 30 new skips traces to a test file this phase's own plans (176-02, 176-04,
176-07, 176-09, 176-12) added or rewrote -- none are pre-existing tests that silently started
skipping, and none reference a phase this plan's scope does not already touch.**

**Live verification against disposable test databases (not just theory):** For each of the four
env vars above, created a throwaway Postgres database on `team4sv30-db` following the exact naming
convention the fixtures themselves enforce (`team4s_phase<N>_test_<suffix>`, matching e.g.
`phase117DatabasePattern` in `phase117_postgres.go`) -- `team4s_phase107_test_1791461607`,
`_phase117_test_1791461607`, `_phase145_test_1791461607`, `_phase167_test_1791461607` -- pointed the
matching `TEAM4S_PHASE*_TEST_DSN` at each, and re-ran `go test ./... -json` with all four set
simultaneously inside `team4sv30-backend`.

- **26 of 30** passed immediately.
- **4 of 30** (`TestFansubGroupCreateKuerzel_SetsFreshKuerzel/EmptyKuerzelBecomesNull/
  ConflictsWithExistingKuerzel/ConflictsWithExistingAlias`) failed on the first attempt with
  `ERROR: text search dictionary "public.unaccent" does not exist` -- this was a gap in the fresh
  disposable database I created (a plain `CREATE DATABASE` has no extensions), not a defect in the
  176-07 code or test: `phase167_postgres.go`'s `createPhase167Prerequisites` installs an
  `f_unaccent` wrapper that calls `public.unaccent`, which requires the `unaccent` extension to
  already exist in that database (the project's long-lived disposable Phase-167 fixture DBs already
  have it from an earlier manual setup; a brand-new one does not). Ran
  `CREATE EXTENSION IF NOT EXISTS unaccent;` against the fresh database and re-ran just those 4
  tests -- **all 4 then passed** (`PASS ok team4s.v3/backend/internal/repository 0.164s`).

**Result: all 30 of the 30 new skips run and pass green when given their required disposable test
database -- 0 failures, 0 remaining unexplained skips in the +29 delta.** None of the +29 delta is
"genuinely environment-gated" in the sense of needing live Keycloak/Jellyfin/external fixtures that
cannot be reproduced locally -- every one is a self-contained Postgres-fixture test that this
developer environment can and did satisfy on demand. (The 28 other, non-DSN-gated skips already
present at both baseline and HEAD -- Wave-3 stub placeholders like
`TestVerifyClaimAlreadyVerified`/`TestMemberClaimsRepositoryRejectClaim`, and `test_helpers.go`'s
generic "Integration tests require test database setup" group-repository tests -- are unchanged
pre-existing debt, not part of this phase's +29 delta, and out of this investigation's scope.)

**Cleanup:** all four disposable databases dropped immediately after the verification run
(`DROP DATABASE team4s_phase<N>_test_1791461607` x4, confirmed absent via `\l` against
`team4sv30-db` afterward); the `/app-baseline` container copy and the `/tmp/team4s-176-baseline` git
worktree (re-used for this investigation's baseline-vs-HEAD skip-set diff) were both re-removed
(confirmed via `git worktree list` showing only the `main` worktree, and
`docker exec team4sv30-backend ls /app-baseline` returning "No such file or directory"); the live
`team4sv30-backend`/`team4sv30-frontend`/`team4sv30-db` containers were never restarted and answered
200 on `/health`/`/` throughout.

## Decisions Made

- Used `/app-baseline` (sibling of `/app`, not `/tmp/app-baseline`) inside each container as the copy target so pre-existing test-internal relative paths resolve correctly without modifying any test file -- see Methodology Notes above.
- Trusted a freshly-measured baseline over the plan's pre-recorded "confirmed live during planning" numbers where they diverged (the extra `cssCustomProperties.guard.test.ts` failure), since D-13 explicitly requires "fresh, numbers-backed before/after test runs (not reuse of individual plans' self-reported results)" per this plan's own threat-model mitigation (T-176-15-01).
- Verified both the dev-stack build (`docker compose build --no-cache`, which uses `Dockerfile.dev` for the backend via the override) and the standalone true-production `backend/Dockerfile` build, since "a clean production build" is ambiguous between the two and both are now proven to succeed.

## Deviations from Plan

None - plan executed exactly as written for Task 1. No Rule 1-4 auto-fixes were needed: this task is pure verification/measurement and found no bugs, missing functionality, blocking issues, or architectural gaps in the 176 phase's own deliverables. The one path-resolution issue encountered (`/tmp/app-baseline` vs `/app-baseline`) was a measurement-methodology artifact in my own temporary tooling, not a defect in the codebase, and was corrected before any numbers were recorded.

## Issues Encountered

- First baseline backend test run (copy at `/tmp/app-baseline`) produced 67 spurious failures due to a relative-path mismatch in migration-fixture tests (`../../../database/migrations` resolving to the non-existent `/tmp/database/migrations` instead of the mounted `/database/migrations`). Resolved by moving the copy to `/app-baseline` (same directory depth as the real `/app`) and re-running; confirmed via a known failing test's exact error message before and after the fix.
- The frontend baseline run surfaced one additional real pre-existing failure (`cssCustomProperties.guard.test.ts`, 2 cases) beyond the 6 named in the plan's documented D-05 baseline. Investigated and confirmed genuine (not a methodology artifact): the baseline source file's `KNOWN_NON_CSS_TEXTUAL_MENTIONS` allow-list pointed at the wrong line number (282 instead of the actual 275) for a known non-CSS textual mention of `--surface-muted`, causing a false "dead reference" at baseline; the HEAD copy has the corrected line number and passes cleanly. This is also present in `deferred-items.md`'s 176-02 entry, confirming it was independently observed by an earlier plan.

## User Setup Required

None - no external service configuration required.

## Final Checkpoint Approval

**Approved 2026-10-08** by the Nutzer, verbatim: *"approved — finale Live-UAT Phase 176 bestanden
(Nutzer 2026-10-08): alle 10 Punkte inkl. der 5 Zusatzpunkte geprüft (Rollen-Picker ohne
Administration/Sonstiges, Kürzel-Feld + Aliase auf Anlegeseite inkl. Konfliktmeldung, kein
Typ-Feld, Land/Status/Link-Typen deutsch, eine Alias-Fläche, Release-Karten ohne Überlappung).
Bitte 176-15 und die Phase regulär abschließen (Code-Review, Verifikation, Tracking)."* -- all 10
how-to-verify points of this plan's checkpoint (segment-editor badges D-01, fansub-create-page
fields D-04, sticky-save-bar D-07, notes-tab-gate D-18, general smoke pass) plus the 5 extra-scope
live-UAT items (role picker without Administration/Sonstiges, Kürzel field + aliases with conflict
messaging, no dead type field, German country/status/link-type labels, release-card overlap fix)
were confirmed working together on the live running instance. The user's accompanying
skip-delta question (672 -> 701) is answered in full above, before this plan is closed, per their
explicit instruction ("bitte aufschlüsseln ... Ergebnis im Abschlussbericht nennen").

## Next Phase Readiness

- Task 1's automated, numbers-backed gate is green: every tracked metric improved or stayed unchanged (never worse) outside the one explicitly-flagged pre-existing out-of-scope item.
- The final checkpoint (consolidated live-UAT sign-off) is approved (see above) -- all 15/15 plans of Phase 176 are now executed.
- The Nutzer's skip-delta follow-up (672 -> 701) is fully investigated and documented above: all +29 are traced to this phase's own new DSN-gated integration tests and proven to pass green against disposable fixture databases.
- Phase-level verification/closure (code review, independent re-verification, requirements/tracking reconciliation) remains a later orchestrator step, not performed by this plan.

## Self-Check: PASSED

- `.planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-15-SUMMARY.md` -- FOUND (this file).
- Temporary baseline worktree -- confirmed removed via `git worktree list` (only `/home/d1sk/team4s [main]` remains).
- Temporary container copies (`/app-baseline` in both `team4sv30-backend` and `team4sv30-frontend`) -- confirmed removed via `docker exec ... ls /app-baseline` style checks during cleanup (directories no longer present).
- `docker images | grep team4s` -- confirmed no stray verification image left behind (`team4s-backend-prod-verify` was built then `docker rmi`'d; only the phase's normal `team4s-team4sv30-backend`/`team4s-team4sv30-frontend` images and one unrelated pre-existing `team4s-backend-test` image remain).
- Live containers (`team4sv30-backend`, `team4sv30-frontend`) -- confirmed still running their pre-existing images, untouched by the `--no-cache` builds (`docker compose build` does not restart running containers); both answered `200` on `/health` and `/` after all verification work completed.
- Skip-delta investigation (Task 2 resume): the 4 disposable databases (`team4s_phase107/117/145/167_test_1791461607`) -- confirmed dropped via `psql \l | grep phase` against `team4sv30-db` (only pre-existing, unrelated persistent phase-fixture databases from earlier plans remain). The re-used `/tmp/team4s-176-baseline` worktree and `/app-baseline` container copy -- confirmed removed again via `git worktree list` and `docker exec team4sv30-backend ls /app-baseline` ("No such file or directory"). `team4sv30-backend`/`team4sv30-frontend`/`team4sv30-db` -- confirmed `200`/healthy after the investigation's test runs.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*
