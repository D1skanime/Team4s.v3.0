---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 06
subsystem: testing
tags: [audit, verification-gate, vitest, eslint, postgresql, docker]

# Dependency graph
requires:
  - phase: 154-01
    provides: "query-budget consolidation (20 -> 16), TestPhase131PublicProfileQueryBudgetIsConstant"
  - phase: 154-02
    provides: "AnimeProjectAchievementStage locked-hero gate (closes kara's 2.92MB first_contribution transfer)"
  - phase: 154-03
    provides: "ResponsiveImage bounded optimizer-error fallback, animated-avatar single-code-path detection"
  - phase: 154-04
    provides: "slim GET /members/:slug/viewer endpoint, AbortSignal threading"
  - phase: 154-05
    provides: "154-D-MEASUREMENTS.md (D1/D2 re-measurement)"
provides:
  - "docs/audits/2026-09-09-public-member-performance/154-AFTER.md, a new before/after audit document"
  - "Fixed the one genuine full-suite regression 154-03 introduced (api.no-token-boundary.test.ts vs MemberProfileHero.tsx's fetch probe) instead of re-labeling it pre-existing"
  - "Fixed a +2 lint-warning delta 154-03 introduced in ResponsiveImage.test.tsx"
affects: [phase-154-verification, phase-154-closeout]

tech-stack:
  added: []
  patterns:
    - "E4 discipline: before citing any red result as pre-existing, run git log -- <file> and check the plan's own key-files.modified frontmatter list for the introducing commit"

key-files:
  created:
    - docs/audits/2026-09-09-public-member-performance/154-AFTER.md
  modified:
    - frontend/src/lib/api.no-token-boundary.test.ts
    - frontend/src/components/ui/ResponsiveImage.test.tsx

key-decisions:
  - "Resolved the known 154-03-introduced api.no-token-boundary.test.ts regression by allow-listing MemberProfileHero.tsx in the test's publicNoAuthFetchAllowlist (option (b) from deferred-items.md's suggested follow-up), not by routing through apiClientFetch, since apiClientFetch is semantically for authenticated Team4s API calls, not same-origin no-auth media byte-range probes"
  - "Cited the 0-project (kara-pattern) post-fix query count (15) as an arithmetic derivation (19 - 4 unconditionally-removed duplicate loader calls), not a measured value, since no automated guard test exercises a 0-project seed -- avoiding an unmeasured number being presented as measured"
  - "Independently re-ran the AUDIT_FAIL_BADGES=1 byte-budget audit and Playwright shot.mjs live in this session (not just citing 154-03's numbers) to confirm no regression across 154-04/154-05's subsequent landings -- both timer's total transfer (5,210,606 vs 154-03's 5,207,533) and kara's visible-pixel percentage (14.95%, identical to 153-AFTER.md's own kara figure) matched within noise"

requirements-completed: [P154-13, P154-14]

# Metrics
duration: ~25min
completed: 2026-09-10
---

# Phase 154 Plan 06: Full Verification Gate and Before/After Audit Summary

**Ran the phase's complete verification gate (frontend suite/typecheck/lint, backend build/vet, the DSN-gated query-budget test, docker compose build) -- all green after resolving the one genuine 154-03-introduced regression (a test-boundary allow-list gap) instead of mislabeling it pre-existing -- and produced `154-AFTER.md`, a new before/after audit document with live-reconfirmed byte/query numbers cross-referencing Plans 154-01 through 154-05.**

## Performance

- **Duration:** ~25 min (first commit 15:33:29Z, last commit 15:44:27Z, plus prior context-reading/investigation time not separately timed)
- **Completed:** 2026-09-10
- **Tasks:** 2/2
- **Files modified:** 3 (2 test-file fixes + 1 new audit document)

## Accomplishments

- Ran every gate command from `154-06-PLAN.md`'s `<interfaces>` block against the live `team4sv30-*` stack: full frontend `npm test` (295/296 files, 2275/2278 tests), `npm run typecheck` (exit 0), `npm run lint` (344 problems/13 errors/331 warnings, all 13 errors traced to the exact 9-file list `153-AFTER.md` already cited as pre-existing), backend `go build ./... && go vet ./...` (exit 0), the DSN-gated `TestPhase131PublicProfileQueryBudgetIsConstant` (actually ran, not skipped: "2 projects -> 16 queries; 6 projects -> 16 queries"), and `docker compose build` (exit 0, both images built).
- Found and resolved -- rather than mislabeled pre-existing -- the one genuine regression the full suite surfaced: `api.no-token-boundary.test.ts`'s central-fetch-boundary test, broken by 154-03's raw `fetch()` probe in `MemberProfileHero.tsx`. Traced to commit `9e0b4da9` (154-03, this phase) via `git log`, confirmed it is NOT pre-existing, and fixed it by allow-listing the file with a rationale comment matching the existing `MemberAvatarCard.tsx` precedent.
- Found and resolved a second, smaller 154-03-introduced regression during the same gate run: a +2 lint-warning delta (346 vs 153-AFTER.md's cited 344 problems) caused by two intentionally-unused destructured `onError` bindings in `ResponsiveImage.test.tsx` that this repo's eslint config doesn't exempt via underscore-prefix convention. Fixed with two targeted `eslint-disable-next-line` comments; lint now reports exactly 344/13/331, matching `153-AFTER.md`'s baseline.
- Wrote `docs/audits/2026-09-09-public-member-performance/154-AFTER.md` with all six required sections: query-count before/after (with the unmeasured 0-project case explicitly flagged as arithmetic, not measured), badge-artwork and kara zero-project byte budgets (independently re-measured live in this session against the fully-merged codebase, not just cited from 154-03), the animated-avatar w=160 transfer (unchanged bytes, mechanism-only effect, honestly stated), a cross-reference (not restatement) to Plan 154-05's D1/D2 findings, an explicit standalone RCA-04-open sentence, the three named phase-foreign defects reproduced/cited against this session's mandated commands, and an explicit no-speed-up statement.
- Verified `REPORT.md` and `153-AFTER.md` remain byte-unmodified (`git diff --stat` produces no output for either file).

## Task Commits

Each task was committed atomically. Task 1's two regression fixes were committed as their own atomic commits (not folded into Task 2's document commit) since they are independently reviewable production/test fixes, not audit-document content:

1. **Task 1a: Fix the 154-03-introduced test-boundary regression** - `4aedbff4` (fix)
2. **Task 1b: Fix the 154-03-introduced lint-warning delta** - `fdfc77da` (fix)
3. **Task 2: Write 154-AFTER.md, the before/after audit document** - `21fd4132` (docs)

**Plan metadata:** (this commit, made after this SUMMARY)

## Files Created/Modified

- `frontend/src/lib/api.no-token-boundary.test.ts` - added `MemberProfileHero.tsx` to `publicNoAuthFetchAllowlist` with a rationale comment (same-origin, no-auth, byte-range probe)
- `frontend/src/components/ui/ResponsiveImage.test.tsx` - added two `eslint-disable-next-line @typescript-eslint/no-unused-vars` comments for the intentionally-unused `_beforeOnError`/`_afterOnError` destructured bindings
- `docs/audits/2026-09-09-public-member-performance/154-AFTER.md` - new before/after audit document (244 lines)

## Real Before/After Numbers (independently verified this session)

- **Full frontend suite:** 295/296 files passed (1 pre-existing skip), 2275/2278 tests passed (3 todo), 0 failures -- after the boundary-test fix (before the fix: 1 file failed).
- **`npm run lint`:** 344 problems / 13 errors / 331 warnings, exit 1 -- exact match to `153-AFTER.md`'s own baseline, all 13 errors in the identical 9-file list, none touched by any 154-0x plan.
- **Backend `go build`/`go vet`:** both exit 0.
- **`TestPhase131PublicProfileQueryBudgetIsConstant`:** PASS, "2 projects -> 16 queries; 6 projects -> 16 queries" (live, this session, against `team4s_phase131_test`).
- **`docker compose build`:** exit 0, both images built.
- **Badge-artwork bytes under `AUDIT_FAIL_BADGES=1`, `members/timer`:** 0 bytes (live, this session; before-fix baseline was 9,032,573 bytes per 154-03-SUMMARY.md). Total transfer 5,210,606 bytes, within ~3KB of 154-03's own 5,207,533-byte combined measurement -- confirms no regression across 154-04/154-05.
- **`members/kara` zero-project hero:** 0 requests for `first_contribution`/`motif`/`frame` URLs (live, this session; before-fix baseline was 2,922,646 source bytes per REPORT.md). Playwright screenshot shows 14.95% non-background pixels at `scrollY=1300` -- identical to `153-AFTER.md`'s own `kara` figure, confirming no layout regression.
- **Animated-avatar `w=160` transfer, `timer`:** 412,249 bytes, unchanged from REPORT.md's original citation -- confirmed live; mechanism effect is a single unified code path, not a byte reduction (honestly documented, not overclaimed).
- **Viewer endpoint (RCA-08, Plan 154-04):** live-reconfirmed 56 bytes (`/members/d1sk/viewer`) vs 2738 bytes (`/members/d1sk`), 404 neutral-denial parity for a nonexistent slug.

## Decisions Made

- Chose allow-listing over routing `MemberProfileHero.tsx`'s probe through `apiClientFetch`: `apiClientFetch` is the central client for authenticated Team4s API calls (bearer attachment, refresh handling), semantically wrong for a same-origin, no-credential, byte-range probe against a local media route. This matches the existing `MemberAvatarCard.tsx` precedent already in the same allowlist.
- Explicitly labeled the 0-project (kara-pattern) post-154-01 query count (15) as an arithmetic derivation rather than a measured value, since `member_profile_query_budget_test.go` has no 0-project seed case. The plan's own `<interfaces>` block asserted "20/19 -> 16/15" without a corresponding test proving the "15" side -- this discrepancy is disclosed in `154-AFTER.md` rather than silently presented as measured.
- Independently re-ran the byte-budget audit script and Playwright screenshot tool live in this session (rather than only citing 154-03's already-published numbers) specifically to confirm no regression occurred across the subsequent 154-04/154-05 landings before closing the phase's verification gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, caused by 154-03's own diff within this phase, NOT pre-existing] `api.no-token-boundary.test.ts` failing on `MemberProfileHero.tsx`'s raw fetch probe**
- **Found during:** Task 1, running the full unscoped `npm test` gate command.
- **Issue:** 154-03 (commit `9e0b4da9`) added a raw `fetch(url, { headers: { Range: 'bytes=0-63' } })` call in `MemberProfileHero.tsx` for its animated-WebP detection probe, without adding the file to the central-fetch-boundary test's allowlist. Already fully diagnosed and logged in `deferred-items.md` during 154-04's execution.
- **Fix:** Added `src/components/profile/MemberProfileHero.tsx` to `publicNoAuthFetchAllowlist` in `api.no-token-boundary.test.ts`, with a comment explaining the same-origin, no-auth, byte-range probe rationale (matching `deferred-items.md`'s suggested follow-up option (b)).
- **Files modified:** `frontend/src/lib/api.no-token-boundary.test.ts`
- **Verification:** `npx vitest run src/lib/api.no-token-boundary.test.ts` -- 9/9 tests pass. Full `npm test` re-run afterward: 295/296 files pass.
- **Committed in:** `4aedbff4`

**2. [Rule 1 - Bug, caused by 154-03's own diff within this phase, NOT pre-existing] `+2` lint-warning delta in `ResponsiveImage.test.tsx`**
- **Found during:** Task 1, running the full unscoped `npm run lint` gate command; result (346 problems/333 warnings) did not match `153-AFTER.md`'s cited baseline (344/331).
- **Issue:** 154-03's rewrite of `ResponsiveImage.test.tsx` destructures `onError` out of two mock-call snapshots specifically to exclude it from an equality comparison (`_beforeOnError`/`_afterOnError`); this repo's eslint config has no underscore-prefix ignore pattern for `@typescript-eslint/no-unused-vars`, so both surfaced as new warnings.
- **Fix:** Added a targeted `eslint-disable-next-line @typescript-eslint/no-unused-vars` comment above each destructure (no behavior or assertion change).
- **Files modified:** `frontend/src/components/ui/ResponsiveImage.test.tsx`
- **Verification:** `npx vitest run src/components/ui/ResponsiveImage.test.tsx` still 4/4 pass; `npm run lint` afterward reports exactly 344 problems/13 errors/331 warnings, matching `153-AFTER.md`'s baseline exactly.
- **Committed in:** `fdfc77da`

---

**Total deviations:** 2 auto-fixed (both Rule 1, both directly caused by 154-03's own diff within this phase, both confirmed NOT pre-existing via `git log` before being fixed, per the phase context's explicit instruction not to label them pre-existing)
**Impact on plan:** Both fixes were required to satisfy this plan's own Task 1 acceptance criterion ("any red result is either resolved or cites a specific prior commit/phase as evidence of pre-existing status") and to keep the full gate genuinely green rather than silently-degraded. No production behavior changed; both fixes are test-infrastructure-only (an allowlist entry and two lint-suppression comments).

## Issues Encountered

- The plan's `<interfaces>` block states an expected query-count before/after of "20/19 -> 16/15", but no automated guard test in the codebase exercises a 0-project seed to actually measure the "15" side. This is disclosed as an arithmetic derivation in `154-AFTER.md` rather than silently presented as a measured value, consistent with the phase's "no success claim without numbers" discipline.
- The first live `AUDIT_FAIL_BADGES=1` audit run (immediately after a container restart) showed an inflated total-byte figure (9,553,226 bytes for `timer`) due to dev-server fast-refresh double-fetching of versioned JS chunks -- a known measurement artifact REPORT.md's own methodology section already documents ("A/B-Wiederholung 0 enthält teilweise Fast Refresh/Neukompilierung"). A second run after a warm-up curl produced a stable, comparable figure (5,210,606 bytes) matching 154-03's own measurement within noise; the noisy first run was discarded and not cited in `154-AFTER.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The phase's full verification gate is green: frontend suite, typecheck, lint (all red results either resolved with a fix commit or cited to a specific prior phase/commit), backend build/vet, the DSN-gated query-budget test (actually run, not skipped), and `docker compose build`.
- `154-AFTER.md` exists with all six required sections, cross-references (not restates) Plan 154-05's D1/D2 findings, states RCA-04 explicitly open, names all three phase-foreign defects with explicit reproduction status, and makes no page-load speed-up claim.
- `REPORT.md` and `153-AFTER.md` remain byte-unmodified (`git diff --stat` confirmed empty for both).
- Plan 154-07 (per `.planning/phases/154-.../154-07-PLAN.md`, already present on disk) remains for a future wave/session -- this plan's scope was limited to the verification gate and audit document per its own frontmatter (`files_modified: [154-AFTER.md]`), plus the two directly-blocking deviation fixes documented above.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*
