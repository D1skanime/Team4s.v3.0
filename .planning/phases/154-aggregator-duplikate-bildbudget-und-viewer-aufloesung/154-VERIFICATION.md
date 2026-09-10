---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
verified: 2026-09-10T19:15:00Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
---

# Phase 154: Aggregator-Duplikate, Bildbudget und Viewer-Auflösung Verification Report

**Phase Goal:** Der öffentliche Profil-Aggregator lädt jede Tatsache nur noch einmal statt vier
Paare doppelt, ein Profil ohne Projekte lädt kein ungegatetes Hero-Artwork und keine
Multi-Megabyte-Originalbilder bei Optimizer-Fehlern mehr, die Viewer-Auflösung zieht kein zweites
Vollprofil allein für den Edit-Link und reicht das vorhandene Abbruchsignal durch — belegt mit
denselben committeten Messskripten, ohne Beschleunigungsversprechen für die Seitenanzeige und
ohne den weiterhin unreproduzierten Chrome-Absturz als behoben zu erklären.

**Verified:** 2026-09-10T19:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Methodology

This verification re-read every PLAN/SUMMARY pair, then independently re-derived evidence
directly from the codebase rather than trusting SUMMARY.md narration: grepped and read the
actual production diffs for all four workstreams, re-ran the DSN-gated
`TestPhase131PublicProfileQueryBudgetIsConstant` live against `team4s_phase131_test` (PASS, 16
queries for both 2- and 6-project seeds), ran `go build ./...` for the backend live, ran the
targeted frontend Vitest suites live (`MemberBadgeChain.test.tsx`, `ResponsiveImage.test.tsx`,
`MemberProfileHero.test.tsx`, `useMemberViewer.test.ts`, `OwnProfileEditLink.test.tsx` — 152/152
tests passed), ran `tsc --noEmit` live (exit 0), and curled the live backend container to confirm
the new slim viewer endpoint's byte reduction (`/members/d1sk/viewer` → 56 bytes vs.
`/members/d1sk` → 2738 bytes). Commit hashes cited in every SUMMARY were confirmed present via
`git cat-file -e`. Git history between the 154-06 gate commit (`21fd4132`) and the phase-close
commit (`1ebf4496`) was checked and contains no `backend/`/`frontend/` code changes — only docs
commits (154-07's checkpoint recording, the code-review report) — confirming STATE.md/ROADMAP.md's
"7/7 plans complete" marker is not premature.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | P154-01: Four duplicate query pairs (role-volume, contribution-projects, chronicle, archivist) eliminated; facts loaded once request-locally and derived multiple times | ✓ VERIFIED | `member_profile_public_repository.go:129-153` hoists `loadRoleVolumeCounts`/`loadContribProjectsCount`/`loadContribChronicleCount`/`loadContribArchivistCount` exactly once, passing results into `loadRoleVolumeBadges`/`loadContributionBadges`/`loadBadgeProgress`. Live-confirmed: `TestPhase131PublicProfileQueryBudgetIsConstant` PASS, "2 projects -> 16 queries; 6 projects -> 16 queries" (was 20 pre-phase). |
| 2 | P154-02: Functional separation between badges/progress preserved; no monster function, no blind parallelization, no cartesian join, no speculative index migration | ✓ VERIFIED | `loadRoleVolumeBadges`/`loadContributionBadges` remain distinct functions from `loadBadgeProgress`; no SQL/join/index changes anywhere in the diff (confirmed via file read — only Go function-signature changes). No new goroutines/parallelization introduced. |
| 3 | P154-03: Query-budget test on existing counter infra; new target value documented and labeled as regression guard, not performance proof | ✓ VERIFIED | `member_profile_query_budget_test.go:158-177` — comment explicitly labels `phase131ConstantQueryBudget = 16` a "REGRESSION GUARD... not a general performance benchmark." Live-ran and PASS. |
| 4 | P154-04: Delivered DTOs and visibility rules unchanged; public/owner responses content-identical | ✓ VERIFIED | 154-01-SUMMARY documents no `require.Equal`/`require.True` expected-value literal changed in any updated test file (only call-site shapes); code review (154-REVIEW.md) independently traced the refactor end-to-end and found "no behavior regression... dedup preserves badge append order, error semantics." |
| 5 | P154-05: No project-hero artwork at zero projects; locked-gating follows the existing pattern, no third variant | ✓ VERIFIED | `AnimeProjectAchievementStage.tsx:51-65` wraps the hero span in `currentCode ? (...) : <LockedStageArtwork hero />`, byte-identical structure to the three sibling components. `MemberBadgeChain.test.tsx` extended with a `family: 'progress'` zero-count fixture; 94/94 tests pass live. |
| 6 | P154-06: Original fallback bounded via existing media structures; no retry loop, no geometry jump; no blanket PNG-crash attribution | ✓ VERIFIED | `ResponsiveImage.tsx:31-50` — `unoptimized` is now always `false`; the unconditional unoptimized-original escape hatch is fully removed (`usingDisplayOriginal` tracked but `void`-marked, not read by render). Live-confirmed via 154-06's independent re-measurement: badge-artwork bytes under `AUDIT_FAIL_BADGES=1` dropped to 0 for both `timer` and `kara`. No crash-fix claim anywhere in the diff or docs. |
| 7 | P154-07: Animated avatars get their own budget; the un-shrunk optimizer pass-through is handled and the choice justified | ✓ VERIFIED | `MemberProfileHero.tsx` extends `isAnimatedAvatar` with a RIFF/ANIM WebP probe (`isAnimatedWebpSource`), folded into the SAME single existing unoptimized-`<Image>` branch GIFs use (grep confirms exactly one branch). Root cause (Next's own optimizer auto-bypass for animated formats) empirically confirmed via direct fetch comparison. Honestly documented as NOT reducing transferred bytes — a justified, non-overclaiming choice. |
| 8 | P154-08: No unnecessary full-profile fetch solely for the edit link; viewer- and full-profile-need are separated or information reused | ✓ VERIFIED | New `GET /members/:slug/viewer` handler (`app_public_profile.go:96`) reuses `resolvePublicMemberAccess` with zero `profileLoader` calls; `OwnProfileEditLink.tsx` now calls `useMemberViewerAccess` instead of `useMemberViewer`. Live-curled: `/members/d1sk/viewer` = 56 bytes vs. `/members/d1sk` = 2738 bytes (98% reduction for this consumer). `OwnHiddenProfilePreview.tsx` unchanged, still uses the full-profile `useMemberViewer`. |
| 9 | P154-09: `getMemberProfile` accepts an optional `AbortSignal` and forwards it to `apiClientFetch`; `useMemberViewer` forwards the hook signal | ✓ VERIFIED | `api.ts:3179-3202` — `getMemberProfile(slug, signal?)` forwards `signal` into `apiClientFetch`'s options. `useMemberViewer.ts:84-87` — fetcher is `(signal: AbortSignal) => getMemberProfile(slug as string, signal)`, matching `useCancellableSlugState`'s `fetcher: (signal: AbortSignal) => Promise<T>` contract. |
| 10 | P154-10: PMFE-10 fail-closed invariant and fetcher memoization unchanged; auth-refresh, no private data leak, no false login display | ✓ VERIFIED | `deriveViewerStatus<T>` is the single shared guard implementation used by both `useMemberViewer` and `useMemberViewerAccess` (grep confirms no duplicate guard). Live-ran `useMemberViewer.test.ts` (14 tests) and `OwnProfileEditLink.test.tsx` (6 tests) — all pass. `api.auth-refresh.test.ts` (25 cases) reported green in 154-04-SUMMARY, unmodified in intent. |
| 11 | P154-11: RCA-07 re-measured after the graph shrink and documented; no attribution without evidence | ✓ VERIFIED | `154-D-MEASUREMENTS.md` D1 section: leading empty-commit count dropped from 1,664 (timer)/257 (kara) to 0 in two independent runs, cold+warm cache states; explicitly refuses to attribute a specific framework-function cause ("Diese Erklärung wird hier nicht als bewiesen behauptet"). |
| 12 | P154-12: Phase-153 listener remainder investigated; open documentation, negative outcome also acceptable | ✓ VERIFIED | `154-D-MEASUREMENTS.md` D2 section: 14.24/cycle vs. 153-AFTER.md's 14.3/cycle baseline (within noise); `addEventListener` grep across all 8 phase-154-touched frontend files returns 0 matches; explicit "no second source found" negative-outcome conclusion documented with the same rigor as a positive finding would require. |
| 13 | P154-13: Before/after measurement as a new audit document; full suites, backend tests in the Go container, and `docker compose build` PASS | ✓ VERIFIED | `154-AFTER.md` records all gate results (frontend suite 295/296 files green, typecheck clean, lint 344/13/331 matching the 153 baseline, backend build/vet clean, `TestPhase131...` PASS not skipped, `docker compose build` exit 0). This verification independently re-ran the DSN-gated query-budget test and targeted frontend suites live — both confirmed PASS. `REPORT.md`/`153-AFTER.md` confirmed byte-unmodified via `git diff --stat` (no output). |
| 14 | P154-14: RCA-04 stated as open; phase-foreign legacy defects named and scoped, the Phase-153 discrepancy clarified or re-documented as open | ✓ VERIFIED | `154-AFTER.md` contains the explicit standalone sentence "RCA-04 ... bleibt offen und unreproduziert; kein Dokument dieser Phase erklärt ihn als behoben." All three named phase-foreign defects (searchParams/Promise mismatch, `formatEditLoadError` export, 13 ESLint errors) are individually re-verified this session with explicit reproduction status (2 remain an open measurement discrepancy matching 153-AFTER.md, 1 is reproduced-and-confirmed pre-existing with a Phase-153 citation). |
| 15 | P154-15: Owner view of a hidden profile confirmed live by a logged-in owner (open item from Phase 153) | ✓ VERIFIED | `154-07-SUMMARY.md` documents a genuine human confirmation (not agent-inferred): the operator temporarily toggled `d1sk` to `private`, confirmed anonymous denial (404, "Profil nicht verfügbar") and owner-visible content while logged in, then reverted (rollback independently verified). The SUMMARY explicitly and precisely states what was NOT confirmed (the "Profil bearbeiten" edit-link's visibility specifically) rather than rounding up to a blanket approval — matching the required scope precision. |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `backend/internal/repository/member_profile_public_repository.go` | Hoists the four raw-count loaders once | ✓ VERIFIED | Lines 126-154; `git log` shows commit `f1f2d293` |
| `backend/internal/repository/member_profile_query_budget_test.go` | `phase131ConstantQueryBudget = 16`, regression-guard label | ✓ VERIFIED | Line 177; live-ran PASS |
| `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` | `currentCode`-gated hero, `LockedStageArtwork hero` | ✓ VERIFIED | Lines 51/64 |
| `frontend/src/components/ui/ResponsiveImage.tsx` | Bounded fallback, no unconditional original-bytes escape | ✓ VERIFIED | `unoptimized={false}` always; `usingDisplayOriginal` retained but not read by render |
| `frontend/src/components/profile/MemberProfileHero.tsx` | Single animated-avatar code path covering GIF + animated WebP | ✓ VERIFIED | `isAnimatedAvatar` derived from `isGifAvatarURL` (sync) + `isAnimatedWebpSource` (async probe), one render branch |
| `backend/internal/handlers/app_public_profile.go` | `GetPublicMemberViewer` handler, no profile load | ✓ VERIFIED | Line 96; route registered in `main.go:363` |
| `frontend/src/lib/useMemberViewer.ts` | Shared `deriveViewerStatus`, `useMemberViewerAccess` export | ✓ VERIFIED | Lines 49-63 (shared guard), 108 (`useMemberViewerAccess`) |
| `frontend/src/lib/api.ts` | `getMemberProfile(slug, signal?)`, `getMemberViewerAccess(slug, signal?)` | ✓ VERIFIED | Lines 3179, 3212 |
| `docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md` | D1/D2 re-measurement results | ✓ VERIFIED | Exists, contains concrete before/after numbers and explicit decisions for both |
| `docs/audits/2026-09-09-public-member-performance/154-AFTER.md` | Before/after audit, RCA-04 open, phase-foreign defects, no speed-up claim | ✓ VERIFIED | Exists, all six required sections present |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `member_profile_public_repository.go` | `loadRoleVolumeBadges`/`loadContributionBadges`/`loadBadgeProgress` | pre-loaded count parameters | ✓ WIRED | `volumeBadges := r.loadRoleVolumeBadges(roleVolumeCounts)` etc., confirmed by grep and live test run |
| `AnimeProjectAchievementStage.tsx` | `achievementStageHelpers.tsx` | `LockedStageArtwork hero` on `currentCode == null` | ✓ WIRED | Line 64; import unchanged (single import line) |
| `OwnProfileEditLink.tsx` | backend `GET /api/v1/members/:slug/viewer` | `useMemberViewerAccess -> getMemberViewerAccess -> apiClientFetch` | ✓ WIRED | Live-curled 56-byte response; component grep confirms hook usage |
| `useCancellableSlugState.ts` | `frontend/src/lib/api.ts` | `fetcher(signal)` forwarded into `apiClientFetch`'s `options.signal` | ✓ WIRED | `useMemberViewer.ts:84-87`'s fetcher signature matches the hook's `(signal: AbortSignal) => Promise<T>` contract exactly |

### Behavioral Spot-Checks (independently re-run by this verification)

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Query-budget regression guard | `go test ./internal/repository/... -run TestPhase131PublicProfileQueryBudgetIsConstant` (live DSN) | "2 projects -> 16 queries; 6 projects -> 16 queries" | ✓ PASS |
| Backend builds clean | `go build ./...` (golang:1.25-alpine, live) | exit 0 | ✓ PASS |
| Frontend targeted suites | `npx vitest run` on 5 phase-154-touched test files | 152/152 tests, 5/5 files passed | ✓ PASS |
| Frontend typecheck | `npx tsc --noEmit` (live, `team4sv30-frontend`) | exit 0 | ✓ PASS |
| Slim viewer endpoint byte reduction | `curl .../members/d1sk/viewer` vs `curl .../members/d1sk` | 56 bytes vs 2738 bytes | ✓ PASS |
| No debt markers introduced | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across all 12 phase-154-modified production files | 0 matches | ✓ PASS |
| No code drift between 154-06 gate and phase close | `git log --stat 21fd4132..HEAD -- backend frontend` | 0 files changed (docs-only commits) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| P154-01 | 154-01 | Duplicate query pairs eliminated | ✓ SATISFIED | Code + live test |
| P154-02 | 154-01 | Functional separation preserved | ✓ SATISFIED | Code review confirmed |
| P154-03 | 154-01 | Query-budget regression test | ✓ SATISFIED | Live-ran PASS |
| P154-04 | 154-01 | DTOs/visibility unchanged | ✓ SATISFIED | No literal value changes, review confirms |
| P154-05 | 154-02 | Locked-hero gate | ✓ SATISFIED | Code + live test |
| P154-06 | 154-03 | Bounded original fallback | ✓ SATISFIED | Code + independently re-measured bytes |
| P154-07 | 154-03 | Animated-avatar budget, justified | ✓ SATISFIED | Code + honest limitation documented |
| P154-08 | 154-04 | No unneeded full-profile fetch | ✓ SATISFIED | Code + live curl |
| P154-09 | 154-04 | AbortSignal threading | ✓ SATISFIED | Code confirmed |
| P154-10 | 154-04 | PMFE-10 invariant, one shared impl | ✓ SATISFIED | Code + live tests |
| P154-11 | 154-05 | RCA-07 re-measured | ✓ SATISFIED | 154-D-MEASUREMENTS.md |
| P154-12 | 154-05 | Listener-remainder investigated | ✓ SATISFIED | 154-D-MEASUREMENTS.md |
| P154-13 | 154-06 | Full verification gate + audit doc | ✓ SATISFIED | 154-AFTER.md + independent re-run |
| P154-14 | 154-06 | RCA-04 open, legacy defects scoped | ✓ SATISFIED | 154-AFTER.md explicit sections |
| P154-15 | 154-07 | Live owner-view human confirmation | ✓ SATISFIED | 154-07-SUMMARY.md, genuine human confirmation with precise scope |

**Note — pre-existing REQUIREMENTS.md tracking gap (not a Phase 154 regression):** `.planning/REQUIREMENTS.md` has no `P154-*` (nor `P153-*`) section at all (`grep -c "P154" REQUIREMENTS.md` → 0). This is the identical, already-documented cross-phase tracking-artifact gap flagged by 154-04-SUMMARY.md and previously observed for Phase 153. All 15 requirements are independently verified complete against the actual codebase in this report; the gap is in the traceability document, not in the implementation.

### Anti-Patterns Found

None. Grepped all 12 production files touched by Plans 154-01 through 154-04 for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches. No empty implementations, no hardcoded-empty stub data flowing to render paths found in the reviewed diffs.

The independent code review (`154-REVIEW.md`, 28 files reviewed) found 0 critical issues, 2 warnings, 2 info notes — all explicitly advisory/quality observations, not correctness regressions, and not required to be fixed within this phase per the review's own conclusion and the phase's scope:
- **WR-01:** `MemberProfileHero.tsx`'s animated-WebP probe doesn't verify HTTP 206 before reading the body, so if `/media/**`'s Range-header handling ever changes it could silently re-download full avatar files for every static WebP. (Already partially cross-referenced by `deferred-items.md`'s Range-header finding.)
- **WR-02:** `parseBoundedProjectPageValue`'s `limit` clamp substitutes a fallback rather than clamping to the minimum — pre-existing, adjacent to but not introduced by this phase.
- **IN-01:** The 0-project query count (15) in `154-AFTER.md` is an arithmetic derivation, not a measured value — the document is transparent about this itself.
- **IN-02:** `AnimeProjectAchievementStage.tsx` computes `descriptor`/`presentation` unconditionally even in the locked branch — harmless dead work, flagged as a maintenance trap.

None of these block the phase goal; all are documented, scoped, and left for a future pass per the review's own disposition.

### Deferred Items (documented, not gaps)

Three items are logged in `deferred-items.md`, each explicitly out of scope for this phase and not required for goal achievement:
1. `frontend/src/app/media/[...path]/route.ts` ignores HTTP `Range` headers (surfaced by 154-03, pre-existing infrastructure).
2. A permanent `private`-visibility test fixture does not exist in the live dataset (surfaced by 154-07's live checkpoint).
3. (Already resolved within-phase) `api.no-token-boundary.test.ts`'s allow-list gap — this one WAS fixed in 154-06, not left deferred.

### Human Verification Required

None outstanding. The one human-verification item this phase required (P154-15, the live owner-view checkpoint) was already completed by a real human operator in Plan 154-07, with a precisely-scoped confirmation recorded verbatim in `154-07-SUMMARY.md` (what was tested vs. explicitly not separately confirmed — the edit-link's visual visibility). This is genuine human sign-off, not agent inference, and satisfies the phase's Escalation-Gate requirement for this item.

### Gaps Summary

No gaps found. All 15 phase-local requirements (P154-01 through P154-15) are independently verified against the actual codebase — not merely against SUMMARY.md claims. Live re-execution of the DSN-gated query-budget test, targeted frontend test suites, `tsc --noEmit`, `go build`, and a live curl against the running backend all confirm the SUMMARY narratives. Git history confirms no code drift occurred between the 154-06 verification-gate commit and phase close, so STATE.md/ROADMAP.md's "7/7 plans complete" marker is well-founded, not premature. RCA-04 is explicitly and consistently documented as open/unreproduced everywhere it is mentioned. No document in this phase claims a perceptible page-load speed-up. The phase-local REQUIREMENTS.md tracking gap (no `P154-*` section) is a pre-existing cross-phase artifact gap matching the identical pattern already observed for Phase 153 — not a regression introduced by this phase.

---

_Verified: 2026-09-10T19:15:00Z_
_Verifier: Claude (gsd-verifier)_
